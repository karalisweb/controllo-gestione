import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  expectedIncomes,
  expectedIncomeOverrides,
  transactions,
  deals,
  monthlyRevenueTargetOverrides,
} from "@/lib/db/schema";
import { and, eq, isNull, lte, gte, or } from "drizzle-orm";
import { getMonthlyRevenueTarget, setMonthlyRevenueTarget } from "@/lib/utils/settings-server";

/**
 * GET /api/sales-pipeline/yearly?year=Y
 *
 * Per ogni mese di Y ritorna: target (default o override), alreadyInvoiced,
 * recurringPlanned, oneTimePlanned, totalCertain, gap, pipelineWeighted.
 * Le trattative aperte sono assegnate al mese di expectedCloseDate; se NULL
 * vanno in `unassignedPipeline`.
 *
 * POST/DELETE su questo endpoint: vedi sotto per gli override.
 */
function pad2(n: number): string { return String(n).padStart(2, "0"); }
function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
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
    if (targetYM > ey * 12 + (em - 1)) return false;
  }
  const fromStart = targetYM - startYM;
  switch (frequency) {
    case "monthly": return true;
    case "quarterly": return fromStart % 3 === 0;
    case "semiannual": return fromStart % 6 === 0;
    case "annual":
    case "one_time": return fromStart % 12 === 0;
    default: return fromStart === 0;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);
    const todayStr = now.toISOString().slice(0, 10);

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const defaultTarget = await getMonthlyRevenueTarget();

    // 1. Override target del mese
    const overrides = await db
      .select()
      .from(monthlyRevenueTargetOverrides)
      .where(eq(monthlyRevenueTargetOverrides.year, year));
    const targetByMonth = new Map<number, number>();
    for (const o of overrides) targetByMonth.set(o.month, o.amountCents);

    // 2. Tutte le transactions dell'anno (per "già fatturato")
    const txs = await db
      .select({
        date: transactions.date,
        amount: transactions.amount,
        isTransfer: transactions.isTransfer,
        linkedTransactionId: transactions.linkedTransactionId,
      })
      .from(transactions)
      .where(
        and(
          isNull(transactions.deletedAt),
          gte(transactions.date, yearStart),
          lte(transactions.date, yearEnd),
        ),
      );
    const invoicedByMonth = new Array(12).fill(0);
    for (const t of txs) {
      if (t.isTransfer) continue;
      if (t.linkedTransactionId != null) continue;
      if (t.amount <= 0) continue;
      const m = parseInt(t.date.slice(5, 7), 10) - 1;
      invoicedByMonth[m] += t.amount;
    }

    // 3. Expected incomes attivi nell'anno
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
    const incomeIds = incomesTpl.map((i) => i.id);
    const incOvAll = incomeIds.length > 0
      ? await db.select().from(expectedIncomeOverrides).where(eq(expectedIncomeOverrides.year, year))
      : [];
    const incOvMap = new Map<string, { amount: number; day: number | null }>();
    for (const o of incOvAll) incOvMap.set(`${o.expectedIncomeId}-${o.month}`, { amount: o.amount, day: o.day });

    // Per ogni mese, somma previsti residui (data >= today)
    const recurringByMonth = new Array(12).fill(0);
    const oneTimeByMonth = new Array(12).fill(0);
    for (let m = 1; m <= 12; m++) {
      for (const i of incomesTpl) {
        if (!monthMatches(i.startDate, i.endDate, i.frequency, year, m)) continue;
        const ov = incOvMap.get(`${i.id}-${m}`);
        const dayBase = ov?.day ?? i.expectedDay ?? 1;
        const day = Math.min(Math.max(dayBase, 1), lastDayOfMonth(year, m));
        const date = `${year}-${pad2(m)}-${pad2(day)}`;
        if (date < todayStr) continue;
        const amount = ov ? ov.amount : i.amount;
        if (amount === 0) continue;
        if (i.frequency === "one_time") oneTimeByMonth[m - 1] += amount;
        else recurringByMonth[m - 1] += amount;
      }
    }

    // 4. Pipeline pesata per mese (deals open con expectedCloseDate)
    const dealsRows = await db
      .select()
      .from(deals)
      .where(isNull(deals.deletedAt));
    const openDeals = dealsRows.filter((d) => d.stage !== "won" && d.stage !== "lost");
    const pipelineWeightedByMonth = new Array(12).fill(0);
    let unassignedPipelineGross = 0;
    let unassignedPipelineWeighted = 0;
    for (const d of openDeals) {
      const weighted = Math.round(d.valueCents * d.probabilityPct / 100);
      if (!d.expectedCloseDate) {
        unassignedPipelineGross += d.valueCents;
        unassignedPipelineWeighted += weighted;
        continue;
      }
      const [dy, dm] = d.expectedCloseDate.split("-").map(Number);
      if (dy !== year || dm < 1 || dm > 12) {
        // fuori dall'anno: tratto come unassigned per questo anno
        unassignedPipelineGross += d.valueCents;
        unassignedPipelineWeighted += weighted;
        continue;
      }
      pipelineWeightedByMonth[dm - 1] += weighted;
    }

    // 5. Monta il risultato
    const months = Array.from({ length: 12 }, (_, idx) => {
      const m = idx + 1;
      const target = targetByMonth.get(m) ?? defaultTarget;
      const alreadyInvoiced = invoicedByMonth[idx];
      const recurringPlanned = recurringByMonth[idx];
      const oneTimePlanned = oneTimeByMonth[idx];
      const totalCertain = alreadyInvoiced + recurringPlanned + oneTimePlanned;
      const gap = target - totalCertain;
      const pipelineWeighted = pipelineWeightedByMonth[idx];
      const isOverride = targetByMonth.has(m);
      return {
        month: m,
        target,
        targetIsOverride: isOverride,
        alreadyInvoiced,
        recurringPlanned,
        oneTimePlanned,
        totalCertain,
        gap,
        pipelineWeighted,
      };
    });

    const totals = months.reduce(
      (acc, m) => ({
        target: acc.target + m.target,
        alreadyInvoiced: acc.alreadyInvoiced + m.alreadyInvoiced,
        recurringPlanned: acc.recurringPlanned + m.recurringPlanned,
        oneTimePlanned: acc.oneTimePlanned + m.oneTimePlanned,
        totalCertain: acc.totalCertain + m.totalCertain,
        gap: acc.gap + m.gap,
        pipelineWeighted: acc.pipelineWeighted + m.pipelineWeighted,
      }),
      { target: 0, alreadyInvoiced: 0, recurringPlanned: 0, oneTimePlanned: 0, totalCertain: 0, gap: 0, pipelineWeighted: 0 },
    );

    return NextResponse.json({
      year,
      defaultTarget,
      months,
      totals,
      unassignedPipelineGross,
      unassignedPipelineWeighted,
      currentMonth: now.getMonth() + 1,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/sales-pipeline/yearly
 * Body: { year, month, amountCents }
 * Upsert dell'override target per (year, month). Se amountCents === default → cancella.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const year = Number(body?.year);
    const month = Number(body?.month);
    const amountCents = Number(body?.amountCents);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Anno non valido" }, { status: 400 });
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Mese non valido" }, { status: 400 });
    }
    if (!Number.isFinite(amountCents) || amountCents < 0) {
      return NextResponse.json({ error: "Importo non valido" }, { status: 400 });
    }
    const cents = Math.round(amountCents);
    const defaultTarget = await getMonthlyRevenueTarget();

    const existing = await db
      .select()
      .from(monthlyRevenueTargetOverrides)
      .where(and(
        eq(monthlyRevenueTargetOverrides.year, year),
        eq(monthlyRevenueTargetOverrides.month, month),
      ))
      .limit(1);

    // Se torna al default, elimina l'override
    if (cents === defaultTarget) {
      if (existing.length > 0) {
        await db.delete(monthlyRevenueTargetOverrides).where(eq(monthlyRevenueTargetOverrides.id, existing[0].id));
      }
      return NextResponse.json({ action: "cleared", amount: defaultTarget });
    }

    if (existing.length > 0) {
      const [updated] = await db
        .update(monthlyRevenueTargetOverrides)
        .set({ amountCents: cents, updatedAt: new Date() })
        .where(eq(monthlyRevenueTargetOverrides.id, existing[0].id))
        .returning();
      return NextResponse.json({ action: "updated", row: updated });
    }
    const [created] = await db
      .insert(monthlyRevenueTargetOverrides)
      .values({ year, month, amountCents: cents })
      .returning();
    return NextResponse.json({ action: "created", row: created });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * PUT /api/sales-pipeline/yearly  body: { defaultTarget }
 * Aggiorna l'obiettivo default in settings.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = await setMonthlyRevenueTarget(Number(body?.defaultTarget));
    return NextResponse.json({ defaultTarget: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
