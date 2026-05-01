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
} from "@/lib/db/schema";
import { and, eq, isNull, lte, gte, or } from "drizzle-orm";
import { calculateSplit } from "@/lib/utils/splits";
import { getSplitConfig, getAgencyMonthlyHours } from "@/lib/utils/settings-server";

/**
 * GET /api/yearly?year=YYYY
 *
 * Sintesi 12 mesi dell'anno: per ogni mese aggrega
 *   incassato, costi, saldo (delta del mese), Alessio, IVA.
 *
 * Convenzione:
 *  - mesi passati: solo realtà (transactions confermate)
 *  - mesi corrente/futuri: realtà parziali + previsti residui (incl. rate PDR)
 *  - "isPartial=true" se l'ultimo giorno del mese > oggi
 *
 * Costi: somma uscite reali (escluse isTransfer + linkedTransactionId != null)
 *        + previsti spese residui + rate PDR del mese.
 *        Esclude i giroconti soci+IVA generati dallo split.
 *
 * Costo orario fisso: media mensile dei template expected_expenses ricorrenti
 *        (frequency != "one_time", isActive, !deletedAt) / monte ore configurato.
 */

interface MonthRow {
  month: number; // 1-12
  income: number; // centesimi
  expenses: number; // centesimi (positivi)
  balance: number; // income - expenses
  alessio: number;
  iva: number;
  isPartial: boolean;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Replica di monthMatches() da /api/movements (logica frequency)
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
    case "monthly":
      return true;
    case "quarterly":
      return monthsFromStart % 3 === 0;
    case "semiannual":
      return monthsFromStart % 6 === 0;
    case "annual":
    case "one_time":
      return monthsFromStart % 12 === 0;
    default:
      return monthsFromStart === 0;
  }
}

