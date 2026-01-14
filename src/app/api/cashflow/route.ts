import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  settings,
  expectedExpenses,
  costCenters,
  budgetItems,
  transactions,
  paymentPlans,
  paymentPlanInstallments,
  expectedIncomes,
} from "@/lib/db/schema";
import { eq, and, gte, lte, isNull, or, asc, sql } from "drizzle-orm";

interface CashflowProjection {
  date: string;
  balance: number;
  income: number;
  expense: number;
  description: string;
}

interface UpcomingExpense {
  id: number;
  date: string;
  description: string;
  amount: number; // centesimi, negativo
  type: "cost" | "pdr" | "tax";
  isEssential: boolean;
  isPaid: boolean;
}

interface UpcomingIncome {
  id: number;
  date: string;
  description: string;
  amount: number; // centesimi, positivo
  clientName: string | null;
  reliability: "high" | "medium" | "low";
  isReceived: boolean;
}

// Calcola il giorno di difficoltà: primo giorno in cui cassa < scadenza
function calculateDifficultyDay(
  currentBalance: number,
  expenses: UpcomingExpense[],
  incomes: UpcomingIncome[],
  horizon: number
): { daysUntil: number | null; date: string | null; balance: number } {
  const today = new Date();
  let runningBalance = currentBalance;
  let difficultyDate: string | null = null;
  let daysUntil: number | null = null;

  // Combina e ordina tutti gli eventi per data
  const events: Array<{
    date: string;
    amount: number;
    type: "income" | "expense";
    reliability?: "high" | "medium" | "low";
  }> = [];

  // Aggiungi solo incassi ad alta affidabilità
  for (const income of incomes) {
    if (income.reliability === "high" && !income.isReceived) {
      events.push({
        date: income.date,
        amount: income.amount,
        type: "income",
        reliability: income.reliability,
      });
    }
  }

  // Aggiungi tutte le spese non pagate
  for (const expense of expenses) {
    if (!expense.isPaid) {
      events.push({
        date: expense.date,
        amount: expense.amount,
        type: "expense",
      });
    }
  }

  // Ordina per data
  events.sort((a, b) => a.date.localeCompare(b.date));

  // Simula il flusso di cassa giorno per giorno
  for (let i = 0; i < horizon; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + i);
    const checkDateStr = checkDate.toISOString().split("T")[0];

    // Somma tutti gli eventi del giorno
    const dayEvents = events.filter((e) => e.date === checkDateStr);

    for (const event of dayEvents) {
      if (event.type === "income") {
        // Applica split: solo 48% disponibile (dopo IVA 22% e soci 30%)
        runningBalance += Math.round(event.amount * 0.48);
      } else {
        // Verifica se possiamo pagare
        if (runningBalance + event.amount < 0) {
          // Giorno di difficoltà trovato
          if (!difficultyDate) {
            difficultyDate = checkDateStr;
            daysUntil = i;
          }
        }
        runningBalance += event.amount;
      }
    }
  }

  return {
    daysUntil,
    date: difficultyDate,
    balance: runningBalance,
  };
}

