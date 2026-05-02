import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentPlans, paymentPlanInstallments } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
// (eq usato per i filtri sui piani; per le rate iteriamo lato JS dato il volume basso)


/**
 * GET /api/debts-summary
 *
 * Aggregati per la pagina /debts:
 *  - totalDebt, totalPaid, totalRemaining (sui piani attivi)
 *  - next6MonthsTotal: somma rate non pagate scadute nei prossimi 6 mesi (today incluso)
 *  - lastClosureDate: data ultima rata pianificata (più lontana) fra tutti i piani attivi
 *  - overduePlanIds: piani attivi con almeno una rata `dueDate < today && !isPaid`
 */
export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const sixMonthsAhead = new Date();
    sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6);
    const sixMonthsAheadStr = sixMonthsAhead.toISOString().slice(0, 10);

    const activePlans = await db
      .select()
      .from(paymentPlans)
      .where(and(isNull(paymentPlans.deletedAt), eq(paymentPlans.isActive, true)));

    let totalDebt = 0;
    let totalPaid = 0;
    for (const p of activePlans) {
      totalDebt += p.totalAmount;
      totalPaid += (p.paidInstallments || 0) * p.installmentAmount;
    }
    const totalRemaining = totalDebt - totalPaid;

    let next6MonthsTotal = 0;
    let lastClosureDate: string | null = null;
    const overduePlanIds = new Set<number>();

    if (activePlans.length > 0) {
      const planIds = new Set(activePlans.map((p) => p.id));
      const allInstallments = await db.select().from(paymentPlanInstallments);
      for (const inst of allInstallments) {
        if (inst.paymentPlanId == null || !planIds.has(inst.paymentPlanId)) continue;
        if (!inst.isPaid && inst.dueDate >= today && inst.dueDate <= sixMonthsAheadStr) {
          next6MonthsTotal += inst.amount;
        }
        if (lastClosureDate == null || inst.dueDate > lastClosureDate) {
          lastClosureDate = inst.dueDate;
        }
        if (!inst.isPaid && inst.dueDate < today) {
          overduePlanIds.add(inst.paymentPlanId);
        }
      }
    }

    return NextResponse.json({
      today,
      totalDebt,
      totalPaid,
      totalRemaining,
      next6MonthsTotal,
      lastClosureDate,
      overduePlanIds: Array.from(overduePlanIds),
      activePlansCount: activePlans.length,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
