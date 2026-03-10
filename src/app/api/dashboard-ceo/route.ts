import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  settings,
  expectedExpenses,
  expectedIncomes,
  transactions,
  paymentPlans,
  paymentPlanInstallments,
  paymentPlanCategories,
  salesOpportunities,
  forecastItems,
} from "@/lib/db/schema";
import { eq, and, gte, lte, isNull, or, asc, desc, lt } from "drizzle-orm";

// Helper per calcolare l'available da un lordo (dopo IVA 22%, commissione, soci 30%)
function calculateAvailableFromGross(grossAmount: number, commissionRate: number = 0): number {
  const netAmount = Math.round(grossAmount / 1.22);
  const commissionAmount = Math.round(netAmount * (commissionRate / 100));
  const postCommission = netAmount - commissionAmount;
  const partnersAmount = Math.round(postCommission * 0.30);
  return postCommission - partnersAmount;
}

// Helper per generare rate virtuali
function generateVirtualInstallments(
  totalAmount: number,
  paymentType: string,
  startMonth: number,
  startYear: number
): { month: number; year: number; grossAmount: number }[] {
  switch (paymentType) {
    case "sito_web_50_50":
      const first = Math.round(totalAmount / 2);
      let secondMonth = startMonth + 2;
      let secondYear = startYear;
      if (secondMonth > 12) { secondMonth -= 12; secondYear += 1; }
      return [
        { month: startMonth, year: startYear, grossAmount: first },
        { month: secondMonth, year: secondYear, grossAmount: totalAmount - first },
      ];
    case "msd_30_70":
      const msdFirst = Math.round(totalAmount * 0.30);
      return [
        { month: startMonth, year: startYear, grossAmount: msdFirst },
        { month: startMonth, year: startYear, grossAmount: totalAmount - msdFirst },
      ];
    case "marketing_4_trim":
      const quarterly = Math.round(totalAmount / 4);
      const installments = [];
      for (let i = 0; i < 4; i++) {
        let m = startMonth + (i * 3);
        let y = startYear;
        while (m > 12) { m -= 12; y += 1; }
        installments.push({ month: m, year: y, grossAmount: i === 3 ? totalAmount - (quarterly * 3) : quarterly });
      }
      return installments;
    default:
      return [{ month: startMonth, year: startYear, grossAmount: totalAmount }];
  }
}

// Helper per calcolare le spese previste di un mese
async function getMonthlyExpenses(month: number, year: number) {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const expenses = await db
    .select()
    .from(expectedExpenses)
    .where(
      and(
        eq(expectedExpenses.isActive, true),
        isNull(expectedExpenses.deletedAt),
        lte(expectedExpenses.startDate, monthEnd),
        or(isNull(expectedExpenses.endDate), gte(expectedExpenses.endDate, monthStart))
      )
    );

  let total = 0;
  for (const expense of expenses) {
    const startDate = new Date(expense.startDate);
    const startMonth = startDate.getMonth() + 1;
    const startYear = startDate.getFullYear();

    if (expense.frequency === "monthly") {
      if (year > startYear || (year === startYear && month >= startMonth)) {
        total += expense.amount;
      }
    } else if (expense.frequency === "quarterly") {
      const monthsDiff = (year - startYear) * 12 + (month - startMonth);
      if (monthsDiff >= 0 && monthsDiff % 3 === 0) {
        total += expense.amount;
      }
    } else if (expense.frequency === "semiannual") {
      const monthsDiff = (year - startYear) * 12 + (month - startMonth);
      if (monthsDiff >= 0 && monthsDiff % 6 === 0) {
        total += expense.amount;
      }
    } else if (expense.frequency === "annual" || expense.frequency === "one_time") {
      if (startMonth === month && startYear === year) {
        total += expense.amount;
      }
    }
  }
  return total;
}