// Calcola quanto fatturare per raggiungere un target
function calculateRequiredRevenue(
  currentBalance: number,
  totalExpenses: number,
  targetBalance: number = 0
): number {
  // Gap da coprire
  const gap = targetBalance - (currentBalance + totalExpenses);

  if (gap <= 0) return 0;

  // Dobbiamo fatturare il lordo, ma disponibile è solo 48%
  // gap = fatturato * 0.48
  // fatturato = gap / 0.48
  return Math.round(gap / 0.48);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const horizonDays = parseInt(searchParams.get("horizon") || "30");

    const today = new Date();
    const horizonDate = new Date(today);
    horizonDate.setDate(horizonDate.getDate() + horizonDays);
    const todayStr = today.toISOString().split("T")[0];
    const horizonStr = horizonDate.toISOString().split("T")[0];

    // 1. Recupera saldo iniziale
    const balanceSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "initial_balance"))
      .limit(1);
    const balanceDateSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "balance_date"))
      .limit(1);

    let initialBalance = balanceSetting[0]
      ? parseInt(balanceSetting[0].value)
      : 0;
    const balanceDate = balanceDateSetting[0]?.value || todayStr;

    // 2. Calcola saldo attuale (iniziale + transazioni dal balance_date)
    const pastTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          gte(transactions.date, balanceDate),
          lte(transactions.date, todayStr),
          isNull(transactions.deletedAt)
        )
      );

    let currentBalance = initialBalance;
    for (const tx of pastTransactions) {
      currentBalance += tx.amount;
    }

    // 3. Recupera spese previste attive e genera scadenze
    const activeExpenses = await db
      .select({
        expense: expectedExpenses,
        costCenterName: costCenters.name,
      })
      .from(expectedExpenses)
      .leftJoin(costCenters, eq(expectedExpenses.costCenterId, costCenters.id))
      .where(
        and(
          eq(expectedExpenses.isActive, true),
          isNull(expectedExpenses.deletedAt),
          lte(expectedExpenses.startDate, horizonStr),
          or(
            isNull(expectedExpenses.endDate),
            gte(expectedExpenses.endDate, todayStr)
          )
        )
      );

    const upcomingExpenses: UpcomingExpense[] = [];

    // Genera scadenze per le spese previste nel periodo
    for (const { expense, costCenterName } of activeExpenses) {
      const paymentDay = expense.expectedDay || 1;
      const startDate = new Date(expense.startDate);
      const endDate = expense.endDate ? new Date(expense.endDate) : horizonDate;

      if (expense.frequency === "monthly") {
        // Genera una scadenza per ogni mese nell'orizzonte
        for (let m = 0; m <= Math.ceil(horizonDays / 30); m++) {
          const dueDate = new Date(today.getFullYear(), today.getMonth() + m, paymentDay);
          if (dueDate >= today && dueDate <= horizonDate &&
              dueDate >= startDate && dueDate <= endDate) {
            // Verifica se già pagato (cerca transazione corrispondente)
            const paid = pastTransactions.some(
              (tx) =>
                tx.costCenterId === expense.costCenterId &&
                tx.date.startsWith(
                  `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}`
                )
            );

            upcomingExpenses.push({
              id: expense.id,
              date: dueDate.toISOString().split("T")[0],
              description: expense.name + (costCenterName ? ` (${costCenterName})` : ""),
              amount: -expense.amount, // negativo
              type: expense.notes?.toLowerCase().includes("tasse") ? "tax" : "cost",
              isEssential: expense.priority === "essential",
              isPaid: paid,
            });
          }
        }
      } else if (expense.frequency === "quarterly") {
        // Ogni 3 mesi dal mese di inizio
        const startMonth = startDate.getMonth();
        for (let m = 0; m <= Math.ceil(horizonDays / 30); m++) {
          const monthOffset = today.getMonth() + m;
          if ((monthOffset - startMonth) % 3 === 0) {
            const dueDate = new Date(today.getFullYear(), monthOffset, paymentDay);
            if (dueDate >= today && dueDate <= horizonDate &&
                dueDate >= startDate && dueDate <= endDate) {
              upcomingExpenses.push({
                id: expense.id + m * 100000,
                date: dueDate.toISOString().split("T")[0],
                description: expense.name + (costCenterName ? ` (${costCenterName})` : ""),
                amount: -expense.amount,
                type: "cost",
                isEssential: expense.priority === "essential",
                isPaid: false,
              });
            }
          }
        }
      } else if (expense.frequency === "semiannual") {
        // Ogni 6 mesi dal mese di inizio
        const startMonth = startDate.getMonth();
        for (let m = 0; m <= Math.ceil(horizonDays / 30); m++) {
          const monthOffset = today.getMonth() + m;
          if ((monthOffset - startMonth) % 6 === 0) {
            const dueDate = new Date(today.getFullYear(), monthOffset, paymentDay);
            if (dueDate >= today && dueDate <= horizonDate &&
                dueDate >= startDate && dueDate <= endDate) {
              upcomingExpenses.push({
                id: expense.id + m * 100000,
                date: dueDate.toISOString().split("T")[0],
                description: expense.name + (costCenterName ? ` (${costCenterName})` : ""),
                amount: -expense.amount,
                type: "cost",
                isEssential: expense.priority === "essential",
                isPaid: false,
              });
            }
          }
        }
      } else if (expense.frequency === "annual" || expense.frequency === "one_time") {
        // Una volta all'anno o una tantum
        const dueDate = new Date(startDate.getFullYear(), startDate.getMonth(), paymentDay);
        if (dueDate >= today && dueDate <= horizonDate) {
          upcomingExpenses.push({
            id: expense.id,
            date: dueDate.toISOString().split("T")[0],
            description: expense.name + (costCenterName ? ` (${costCenterName})` : ""),
            amount: -expense.amount,
            type: "cost",
            isEssential: expense.priority === "essential",
            isPaid: false,
          });
        }
      }
    }

    // 4. Recupera rate PDR non pagate
    const pdrInstallments = await db
      .select({
        id: paymentPlanInstallments.id,
        dueDate: paymentPlanInstallments.dueDate,
        amount: paymentPlanInstallments.amount,
        isPaid: paymentPlanInstallments.isPaid,
        creditorName: paymentPlans.creditorName,
      })
      .from(paymentPlanInstallments)
      .innerJoin(paymentPlans, eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id))
      .where(
        and(
          eq(paymentPlanInstallments.isPaid, false),
          gte(paymentPlanInstallments.dueDate, todayStr),
          lte(paymentPlanInstallments.dueDate, horizonStr)
        )
      )
      .orderBy(asc(paymentPlanInstallments.dueDate));

    for (const inst of pdrInstallments) {
      upcomingExpenses.push({
        id: inst.id,
        date: inst.dueDate,
        description: `PDR: ${inst.creditorName}`,
        amount: -inst.amount,
        type: "pdr",
        isEssential: true, // Le rate PDR sono sempre importanti
        isPaid: inst.isPaid || false,
      });
    }

    // 5. Recupera incassi previsti (da expected_incomes)
    const upcomingIncomes: UpcomingIncome[] = [];

    // Recupera tutti gli incassi previsti attivi nel periodo
    const activeIncomes = await db
      .select()
      .from(expectedIncomes)
      .where(
        and(
          eq(expectedIncomes.isActive, true),
          isNull(expectedIncomes.deletedAt),
          lte(expectedIncomes.startDate, horizonStr),
          or(
            isNull(expectedIncomes.endDate),
            gte(expectedIncomes.endDate, todayStr)
          )
        )
      );

    // Genera le occorrenze di incasso per ogni cliente nel periodo
    for (const income of activeIncomes) {
      const expectedDay = income.expectedDay || 20;
      const startDate = new Date(income.startDate);
      const endDate = income.endDate ? new Date(income.endDate) : horizonDate;

      if (income.frequency === "monthly") {
        // Genera una scadenza per ogni mese nell'orizzonte
        for (let m = 0; m <= Math.ceil(horizonDays / 30); m++) {
          const expectedDate = new Date(today.getFullYear(), today.getMonth() + m, expectedDay);
          if (expectedDate >= today && expectedDate <= horizonDate &&
              expectedDate >= startDate && expectedDate <= endDate) {
            upcomingIncomes.push({
              id: income.id + m * 100000,
              date: expectedDate.toISOString().split("T")[0],
              description: `Canone ${income.clientName}`,
              amount: income.amount,
              clientName: income.clientName,
              reliability: (income.reliability as "high" | "medium" | "low") || "high",
              isReceived: false,
            });
          }
        }
      } else if (income.frequency === "quarterly") {
        // Ogni 3 mesi dal mese di inizio
        const startMonth = startDate.getMonth();
        for (let m = 0; m <= Math.ceil(horizonDays / 30); m++) {
          const monthOffset = today.getMonth() + m;
          if ((monthOffset - startMonth) % 3 === 0 || monthOffset === startMonth) {
            const expectedDate = new Date(today.getFullYear(), monthOffset, expectedDay);
            if (expectedDate >= today && expectedDate <= horizonDate &&
                expectedDate >= startDate && expectedDate <= endDate) {
              upcomingIncomes.push({
                id: income.id + m * 100000,
                date: expectedDate.toISOString().split("T")[0],
                description: `Canone trimestrale ${income.clientName}`,
                amount: income.amount,
                clientName: income.clientName,
                reliability: (income.reliability as "high" | "medium" | "low") || "high",
                isReceived: false,
              });
            }
          }
        }
      } else if (income.frequency === "semiannual") {
        // Ogni 6 mesi dal mese di inizio
        const startMonth = startDate.getMonth();
        for (let m = 0; m <= Math.ceil(horizonDays / 30); m++) {
          const monthOffset = today.getMonth() + m;
          if ((monthOffset - startMonth) % 6 === 0 || monthOffset === startMonth) {
            const expectedDate = new Date(today.getFullYear(), monthOffset, expectedDay);
            if (expectedDate >= today && expectedDate <= horizonDate &&
                expectedDate >= startDate && expectedDate <= endDate) {
              upcomingIncomes.push({
                id: income.id + m * 100000,
                date: expectedDate.toISOString().split("T")[0],
                description: `Canone semestrale ${income.clientName}`,
                amount: income.amount,
                clientName: income.clientName,
                reliability: (income.reliability as "high" | "medium" | "low") || "high",
                isReceived: false,
              });
            }
          }
        }
      } else if (income.frequency === "annual" || income.frequency === "one_time") {
        // Una volta all'anno o una tantum
        const expectedDate = new Date(startDate.getFullYear(), startDate.getMonth(), expectedDay);
        if (expectedDate >= today && expectedDate <= horizonDate) {
          upcomingIncomes.push({
            id: income.id,
            date: expectedDate.toISOString().split("T")[0],
            description: `${income.frequency === "annual" ? "Canone annuale" : "Pagamento"} ${income.clientName}`,
            amount: income.amount,
            clientName: income.clientName,
            reliability: (income.reliability as "high" | "medium" | "low") || "high",
            isReceived: false,
          });
        }
      }
    }

    // Ordina le scadenze per priorità (vitali prima, poi importo, poi data)
    upcomingExpenses.sort((a, b) => {
      // Prima le non pagate
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
      // Poi le essenziali
      if (a.isEssential !== b.isEssential) return a.isEssential ? -1 : 1;
      // Poi per importo (più grande prima)
      if (Math.abs(a.amount) !== Math.abs(b.amount))
        return Math.abs(b.amount) - Math.abs(a.amount);
      // Infine per data
      return a.date.localeCompare(b.date);
    });

    // 6. Calcola i 3 numeri chiave
    const { daysUntil, date: difficultyDate, balance: projectedBalance } = calculateDifficultyDay(
      currentBalance,
      upcomingExpenses,
      upcomingIncomes,
      horizonDays
    );

    // Totale spese nel periodo (non pagate)
    const totalExpenses = upcomingExpenses
      .filter((e) => !e.isPaid)
      .reduce((sum, e) => sum + e.amount, 0);

    // Totale incassi certi (alta affidabilità, non ricevuti)
    const totalCertainIncome = upcomingIncomes
      .filter((i) => i.reliability === "high" && !i.isReceived)
      .reduce((sum, i) => sum + Math.round(i.amount * 0.48), 0); // Applica split

    // Saldo previsto fine periodo
    const endBalance = currentBalance + totalExpenses + totalCertainIncome;

    // Target fatturato
    const requiredRevenue = calculateRequiredRevenue(
      currentBalance,
      totalExpenses + totalCertainIncome,
      0 // Target: saldo 0 (sopravvivenza)
    );

    // Determina stato azienda
    let status: "defense" | "stabilization" | "growth";
    if (daysUntil !== null && daysUntil < 30) {
      status = "defense";
    } else if (endBalance < 100000) {
      // < 1000€
      status = "stabilization";
    } else {
      status = "growth";
    }

    // 7. Prossime scadenze (7 giorni)
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const sevenDaysStr = sevenDaysLater.toISOString().split("T")[0];

    const nextSevenDays = upcomingExpenses.filter(
      (e) => e.date >= todayStr && e.date <= sevenDaysStr && !e.isPaid
    );

    // 8. Debiti PDR totali
    const allPlans = await db
      .select()
      .from(paymentPlans)
      .where(and(eq(paymentPlans.isActive, true), isNull(paymentPlans.deletedAt)));

    const totalDebt = allPlans.reduce((sum, p) => sum + p.totalAmount, 0);
    const paidDebt = allPlans.reduce(
      (sum, p) => sum + (p.paidInstallments || 0) * p.installmentAmount,
      0
    );
    const remainingDebt = totalDebt - paidDebt;

    return NextResponse.json({
      // I 3 numeri chiave
      daysUntilDifficulty: daysUntil,
      difficultyDate,
      endPeriodBalance: endBalance,
      requiredRevenue,

      // Stato
      status,
      currentBalance,
      horizonDays,

      // Dettagli
      upcomingExpenses: nextSevenDays.slice(0, 10),
      upcomingIncomes: upcomingIncomes
        .filter((i) => !i.isReceived)
        .slice(0, 10),

      // Totali
      totalExpensesInPeriod: totalExpenses,
      totalCertainIncomeInPeriod: totalCertainIncome,

      // Debiti PDR
      debt: {
        total: totalDebt,
        remaining: remainingDebt,
        plansCount: allPlans.length,
        plansWithoutPlan: allPlans.filter((p) => p.installmentAmount === 0).length,
      },
    });
  } catch (error) {
    console.error("Cashflow API error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