// Quante volte un template ricorrente accade in un anno (per il costo orario fisso medio)
function occurrencesPerYear(frequency: string): number {
  switch (frequency) {
    case "monthly": return 12;
    case "quarterly": return 4;
    case "semiannual": return 2;
    case "annual": return 1;
    default: return 0;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Anno non valido" }, { status: 400 });
    }
    const today = new Date().toISOString().slice(0, 10);

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    // ───── 1. Carica realtà dell'anno (transactions) ─────
    const txs = await db
      .select({
        date: transactions.date,
        amount: transactions.amount,
        isTransfer: transactions.isTransfer,
        linkedTransactionId: transactions.linkedTransactionId,
        id: transactions.id,
      })
      .from(transactions)
      .where(
        and(
          isNull(transactions.deletedAt),
          gte(transactions.date, yearStart),
          lte(transactions.date, yearEnd),
        ),
      );

    // incomeSplits dell'anno (per Alessio/IVA realizzati)
    const splits = await db
      .select({
        transactionId: incomeSplits.transactionId,
        vatAmount: incomeSplits.vatAmount,
        alessioAmount: incomeSplits.alessioAmount,
        date: transactions.date,
      })
      .from(incomeSplits)
      .innerJoin(transactions, eq(incomeSplits.transactionId, transactions.id))
      .where(
        and(
          isNull(transactions.deletedAt),
          gte(transactions.date, yearStart),
          lte(transactions.date, yearEnd),
        ),
      );

    // ───── 2. Carica template attivi nell'anno ─────
    const expensesTpl = await db
      .select()
      .from(expectedExpenses)
      .where(
        and(
          isNull(expectedExpenses.deletedAt),
          eq(expectedExpenses.isActive, true),
          lte(expectedExpenses.startDate, yearEnd),
          or(isNull(expectedExpenses.endDate), gte(expectedExpenses.endDate, yearStart)),
        ),
      );
    const incomesTpl = await db
      .select()
      .from(expectedIncomes)
      .where(
        and(
          isNull(expectedIncomes.deletedAt),
          eq(expectedIncomes.isActive, true),
          lte(expectedIncomes.startDate, yearEnd),
          or(isNull(expectedIncomes.endDate), gte(expectedIncomes.endDate, yearStart)),
        ),
      );

    // Override mensili dell'anno
    const expOvAll = expensesTpl.length > 0
      ? await db
          .select()
          .from(expectedExpenseOverrides)
          .where(eq(expectedExpenseOverrides.year, year))
      : [];
    const incOvAll = incomesTpl.length > 0
      ? await db
          .select()
          .from(expectedIncomeOverrides)
          .where(eq(expectedIncomeOverrides.year, year))
      : [];
    const expOvMap = new Map<string, number>(); // `${id}-${month}` → amount
    for (const o of expOvAll) expOvMap.set(`${o.expectedExpenseId}-${o.month}`, o.amount);
    const incOvMap = new Map<string, number>();
    for (const o of incOvAll) incOvMap.set(`${o.expectedIncomeId}-${o.month}`, o.amount);

    // ───── 3. Rate PDR dell'anno (incluse pagate per il mese di pagamento) ─────
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
          gte(paymentPlanInstallments.dueDate, yearStart),
          lte(paymentPlanInstallments.dueDate, yearEnd),
          isNull(paymentPlans.deletedAt),
          eq(paymentPlans.isActive, true),
        ),
      );

    // ───── 4. Config split (per Alessio/IVA previsti) ─────
    const splitConfig = await getSplitConfig();

    // ───── 5. Calcola per ogni mese ─────
    const months: MonthRow[] = [];
    for (let m = 1; m <= 12; m++) {
      const monthStart = `${year}-${pad2(m)}-01`;
      const monthEnd = `${year}-${pad2(m)}-${pad2(lastDayOfMonth(year, m))}`;
      const isPartial = monthEnd >= today;

      // Realtà del mese
      let income = 0;
      let expenses = 0; // valore positivo (somma di |amount|)
      for (const t of txs) {
        if (t.date < monthStart || t.date > monthEnd) continue;
        if (t.isTransfer) continue; // vecchie figlie split
        if (t.amount > 0) {
          income += t.amount;
        } else {
          // Esclude giroconti soci+IVA (linkedTransactionId NOT NULL = riga split)
          if (t.linkedTransactionId == null) {
            expenses += -t.amount;
          }
        }
      }

      // Realtà split (Alessio/IVA realizzati)
      let alessio = 0;
      let iva = 0;
      for (const s of splits) {
        if (s.date < monthStart || s.date > monthEnd) continue;
        alessio += s.alessioAmount;
        iva += s.vatAmount;
      }

      // Previsti residui (solo per data >= today)
      // Spese template
      for (const e of expensesTpl) {
        if (!monthMatches(e.startDate, e.endDate, e.frequency, year, m)) continue;
        const day = Math.min(Math.max(e.expectedDay || 1, 1), lastDayOfMonth(year, m));
        const date = `${year}-${pad2(m)}-${pad2(day)}`;
        if (date < today) continue; // passato già nelle realtà
        const overrideAmount = expOvMap.get(`${e.id}-${m}`);
        const amount = overrideAmount !== undefined ? overrideAmount : e.amount;
        if (amount === 0) continue;
        expenses += amount;
      }
      // Incassi template
      for (const i of incomesTpl) {
        if (!monthMatches(i.startDate, i.endDate, i.frequency, year, m)) continue;
        const day = Math.min(Math.max(i.expectedDay || 1, 1), lastDayOfMonth(year, m));
        const date = `${year}-${pad2(m)}-${pad2(day)}`;
        if (date < today) continue;
        const overrideAmount = incOvMap.get(`${i.id}-${m}`);
        const amount = overrideAmount !== undefined ? overrideAmount : i.amount;
        if (amount === 0) continue;
        income += amount;
        // Alessio/IVA previsti se autoSplit attivo
        if (i.autoSplit) {
          const effectiveConfig = i.autoSplitNoVat ? { ...splitConfig, vatPct: 0 } : splitConfig;
          const split = calculateSplit(amount, effectiveConfig);
          alessio += split.alessioAmount;
          iva += split.vatAmount;
        }
      }

      // Rate PDR del mese (escluse pagate del passato — il loro impatto è già nelle txs)
      for (const inst of installments) {
        if (inst.dueDate < monthStart || inst.dueDate > monthEnd) continue;
        if (inst.isPaid && inst.transactionId) continue; // già contata nelle realtà
        if (!inst.isPaid && inst.dueDate < today) continue; // passato non pagato: escluso (allineato a /api/movements)
        expenses += inst.amount;
      }

      months.push({
        month: m,
        income,
        expenses,
        balance: income - expenses,
        alessio,
        iva,
        isPartial,
      });
    }

    // ───── 6. Totali e medie ─────
    const totals = months.reduce(
      (acc, r) => ({
        income: acc.income + r.income,
        expenses: acc.expenses + r.expenses,
        balance: acc.balance + r.balance,
        alessio: acc.alessio + r.alessio,
        iva: acc.iva + r.iva,
      }),
      { income: 0, expenses: 0, balance: 0, alessio: 0, iva: 0 },
    );
    const averages = {
      income: Math.round(totals.income / 12),
      expenses: Math.round(totals.expenses / 12),
      balance: Math.round(totals.balance / 12),
      alessio: Math.round(totals.alessio / 12),
      iva: Math.round(totals.iva / 12),
    };

    // ───── 7. Costo orario fisso d'agenzia ─────
    // Media mensile dei template expected_expenses ricorrenti, esclusi one_time.
    // Esempio: template trimestrale da 600 → 600 × 4 / 12 = 200/mese.
    let fixedMonthlyCosts = 0;
    for (const e of expensesTpl) {
      const occ = occurrencesPerYear(e.frequency);
      if (occ === 0) continue; // one_time o sconosciuti
      fixedMonthlyCosts += (e.amount * occ) / 12;
    }
    fixedMonthlyCosts = Math.round(fixedMonthlyCosts);
    const monthlyHours = await getAgencyMonthlyHours();
    const fixedHourlyCost = monthlyHours > 0 ? Math.round(fixedMonthlyCosts / monthlyHours) : 0;

    return NextResponse.json({
      year,
      months,
      totals,
      averages,
      fixedMonthlyCosts,
      monthlyHours,
      fixedHourlyCost, // centesimi/ora (es. 3388 = 33,88 €/h)
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