// Helper per calcolare gli incassi previsti di un mese
async function getMonthlyIncomes(month: number, year: number) {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const incomes = await db
    .select()
    .from(expectedIncomes)
    .where(
      and(
        eq(expectedIncomes.isActive, true),
        isNull(expectedIncomes.deletedAt),
        lte(expectedIncomes.startDate, monthEnd),
        or(isNull(expectedIncomes.endDate), gte(expectedIncomes.endDate, monthStart))
      )
    );

  let total = 0;
  for (const income of incomes) {
    const startDate = new Date(income.startDate);
    const startMonth = startDate.getMonth() + 1;
    const startYear = startDate.getFullYear();

    if (income.frequency === "monthly") {
      if (year > startYear || (year === startYear && month >= startMonth)) {
        total += income.amount;
      }
    } else if (income.frequency === "quarterly") {
      const monthsDiff = (year - startYear) * 12 + (month - startMonth);
      if (monthsDiff >= 0 && monthsDiff % 3 === 0) {
        total += income.amount;
      }
    } else if (income.frequency === "semiannual") {
      const monthsDiff = (year - startYear) * 12 + (month - startMonth);
      if (monthsDiff >= 0 && monthsDiff % 6 === 0) {
        total += income.amount;
      }
    } else if (income.frequency === "annual" || income.frequency === "one_time") {
      if (startMonth === month && startYear === year) {
        total += income.amount;
      }
    }
  }
  return total;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || "2026");

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const currentMonth = today.getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 3);

    // ============ 1. SALDO CASSA ATTUALE ============
    const balanceSetting = await db.select().from(settings).where(eq(settings.key, "initial_balance")).limit(1);
    const balanceDateSetting = await db.select().from(settings).where(eq(settings.key, "balance_date")).limit(1);

    let initialBalance = balanceSetting[0] ? parseInt(balanceSetting[0].value) : 0;
    const balanceDate = balanceDateSetting[0]?.value || todayStr;

    // Transazioni dal balance_date a oggi
    const pastTransactions = await db
      .select()
      .from(transactions)
      .where(and(gte(transactions.date, balanceDate), lte(transactions.date, todayStr), isNull(transactions.deletedAt)));

    let currentBalance = initialBalance;
    for (const tx of pastTransactions) {
      currentBalance += tx.amount;
    }

    // Saldo 7 giorni fa per confronto
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const txsLast7Days = pastTransactions.filter(tx => tx.date > sevenDaysAgoStr);
    const balanceChange7Days = txsLast7Days.reduce((sum, tx) => sum + tx.amount, 0);

    // ============ 2. RUNWAY ============
    // Media spese mensili previste (da Piano Annuale)
    let totalYearlyExpenses = 0;
    for (let m = 1; m <= 12; m++) {
      totalYearlyExpenses += await getMonthlyExpenses(m, year);
    }
    const avgMonthlyExpenses = Math.round(totalYearlyExpenses / 12);

    // Aggiungi rate PDR medie
    const allPdrInstallments = await db
      .select({ amount: paymentPlanInstallments.amount })
      .from(paymentPlanInstallments)
      .innerJoin(paymentPlans, eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id))
      .where(eq(paymentPlans.isActive, true));

    const avgMonthlyPdr = allPdrInstallments.length > 0
      ? Math.round(allPdrInstallments.reduce((s, i) => s + i.amount, 0) / 12)
      : 0;

    const totalMonthlyBurn = avgMonthlyExpenses + avgMonthlyPdr;
    const runwayMonths = totalMonthlyBurn > 0 ? currentBalance / totalMonthlyBurn : 99;
    const runwayTarget = 3; // Target 3 mesi

    // ============ 3. OBIETTIVO VENDITE TRIMESTRE ============
    const quarterStartMonth = (currentQuarter - 1) * 3 + 1;
    const quarterEndMonth = currentQuarter * 3;
    const quarterEndDate = new Date(year, quarterEndMonth, 0);
    const daysRemainingInQuarter = Math.max(0, Math.ceil((quarterEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    // Calcola gap del trimestre
    let quarterGap = 0;
    let quarterExpenses = 0;
    let quarterIncomes = 0;
    let quarterPdr = 0;

    for (let m = quarterStartMonth; m <= quarterEndMonth; m++) {
      const monthExpenses = await getMonthlyExpenses(m, year);
      const monthIncomes = await getMonthlyIncomes(m, year);

      // Rate PDR del mese
      const monthStart = `${year}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(year, m, 0).getDate();
      const monthEnd = `${year}-${String(m).padStart(2, '0')}-${lastDay}`;

      const pdrMonth = await db
        .select({ amount: paymentPlanInstallments.amount })
        .from(paymentPlanInstallments)
        .innerJoin(paymentPlans, eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id))
        .where(and(
          gte(paymentPlanInstallments.dueDate, monthStart),
          lte(paymentPlanInstallments.dueDate, monthEnd),
          eq(paymentPlans.isActive, true)
        ));

      const monthPdr = pdrMonth.reduce((s, i) => s + i.amount, 0);

      quarterExpenses += monthExpenses;
      quarterIncomes += monthIncomes;
      quarterPdr += monthPdr;
    }

    const quarterAvailableIncome = Math.round(quarterIncomes * 0.48);
    quarterGap = Math.max(0, (quarterExpenses + quarterPdr) - quarterAvailableIncome);

    // Vendite del trimestre
    const quarterSales = await db
      .select()
      .from(salesOpportunities)
      .where(and(
        eq(salesOpportunities.year, year),
        gte(salesOpportunities.month, quarterStartMonth),
        lte(salesOpportunities.month, quarterEndMonth),
        isNull(salesOpportunities.deletedAt)
      ));

    // Calcola available dalle vendite (distribuito per rate)
    let quarterSalesAvailable = 0;
    let quarterSalesWonAvailable = 0;
    let quarterSalesGross = 0;
    let quarterSalesWonGross = 0;

    for (const sale of quarterSales) {
      const installments = generateVirtualInstallments(sale.totalAmount, sale.paymentType, sale.month, sale.year);
      for (const inst of installments) {
        if (inst.year === year && inst.month >= quarterStartMonth && inst.month <= quarterEndMonth) {
          const available = calculateAvailableFromGross(inst.grossAmount, sale.commissionRate);
          quarterSalesAvailable += available;
          quarterSalesGross += inst.grossAmount;
          if (sale.status === "won") {
            quarterSalesWonAvailable += available;
            quarterSalesWonGross += inst.grossAmount;
          }
        }
      }
    }

    const quarterRemainingToSell = Math.max(0, quarterGap - quarterSalesAvailable);
    const quarterProgress = quarterGap > 0 ? Math.min(100, Math.round((quarterSalesAvailable / quarterGap) * 100)) : 100;

    // ============ 4. SOSTENIBILITÀ MESE CORRENTE ============
    const currentMonthExpenses = await getMonthlyExpenses(currentMonth, year);
    const currentMonthIncomes = await getMonthlyIncomes(currentMonth, year);

    // PDR mese corrente
    const monthStart = `${year}-${String(currentMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(year, currentMonth, 0).getDate();
    const monthEnd = `${year}-${String(currentMonth).padStart(2, '0')}-${lastDay}`;

    const currentMonthPdr = await db
      .select({ amount: paymentPlanInstallments.amount })
      .from(paymentPlanInstallments)
      .innerJoin(paymentPlans, eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id))
      .where(and(
        gte(paymentPlanInstallments.dueDate, monthStart),
        lte(paymentPlanInstallments.dueDate, monthEnd),
        eq(paymentPlans.isActive, true)
      ));

    const currentMonthPdrTotal = currentMonthPdr.reduce((s, i) => s + i.amount, 0);
    const currentMonthAvailableIncome = Math.round(currentMonthIncomes * 0.48);
    const currentMonthMargin = currentMonthAvailableIncome - currentMonthExpenses - currentMonthPdrTotal;

    // Mese precedente per confronto
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? year - 1 : year;
    const prevMonthExpenses = await getMonthlyExpenses(prevMonth, prevYear);
    const prevMonthIncomes = await getMonthlyIncomes(prevMonth, prevYear);

    const prevMonthStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
    const prevMonthEnd = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${prevLastDay}`;

    const prevMonthPdrData = await db
      .select({ amount: paymentPlanInstallments.amount })
      .from(paymentPlanInstallments)
      .innerJoin(paymentPlans, eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id))
      .where(and(
        gte(paymentPlanInstallments.dueDate, prevMonthStart),
        lte(paymentPlanInstallments.dueDate, prevMonthEnd),
        eq(paymentPlans.isActive, true)
      ));

    const prevMonthPdrTotal = prevMonthPdrData.reduce((s, i) => s + i.amount, 0);
    const prevMonthAvailableIncome = Math.round(prevMonthIncomes * 0.48);
    const prevMonthMargin = prevMonthAvailableIncome - prevMonthExpenses - prevMonthPdrTotal;

    // ============ 5. PROSSIMI 7 GIORNI ============
    const next7Days = new Date(today);
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = next7Days.toISOString().split("T")[0];

    // Incassi previsti prossimi 7gg
    const upcomingIncomes: Array<{
      id: number;
      date: string;
      description: string;
      amount: number;
      clientName: string;
    }> = [];

    const activeIncomes = await db.select().from(expectedIncomes).where(
      and(eq(expectedIncomes.isActive, true), isNull(expectedIncomes.deletedAt))
    );

    // Carica forecast realizzati per questo mese (per evitare doppio conteggio)
    const realizedRangeStart = `${year}-${String(currentMonth).padStart(2, "0")}-01`;
    const realizedRangeEnd = `${year}-${String(currentMonth).padStart(2, "0")}-31`;
    const realizedForecasts = await db.select().from(forecastItems).where(
      and(
        eq(forecastItems.isRealized, true),
        isNull(forecastItems.deletedAt),
        gte(forecastItems.date, realizedRangeStart),
        lte(forecastItems.date, realizedRangeEnd)
      )
    );

    for (const income of activeIncomes) {
      const expectedDay = income.expectedDay || 20;
      if (income.frequency === "monthly") {
        const dueDate = new Date(year, currentMonth - 1, expectedDay);
        const dueDateStr = dueDate.toISOString().split("T")[0];
        if (dueDateStr >= todayStr && dueDateStr <= next7DaysStr) {
          // Verifica se il forecast corrispondente è già stato realizzato
          const isRealized = realizedForecasts.some(
            (f) => f.sourceType === "expected_income" && f.sourceId === income.id
          );
          if (!isRealized) {
            upcomingIncomes.push({
              id: income.id,
              date: dueDateStr,
              description: `Canone ${income.clientName}`,
              amount: income.amount,
              clientName: income.clientName,
            });
          }
        }
      }
    }

    // Uscite previste prossimi 7gg
    const upcomingExpenses: Array<{
      id: number;
      date: string;
      description: string;
      amount: number;
      type: "cost" | "pdr";
      isEssential: boolean;
    }> = [];

    const activeExpenses = await db.select().from(expectedExpenses).where(
      and(eq(expectedExpenses.isActive, true), isNull(expectedExpenses.deletedAt))
    );

    for (const expense of activeExpenses) {
      const paymentDay = expense.expectedDay || 1;
      if (expense.frequency === "monthly") {
        const dueDate = new Date(year, currentMonth - 1, paymentDay);
        const dueDateStr = dueDate.toISOString().split("T")[0];
        if (dueDateStr >= todayStr && dueDateStr <= next7DaysStr) {
          // Verifica se il forecast corrispondente è già stato realizzato
          const isRealized = realizedForecasts.some(
            (f) => f.sourceType === "expected_expense" && f.sourceId === expense.id
          );
          if (!isRealized) {
            upcomingExpenses.push({
              id: expense.id,
              date: dueDateStr,
              description: expense.name,
              amount: expense.amount,
              type: "cost",
              isEssential: expense.priority === "essential",
            });
          }
        }
      }
    }

    // Rate PDR prossimi 7gg
    const pdrNext7Days = await db
      .select({
        id: paymentPlanInstallments.id,
        dueDate: paymentPlanInstallments.dueDate,
        amount: paymentPlanInstallments.amount,
        isPaid: paymentPlanInstallments.isPaid,
        creditorName: paymentPlans.creditorName,
      })
      .from(paymentPlanInstallments)
      .innerJoin(paymentPlans, eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id))
      .where(and(
        eq(paymentPlanInstallments.isPaid, false),
        gte(paymentPlanInstallments.dueDate, todayStr),
        lte(paymentPlanInstallments.dueDate, next7DaysStr)
      ))
      .orderBy(asc(paymentPlanInstallments.dueDate));

    for (const inst of pdrNext7Days) {
      upcomingExpenses.push({
        id: inst.id,
        date: inst.dueDate,
        description: `PDR ${inst.creditorName}`,
        amount: inst.amount,
        type: "pdr",
        isEssential: true,
      });
    }

    // Ordina per data
    upcomingExpenses.sort((a, b) => a.date.localeCompare(b.date));
    upcomingIncomes.sort((a, b) => a.date.localeCompare(b.date));

    const next7DaysIncome = upcomingIncomes.reduce((s, i) => s + i.amount, 0);
    const next7DaysExpense = upcomingExpenses.reduce((s, e) => s + e.amount, 0);

    // ============ 6. ULTIMI 7 GIORNI ============
    const last7DaysIncomes = txsLast7Days.filter(tx => tx.amount > 0);
    const last7DaysExpenses = txsLast7Days.filter(tx => tx.amount < 0);

    const last7DaysTotalIncome = last7DaysIncomes.reduce((s, tx) => s + tx.amount, 0);
    const last7DaysTotalExpense = last7DaysExpenses.reduce((s, tx) => s + tx.amount, 0);

    // ============ 7. AZIONI RICHIESTE ============
    // Rate PDR scadute
    const overdueInstallments = await db
      .select({
        id: paymentPlanInstallments.id,
        dueDate: paymentPlanInstallments.dueDate,
        amount: paymentPlanInstallments.amount,
        creditorName: paymentPlans.creditorName,
      })
      .from(paymentPlanInstallments)
      .innerJoin(paymentPlans, eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id))
      .where(and(
        eq(paymentPlanInstallments.isPaid, false),
        lt(paymentPlanInstallments.dueDate, todayStr),
        eq(paymentPlans.isActive, true)
      ))
      .orderBy(asc(paymentPlanInstallments.dueDate));

    // Fatture da emettere (incassi previsti del mese non ancora incassati)
    // Per ora usiamo gli expectedIncomes del mese corrente
    const invoicesToIssue = activeIncomes.filter(income => {
      if (income.frequency !== "monthly") return false;
      const startDate = new Date(income.startDate);
      return startDate <= today;
    }).slice(0, 5);

    // Incassi in ritardo (incassi previsti passati non registrati)
    // Semplificato: incassi con expectedDay < oggi nel mese corrente
    const latePayments = activeIncomes.filter(income => {
      const expectedDay = income.expectedDay || 20;
      const expectedDate = new Date(year, currentMonth - 1, expectedDay);
      return expectedDate < today && income.frequency === "monthly";
    }).slice(0, 5);

    // ============ 8. PIANI DI RIENTRO ============
    const activePlans = await db
      .select({
        plan: paymentPlans,
        category: paymentPlanCategories,
      })
      .from(paymentPlans)
      .leftJoin(paymentPlanCategories, eq(paymentPlans.categoryId, paymentPlanCategories.id))
      .where(and(eq(paymentPlans.isActive, true), isNull(paymentPlans.deletedAt)))
      .orderBy(asc(paymentPlans.totalAmount));

    const plansWithProgress = activePlans.map(({ plan, category }) => {
      const paid = (plan.paidInstallments || 0) * plan.installmentAmount;
      const remaining = plan.totalAmount - paid;
      const progress = Math.round((paid / plan.totalAmount) * 100);

      // Calcola data chiusura stimata
      const remainingInstallments = plan.totalInstallments - (plan.paidInstallments || 0);
      const closeDate = new Date(today);
      closeDate.setMonth(closeDate.getMonth() + remainingInstallments);

      return {
        id: plan.id,
        creditorName: plan.creditorName,
        category: category ? { name: category.name, color: category.color } : null,
        totalAmount: plan.totalAmount,
        remaining,
        paidInstallments: plan.paidInstallments || 0,
        totalInstallments: plan.totalInstallments,
        progress,
        estimatedCloseDate: closeDate.toISOString().split("T")[0],
      };
    });

    const totalDebtRemaining = plansWithProgress.reduce((s, p) => s + p.remaining, 0);
    const monthlyPdrTotal = currentMonthPdrTotal;

    // ============ 9. TREND (ultimi 3 mesi) ============
    const trend = [];
    for (let i = 2; i >= 0; i--) {
      const trendMonth = currentMonth - i;
      const trendYear = trendMonth <= 0 ? year - 1 : year;
      const actualMonth = trendMonth <= 0 ? trendMonth + 12 : trendMonth;

      const mExpenses = await getMonthlyExpenses(actualMonth, trendYear);
      const mIncomes = await getMonthlyIncomes(actualMonth, trendYear);

      const mStart = `${trendYear}-${String(actualMonth).padStart(2, '0')}-01`;
      const mLastDay = new Date(trendYear, actualMonth, 0).getDate();
      const mEnd = `${trendYear}-${String(actualMonth).padStart(2, '0')}-${mLastDay}`;

      const mPdrData = await db
        .select({ amount: paymentPlanInstallments.amount })
        .from(paymentPlanInstallments)
        .innerJoin(paymentPlans, eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id))
        .where(and(
          gte(paymentPlanInstallments.dueDate, mStart),
          lte(paymentPlanInstallments.dueDate, mEnd)
        ));

      const mPdr = mPdrData.reduce((s, p) => s + p.amount, 0);
      const mAvailable = Math.round(mIncomes * 0.48);
      const mMargin = mAvailable - mExpenses - mPdr;

      trend.push({
        month: actualMonth,
        year: trendYear,
        income: mAvailable,
        expenses: mExpenses + mPdr,
        margin: mMargin,
      });
    }

    return NextResponse.json({
      // 1. Cassa
      currentBalance,
      balanceChange7Days,

      // 2. Runway
      runway: {
        months: Math.round(runwayMonths * 10) / 10,
        target: runwayTarget,
        percent: Math.min(100, Math.round((runwayMonths / runwayTarget) * 100)),
        avgMonthlyBurn: totalMonthlyBurn,
      },

      // 3. Obiettivo vendite trimestre
      quarterSales: {
        quarter: currentQuarter,
        year,
        daysRemaining: daysRemainingInQuarter,
        gap: quarterGap,
        salesAvailable: quarterSalesAvailable,
        salesWonAvailable: quarterSalesWonAvailable,
        salesGross: quarterSalesGross,
        salesWonGross: quarterSalesWonGross,
        remainingToSell: quarterRemainingToSell,
        progress: quarterProgress,
      },

      // 4. Sostenibilità mese
      currentMonthSustainability: {
        month: currentMonth,
        year,
        income: currentMonthAvailableIncome,
        expenses: currentMonthExpenses,
        pdr: currentMonthPdrTotal,
        margin: currentMonthMargin,
        prevMonth: {
          month: prevMonth,
          year: prevYear,
          margin: prevMonthMargin,
        },
        marginChange: currentMonthMargin - prevMonthMargin,
      },

      // 5. Prossimi 7 giorni
      next7Days: {
        incomes: upcomingIncomes.slice(0, 5),
        expenses: upcomingExpenses.slice(0, 8),
        totalIncome: next7DaysIncome,
        totalExpense: next7DaysExpense,
        balance: next7DaysIncome - next7DaysExpense,
      },

      // 6. Ultimi 7 giorni
      last7Days: {
        incomes: last7DaysIncomes.slice(0, 5).map(tx => ({
          id: tx.id,
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
        })),
        expenses: last7DaysExpenses.slice(0, 5).map(tx => ({
          id: tx.id,
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
        })),
        totalIncome: last7DaysTotalIncome,
        totalExpense: last7DaysTotalExpense,
        balance: last7DaysTotalIncome + last7DaysTotalExpense,
      },

      // 7. Azioni richieste
      actions: {
        overdueInstallments: overdueInstallments.map(i => ({
          id: i.id,
          creditorName: i.creditorName,
          dueDate: i.dueDate,
          amount: i.amount,
        })),
        overdueTotal: overdueInstallments.reduce((s, i) => s + i.amount, 0),
        invoicesToIssue: invoicesToIssue.map(i => ({
          id: i.id,
          clientName: i.clientName,
          amount: i.amount,
        })),
        invoicesTotal: invoicesToIssue.reduce((s, i) => s + i.amount, 0),
        latePayments: latePayments.map(i => ({
          id: i.id,
          clientName: i.clientName,
          amount: i.amount,
          expectedDay: i.expectedDay,
        })),
        lateTotal: latePayments.reduce((s, i) => s + i.amount, 0),
      },

      // 8. Piani di rientro
      pdr: {
        plans: plansWithProgress,
        totalRemaining: totalDebtRemaining,
        monthlyTotal: monthlyPdrTotal,
      },

      // 9. Trend
      trend,
    });
  } catch (error) {
    console.error("Dashboard CEO API error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
