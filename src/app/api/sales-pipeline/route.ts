import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  expectedIncomes,
  expectedIncomeOverrides,
  transactions,
  deals,
} from "@/lib/db/schema";
import { and, eq, isNull, lte, gte, or } from "drizzle-orm";
import { getMonthlyRevenueTarget, setMonthlyRevenueTarget, getSplitConfig } from "@/lib/utils/settings-server";
import { calculateSplit } from "@/lib/utils/splits";

/**
 * GET /api/sales-pipeline?year=Y&month=M
 *
 * Piano d'attacco mensile. Ritorna:
 *  - target: obiettivo lordo IVA del mese (settings)
 *  - alreadyInvoiced: realtà del mese (transactions reali a oggi, lordo)
 *  - recurringPlanned: previsti ricorrenti del mese non ancora arrivati (lordo)
 *  - oneTimePlanned: previsti one-time del mese (lordo)
 *  - totalCertain: alreadyInvoiced + recurringPlanned + oneTimePlanned
 *  - gap: target - totalCertain (quanto trovare in più; se neg → sopra target)
 *  - pipeline: trattative aperte (no won/lost) + totali (gross + pesato)
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
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10);
    const todayStr = now.toISOString().slice(0, 10);

    const monthStart = `${year}-${pad2(month)}-01`;
    const monthEnd = `${year}-${pad2(month)}-${pad2(lastDayOfMonth(year, month))}`;

    // Obiettivo
    const target = await getMonthlyRevenueTarget();
    const splitConfig = await getSplitConfig();
    const targetNet = Math.round(target / (1 + splitConfig.vatPct / 100));

    // 1. Realtà del mese (transactions amount > 0, escl. transfer + figlie split)
    const txs = await db
      .select({
        amount: transactions.amount,
        isTransfer: transactions.isTransfer,
        linkedTransactionId: transactions.linkedTransactionId,
      })
      .from(transactions)
      .where(
        and(
          isNull(transactions.deletedAt),
          gte(transactions.date, monthStart),
          lte(transactions.date, monthEnd),
        ),
      );
    let alreadyInvoiced = 0;
    for (const t of txs) {
      if (t.isTransfer) continue;
      if (t.linkedTransactionId != null) continue;
      if (t.amount > 0) alreadyInvoiced += t.amount;
    }

    // 2. Previsti del mese (residui = data >= today, non saltati)
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
    const incomeIds = incomesTpl.map((i) => i.id);
    const ovs = incomeIds.length > 0
      ? await db.select().from(expectedIncomeOverrides).where(
          and(
            eq(expectedIncomeOverrides.year, year),
            eq(expectedIncomeOverrides.month, month),
          ),
        )
      : [];
    const ovMap = new Map<number, { amount: number; day: number | null }>();
    for (const o of ovs) ovMap.set(o.expectedIncomeId, { amount: o.amount, day: o.day });

    let recurringPlanned = 0;
    let oneTimePlanned = 0;
    for (const i of incomesTpl) {
      if (!monthMatches(i.startDate, i.endDate, i.frequency, year, month)) continue;
      const ov = ovMap.get(i.id);
      const dayBase = ov?.day ?? i.expectedDay ?? 1;
      const day = Math.min(Math.max(dayBase, 1), lastDayOfMonth(year, month));
      const date = `${year}-${pad2(month)}-${pad2(day)}`;
      // Solo residui (data >= today)
      if (date < todayStr) continue;
      const amount = ov ? ov.amount : i.amount;
      if (amount === 0) continue;
      if (i.frequency === "one_time") oneTimePlanned += amount;
      else recurringPlanned += amount;
    }

    const totalCertain = alreadyInvoiced + recurringPlanned + oneTimePlanned;
    const gap = target - totalCertain;

    // 3. Pipeline aperta (no won/lost)
    const dealsRows = await db
      .select()
      .from(deals)
      .where(isNull(deals.deletedAt));
    const openDeals = dealsRows.filter((d) => d.stage !== "won" && d.stage !== "lost");
    const pipelineGross = openDeals.reduce((s, d) => s + d.valueCents, 0);
    const pipelineWeighted = openDeals.reduce(
      (s, d) => s + Math.round(d.valueCents * (d.probabilityPct / 100)),
      0,
    );

    // Equivalente netto del totalCertain (per affiancare al target netto)
    const certainSplit = calculateSplit(totalCertain, splitConfig);

    return NextResponse.json({
      year, month,
      target,                       // lordo IVA
      targetNet,                    // netto stimato
      alreadyInvoiced,              // realtà a oggi (lordo)
      recurringPlanned,             // ricorrenti residui (lordo)
      oneTimePlanned,               // one-time residui (lordo)
      totalCertain,                 // somma di sopra
      totalCertainNet: certainSplit.netAmount,
      gap,                          // > 0 = ancora da trovare
      pipelineGross,                // somma lordo trattative aperte
      pipelineWeighted,             // somma pesata × probabilità
      pipelineCount: openDeals.length,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * PUT /api/sales-pipeline  body: { target: cents }
 * Aggiorna l'obiettivo mensile.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = await setMonthlyRevenueTarget(Number(body?.target));
    return NextResponse.json({ target: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
