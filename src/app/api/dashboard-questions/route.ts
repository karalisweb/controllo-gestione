import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  expectedExpenses,
  expectedExpenseOverrides,
  expectedIncomes,
  expectedIncomeOverrides,
  paymentPlans,
  paymentPlanInstallments,
  transactions,
  incomeSplits,
  settings,
} from "@/lib/db/schema";
import { and, eq, isNull, lte, gte, or } from "drizzle-orm";
import { calculateSplit } from "@/lib/utils/splits";
import { getSplitConfig } from "@/lib/utils/settings-server";

/**
 * GET /api/dashboard-questions
 *
 * Calcola le 5 metriche per la dashboard "5 domande operative":
 *  1. Come va il mese? — fatturato netto / soci / agency / speso / saldo agency
 *  2. Quanto devo vendere? — break-even mese (spese incl PDR) - agency a oggi
 *  3. Ricorrente copre i fissi? — agency ricorrente vs spese fisse strutturali (escl. PDR)
 *  4. Sto costruendo il gruzzolo? — placeholder finché non c'è la pagina /fondi
 *  5. Posso permettermi investimenti? — cassa, runway, eccedenza sopra minimo sicuro 90gg
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function monthMatches(
  startDate: string,
  endDate: string | null,
  frequency: string,
  year: number,
  month: number,
): boolean {
  const [sy, sm] = startDate.split("-").map(Number);
  const startYM = sy * 12 + (sm - 1);
  const targetYM = year * 12 + (month - 1);
  if (targetYM < startYM) return false;
  if (endDate) {
    const [ey, em] = endDate.split("-").map(Number);
    const endYM = ey * 12 + (em - 1);
    if (targetYM > endYM) return false;
  }
  const monthsFromStart = targetYM - startYM;
  switch (frequency) {
    case "monthly": return true;
    case "quarterly": return monthsFromStart % 3 === 0;
    case "semiannual": return monthsFromStart % 6 === 0;
    case "annual":
    case "one_time": return monthsFromStart % 12 === 0;
    default: return monthsFromStart === 0;
  }
}

export async function GET(_request: NextRequest) {
  try {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const monthStart = `${year}-${pad2(month)}-01`;
    const monthEnd = `${year}-${pad2(month)}-${pad2(lastDayOfMonth(year, month))}`;

    const splitConfig = await getSplitConfig();
    // Quota agenzia su 1€ di netto incassato (assumendo split standard)
    const agencyShareOfNet = (100 - splitConfig.alessioPct - splitConfig.danielaPct) / 100;

    // ───── A. Settings & cassa attuale ─────
    const settingsRows = await db.select().from(settings);
    const initialBalance = parseInt(settingsRows.find((r) => r.key === "initial_balance")?.value || "0", 10);
    const balanceDate = settingsRows.find((r) => r.key === "balance_date")?.value || "2026-01-01";

    // ───── B. Transactions del mese + dell'anno per cassa/burn ─────
    const txsForBalance = await db
      .select()
      .from(transactions)
      .where(
        and(
          isNull(transactions.deletedAt),
          gte(transactions.date, balanceDate),
          lte(transactions.date, todayStr),
        ),
      );

    let currentBalance = initialBalance;
    for (const t of txsForBalance) {
      if (t.isTransfer) continue;
      currentBalance += t.amount;
    }

    // Transactions del mese (fino a oggi inclusivo)
    const txsMonth = txsForBalance.filter((t) => t.date >= monthStart && t.date <= todayStr);

    // ───── C. incomeSplits del mese (lookup per id) ─────
    const splitsRows = await db
      .select({
        transactionId: incomeSplits.transactionId,
        netAmount: incomeSplits.netAmount,
        vatAmount: incomeSplits.vatAmount,
        alessioAmount: incomeSplits.alessioAmount,
        danielaAmount: incomeSplits.danielaAmount,
        agencyAmount: incomeSplits.agencyAmount,
      })
      .from(incomeSplits)
      .innerJoin(transactions, eq(incomeSplits.transactionId, transactions.id))
      .where(
        and(
          isNull(transactions.deletedAt),
          gte(transactions.date, monthStart),
          lte(transactions.date, monthEnd),
        ),
      );
    const splitByTxId = new Map<number, { net: number; alessio: number; daniela: number; agency: number; iva: number }>();
    for (const s of splitsRows) {
      if (s.transactionId == null) continue;
      splitByTxId.set(s.transactionId, {
        net: s.netAmount,
        alessio: s.alessioAmount,
        daniela: s.danielaAmount,
        agency: s.agencyAmount,
        iva: s.vatAmount,
      });
    }

    // ───── 1. Card "Come va il mese?" — calcoli a oggi ─────
    let invoicedNetToDate = 0;
    let sociToDate = 0;
    let agencyToDate = 0;
    let spentToDate = 0;
    for (const t of txsMonth) {
      if (t.isTransfer) continue;
      if (t.amount > 0) {
        if (t.linkedTransactionId != null) continue; // figlia split (giroconto)
        const recorded = splitByTxId.get(t.id);
        if (recorded) {
          invoicedNetToDate += recorded.net;
          sociToDate += recorded.alessio + recorded.daniela;
          agencyToDate += recorded.agency;
        } else {
          const split = calculateSplit(t.amount, splitConfig);
          invoicedNetToDate += split.netAmount;
          sociToDate += split.alessioAmount + split.danielaAmount;
          agencyToDate += split.agencyAmount;
        }
      } else {
        // Esclude giroconti soci+IVA (linkedTransactionId NOT NULL)
        if (t.linkedTransactionId != null) continue;
        spentToDate += -t.amount;
      }
    }
    const monthBalance = agencyToDate - spentToDate;

    // ───── D. Previsti residui (data >= today) per Card 2 e Card 3 ─────
    const expensesTpl = await db
      .select()
      .from(expectedExpenses)
      .where(
        and(
          isNull(expectedExpenses.deletedAt),
          eq(expectedExpenses.isActive, true),
          lte(expectedExpenses.startDate, monthEnd),
          or(isNull(expectedExpenses.endDate), gte(expectedExpenses.endDate, monthStart)),
        ),
      );
    const incomesTpl = await db
      .select()
      .from(expectedIncomes)
      .where(
        and(
          isNull(expectedIncomes.deletedAt),
          eq(expectedIncomes.isActive, true),
          lte(expectedIncomes.startDate, monthEnd),
          or(isNull(expectedIncomes.endDate), gte(expectedIncomes.endDate, monthStart)),
        ),
      );

    const expIds = expensesTpl.map((e) => e.id);
    const incIds = incomesTpl.map((i) => i.id);
    const expOvAll = expIds.length > 0
      ? await db
          .select()
          .from(expectedExpenseOverrides)
          .where(and(eq(expectedExpenseOverrides.year, year), eq(expectedExpenseOverrides.month, month)))
      : [];
    const incOvAll = incIds.length > 0
      ? await db
          .select()
          .from(expectedIncomeOverrides)
          .where(and(eq(expectedIncomeOverrides.year, year), eq(expectedIncomeOverrides.month, month)))
      : [];
    const expOvMap = new Map<number, { amount: number; day: number | null }>();
    for (const o of expOvAll) expOvMap.set(o.expectedExpenseId, { amount: o.amount, day: o.day });
    const incOvMap = new Map<number, { amount: number; day: number | null }>();
    for (const o of incOvAll) incOvMap.set(o.expectedIncomeId, { amount: o.amount, day: o.day });

    // Previsti spese residui (per il break-even della Card 2)
    let plannedExpensesResidual = 0;
    let fixedStructureMonthly = 0; // template ricorrenti del mese (escl. one_time, escl. PDR)
    for (const e of expensesTpl) {
      if (!monthMatches(e.startDate, e.endDate, e.frequency, year, month)) continue;
      const ov = expOvMap.get(e.id);
      const dayBase = ov?.day ?? e.expectedDay ?? 1;
      const day = Math.min(Math.max(dayBase, 1), lastDayOfMonth(year, month));
      const date = `${year}-${pad2(month)}-${pad2(day)}`;
      const amount = ov ? ov.amount : e.amount;
      if (amount === 0) continue;
      // Per break-even mese (Card 2): contiamo SOLO i previsti residui (data >= today)
      // perché il passato è già nello speso reale.
      if (date >= todayStr) plannedExpensesResidual += amount;
      // Per fissi strutturali (Card 3): contiamo TUTTI i ricorrenti del mese (escl. one_time)
      if (e.frequency !== "one_time") fixedStructureMonthly += amount;
    }

    // Previsti incassi residui (per break-even della Card 2)
    let plannedIncomeResidual = 0; // lordo
    // E ricorrente lordo mese (per Card 3)
    let recurringIncomeMonthly = 0; // lordo
    for (const i of incomesTpl) {
      if (!monthMatches(i.startDate, i.endDate, i.frequency, year, month)) continue;
      const ov = incOvMap.get(i.id);
      const dayBase = ov?.day ?? i.expectedDay ?? 1;
      const day = Math.min(Math.max(dayBase, 1), lastDayOfMonth(year, month));
      const date = `${year}-${pad2(month)}-${pad2(day)}`;
      const amount = ov ? ov.amount : i.amount;
      if (amount === 0) continue;
      if (date >= todayStr) plannedIncomeResidual += amount;
      if (i.frequency !== "one_time") recurringIncomeMonthly += amount;
    }

    // Rate PDR del mese
    const installments = await db
      .select({
        dueDate: paymentPlanInstallments.dueDate,
        amount: paymentPlanInstallments.amount,
        isPaid: paymentPlanInstallments.isPaid,
        transactionId: paymentPlanInstallments.transactionId,
      })
      .from(paymentPlanInstallments)
      .leftJoin(paymentPlans, eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id))
      .where(
        and(
          gte(paymentPlanInstallments.dueDate, monthStart),
          lte(paymentPlanInstallments.dueDate, monthEnd),
          isNull(paymentPlans.deletedAt),
          eq(paymentPlans.isActive, true),
        ),
      );
    let pdrMonthTotal = 0; // rate del mese (incluse pagate per il totale del mese)
    let pdrMonthResidualForBreakEven = 0; // solo non pagate dal today
    for (const inst of installments) {
      pdrMonthTotal += inst.amount;
      if (!inst.isPaid && inst.dueDate >= todayStr) pdrMonthResidualForBreakEven += inst.amount;
    }

    // ───── 2. Card "Quanto devo vendere?" ─────
    // Spese mese totali (incl. PDR) = speso a oggi + previsti residui spese + PDR residui
    // (più realistico per "pareggiare CASSA agenzia")
    const expensesMonthTotal = spentToDate + plannedExpensesResidual + pdrMonthResidualForBreakEven;
    const agencyMissing = Math.max(0, expensesMonthTotal - agencyToDate);
    // Per fatturare X di agency serve netto = X / agencyShare
    const netToInvoice = agencyShareOfNet > 0 ? Math.round(agencyMissing / agencyShareOfNet) : 0;
    // Verso obiettivo: TODO se settato in futuro
    const breakEvenReached = agencyMissing === 0;

    // ───── 3. Card "Ricorrente copre i fissi?" ─────
    // Approssimazione: ricorrente netto = ricorrente lordo / (1 + vatPct/100)
    const vatFactor = 1 + splitConfig.vatPct / 100;
    const recurringNet = vatFactor > 0 ? Math.round(recurringIncomeMonthly / vatFactor) : recurringIncomeMonthly;
    const recurringAgency = Math.round(recurringNet * agencyShareOfNet);
    const structureGap = recurringAgency - fixedStructureMonthly; // > 0 = copre struttura
    const totalFixedWithPdr = fixedStructureMonthly + pdrMonthTotal;
    const gapWithPdr = recurringAgency - totalFixedWithPdr;

    // ───── 5. Card "Investimenti?" — riuso pattern dashboard-ceo ─────
    // Burn mensile medio: media degli ultimi 3 mesi (transactions reali, escl. transfer e split-figlie)
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().slice(0, 10);
    const txsLast3Months = txsForBalance.filter(
      (t) => t.date >= threeMonthsAgoStr && !t.isTransfer && t.amount < 0 && t.linkedTransactionId == null,
    );
    const totalSpent3Months = txsLast3Months.reduce((s, t) => s - t.amount, 0);
    const monthlyBurn = Math.round(totalSpent3Months / 3);
    const dailyBurn = monthlyBurn / 30.4;
    const runwayDays = dailyBurn > 0 ? Math.round(currentBalance / dailyBurn) : 9999;
    const safetyTarget = monthlyBurn * 3; // 90gg di sicurezza
    const surplus = currentBalance - safetyTarget;

    return NextResponse.json({
      year,
      month,
      today: todayStr,
      // Card 1
      monthSoFar: {
        invoicedNet: invoicedNetToDate,
        soci: sociToDate,
        agency: agencyToDate,
        spent: spentToDate,
        balance: monthBalance,
      },
      // Card 2
      breakEven: {
        expensesMonthTotal,
        agencyToDate,
        agencyMissing,
        netToInvoice,
        reached: breakEvenReached,
      },
      // Card 3
      recurring: {
        recurringIncomeNet: recurringNet,
        recurringAgency,
        fixedStructure: fixedStructureMonthly,
        structureGap,
        pdrMonthTotal,
        gapWithPdr,
      },
      // Card 5
      investments: {
        currentBalance,
        monthlyBurn,
        runwayDays,
        safetyTarget,
        surplus,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
