import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  expectedExpenses,
  expectedExpenseOverrides,
  expectedIncomes,
  expectedIncomeOverrides,
  paymentPlans,
  paymentPlanInstallments,
  salesOpportunities,
  settings,
} from "@/lib/db/schema";
import { and, eq, isNull, lte, gte, or, inArray } from "drizzle-orm";
import { calculateSplit } from "@/lib/utils/splits";
import { getSplitConfig } from "@/lib/utils/settings-server";

const DEFAULT_TARGET_CENTS = 1_000_000; // 10.000,00 €

function pad2(n: number): string { return String(n).padStart(2, "0"); }

function monthMatches(
  startDate: string, endDate: string | null, frequency: string,
  year: number, month: number,
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

interface MonthForecast {
  year: number;
  month: number;
  label: string;
  target: number;
  revenuePrev: number;
  gap: number;
  expensePrev: number;
  earningsPrev: number;     // agency da revenuePrev - expensePrev
  earningsTarget: number;   // agency da target - expensePrev
  alessioPrev: number;
  danielaPrev: number;
}

const MONTH_LABELS = [
  "Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic",
];

export async function GET(request: NextRequest) {
  try {
    const months = Math.max(1, Math.min(12, parseInt(request.nextUrl.searchParams.get("months") || "4", 10)));
    const yearParam = request.nextUrl.searchParams.get("year");
    const monthParam = request.nextUrl.searchParams.get("month");
    const today = new Date();
    const startY = yearParam ? parseInt(yearParam, 10) : today.getFullYear();
    const startM = monthParam ? parseInt(monthParam, 10) : today.getMonth() + 1;

    // Calcola lista (year, month) per i prossimi N mesi
    const list: { year: number; month: number }[] = [];
    let cy = startY, cm = startM;
    for (let i = 0; i < months; i++) {
      list.push({ year: cy, month: cm });
      cm++;
      if (cm > 12) { cm = 1; cy++; }
    }

    // Carica settings (target default + per-mese)
    const settingsRows = await db.select().from(settings);
    const settingsMap = new Map(settingsRows.map((r) => [r.key, r.value]));
    const defaultTarget = parseInt(settingsMap.get("sales_target_default") ?? String(DEFAULT_TARGET_CENTS), 10);

    const splitConfig = await getSplitConfig();

    // Carica expected_* attivi nel range [startY-startM, ultimo mese richiesto]
    const lastEntry = list[list.length - 1];
    const lastDayOfRange = new Date(Date.UTC(lastEntry.year, lastEntry.month, 0));
    const lastDateOfRange = `${lastEntry.year}-${pad2(lastEntry.month)}-${pad2(lastDayOfRange.getUTCDate())}`;
    const firstOfFirstMonth = `${startY}-${pad2(startM)}-01`;

    const allExpenses = await db
      .select()
      .from(expectedExpenses)
      .where(
        and(
          isNull(expectedExpenses.deletedAt),
          eq(expectedExpenses.isActive, true),
          lte(expectedExpenses.startDate, lastDateOfRange),
          or(isNull(expectedExpenses.endDate), gte(expectedExpenses.endDate, firstOfFirstMonth)),
        ),
      );
    const allIncomes = await db
      .select()
      .from(expectedIncomes)
      .where(
        and(
          isNull(expectedIncomes.deletedAt),
          eq(expectedIncomes.isActive, true),
          lte(expectedIncomes.startDate, lastDateOfRange),
          or(isNull(expectedIncomes.endDate), gte(expectedIncomes.endDate, firstOfFirstMonth)),
        ),
      );

    // Overrides per i mesi richiesti
    const expIds = allExpenses.map((e) => e.id);
    const incIds = allIncomes.map((i) => i.id);
    const expOverrides = expIds.length > 0
      ? await db.select().from(expectedExpenseOverrides).where(inArray(expectedExpenseOverrides.expectedExpenseId, expIds))
      : [];
    const incOverrides = incIds.length > 0
      ? await db.select().from(expectedIncomeOverrides).where(inArray(expectedIncomeOverrides.expectedIncomeId, incIds))
      : [];
    const expOvKey = (id: number, y: number, m: number) => `${id}-${y}-${m}`;
    const expOvMap = new Map<string, number>(expOverrides.map((o) => [expOvKey(o.expectedExpenseId, o.year, o.month), o.amount]));
    const incOvMap = new Map<string, number>(incOverrides.map((o) => [expOvKey(o.expectedIncomeId, o.year, o.month), o.amount]));

    // Sales opportunities per i mesi richiesti (won + opportunity)
    const allSales = await db
      .select()
      .from(salesOpportunities)
      .where(
        and(
          isNull(salesOpportunities.deletedAt),
          gte(salesOpportunities.year, startY),
          lte(salesOpportunities.year, lastEntry.year),
        ),
      );

    // Rate PDR non pagate dei piani attivi
    const allInstallments = await db
      .select({
        amount: paymentPlanInstallments.amount,
        dueDate: paymentPlanInstallments.dueDate,
        isPaid: paymentPlanInstallments.isPaid,
        planActive: paymentPlans.isActive,
        planDeleted: paymentPlans.deletedAt,
      })
      .from(paymentPlanInstallments)
      .leftJoin(paymentPlans, eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id))
      .where(
        and(
          gte(paymentPlanInstallments.dueDate, firstOfFirstMonth),
          lte(paymentPlanInstallments.dueDate, lastDateOfRange),
        ),
      );

    const result: MonthForecast[] = list.map(({ year, month }) => {
      const firstOfMonth = `${year}-${pad2(month)}-01`;
      const lastDayOfMonth = new Date(Date.UTC(year, month, 0));
      const lastOfMonth = `${year}-${pad2(month)}-${pad2(lastDayOfMonth.getUTCDate())}`;

      // Revenue previsto: expected_incomes (con override) + sales_opportunities (won + opportunity)
      let revenuePrev = 0;
      for (const i of allIncomes) {
        if (!monthMatches(i.startDate, i.endDate, i.frequency, year, month)) continue;
        const ov = incOvMap.get(expOvKey(i.id, year, month));
        const amt = ov !== undefined ? ov : i.amount;
        if (amt === 0) continue;
        revenuePrev += amt;
      }
      for (const s of allSales) {
        if (s.year !== year || s.month !== month) continue;
        if (s.status !== "won" && s.status !== "opportunity") continue;
        revenuePrev += s.totalAmount;
      }

      // Spese previste: expected_expenses (con override) + rate PDR non pagate (piani attivi)
      let expensePrev = 0;
      for (const e of allExpenses) {
        if (!monthMatches(e.startDate, e.endDate, e.frequency, year, month)) continue;
        const ov = expOvMap.get(expOvKey(e.id, year, month));
        const amt = ov !== undefined ? ov : e.amount;
        if (amt === 0) continue;
        expensePrev += amt;
      }
      for (const inst of allInstallments) {
        if (inst.isPaid) continue;
        if (inst.planActive === false || inst.planDeleted !== null) continue;
        if (inst.dueDate < firstOfMonth || inst.dueDate > lastOfMonth) continue;
        expensePrev += inst.amount;
      }

      // Target del mese: setting per-mese o default
      const monthKey = `sales_target_${year}_${month}`;
      const targetStr = settingsMap.get(monthKey);
      const target = targetStr ? parseInt(targetStr, 10) : defaultTarget;

      const gap = Math.max(0, target - revenuePrev);

      // Split applicato a revenuePrev e a target (per guadagni)
      const splitPrev = calculateSplit(revenuePrev, splitConfig);
      const splitTarget = calculateSplit(target, splitConfig);

      const earningsPrev = splitPrev.agencyAmount - expensePrev;
      const earningsTarget = splitTarget.agencyAmount - expensePrev;

      return {
        year, month,
        label: `${MONTH_LABELS[month - 1]} ${year}`,
        target,
        revenuePrev,
        gap,
        expensePrev,
        earningsPrev,
        earningsTarget,
        alessioPrev: splitPrev.alessioAmount,
        danielaPrev: splitPrev.danielaAmount,
      };
    });

    return NextResponse.json({
      defaultTarget,
      months: result,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
