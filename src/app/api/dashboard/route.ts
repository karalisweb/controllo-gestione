import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  budgetItems,
  transactions,
  incomeSplits,
  paymentPlans,
  paymentPlanInstallments,
} from "@/lib/db/schema";
import { eq, and, isNull, gte, lte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const year = parseInt(searchParams.get("year") || "2026");

  // 1. Budget items per mese
  const budget = await db
    .select()
    .from(budgetItems)
    .where(and(isNull(budgetItems.deletedAt), eq(budgetItems.year, year)));

  // 2. Transazioni dell'anno
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const txs = await db
    .select()
    .from(transactions)
    .where(
      and(
        isNull(transactions.deletedAt),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  // 3. Ripartizioni
  const splits = await db.select().from(incomeSplits);

  // 4. Piani di rientro attivi
  const plans = await db
    .select()
    .from(paymentPlans)
    .where(
      and(isNull(paymentPlans.deletedAt), eq(paymentPlans.isActive, true))
    );

  // 5. Prossime rate in scadenza
  const today = new Date().toISOString().split("T")[0];
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthStr = nextMonth.toISOString().split("T")[0];

  const upcomingInstallments = await db
    .select({
      id: paymentPlanInstallments.id,
      dueDate: paymentPlanInstallments.dueDate,
      amount: paymentPlanInstallments.amount,
      isPaid: paymentPlanInstallments.isPaid,
      planId: paymentPlanInstallments.paymentPlanId,
      creditorName: paymentPlans.creditorName,
    })
    .from(paymentPlanInstallments)
    .innerJoin(
      paymentPlans,
      eq(paymentPlanInstallments.paymentPlanId, paymentPlans.id)
    )
    .where(
      and(
        eq(paymentPlanInstallments.isPaid, false),
        gte(paymentPlanInstallments.dueDate, today),
        lte(paymentPlanInstallments.dueDate, nextMonthStr)
      )
    )
    .orderBy(paymentPlanInstallments.dueDate)
    .limit(5);

  // Calcola dati mensili dal budget
  const monthlyBudget = Array.from({ length: 12 }, (_, i) => {
    const monthItems = budget.filter((item) => item.month === i + 1);
    const income = monthItems
      .filter((item) => item.amount >= 0)
      .reduce((sum, item) => sum + item.amount, 0);
    const expense = monthItems
      .filter((item) => item.amount < 0)
      .reduce((sum, item) => sum + item.amount, 0);
    return {
      month: i + 1,
      income,
      expense,
      balance: income + expense,
    };
  });

  // Calcola dati mensili dalle transazioni reali
  const monthlyActual = Array.from({ length: 12 }, (_, i) => {
    const monthTxs = txs.filter((tx) => {
      const txMonth = new Date(tx.date).getMonth();
      return txMonth === i;
    });
    const income = monthTxs
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expense = monthTxs
      .filter((tx) => tx.amount < 0)
      .reduce((sum, tx) => sum + tx.amount, 0);
    return {
      month: i + 1,
      income,
      expense,
      balance: income + expense,
    };
  });

  // Totali
  const totals = {
    budget: {
      income: budget.filter((i) => i.amount >= 0).reduce((s, i) => s + i.amount, 0),
      expense: budget.filter((i) => i.amount < 0).reduce((s, i) => s + i.amount, 0),
    },
    actual: {
      income: txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
      expense: txs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0),
    },
    splits: {
      total: splits.reduce((s, sp) => s + sp.grossAmount, 0),
      daniela: splits.reduce((s, sp) => s + sp.danielaAmount, 0),
      alessio: splits.reduce((s, sp) => s + sp.alessioAmount, 0),
      agency: splits.reduce((s, sp) => s + sp.agencyAmount, 0),
      vat: splits.reduce((s, sp) => s + sp.vatAmount, 0),
    },
    debt: {
      total: plans.reduce((s, p) => s + p.totalAmount, 0),
      remaining: plans.reduce(
        (s, p) => s + p.totalAmount - (p.paidInstallments || 0) * p.installmentAmount,
        0
      ),
    },
  };

  return NextResponse.json({
    year,
    monthlyBudget,
    monthlyActual,
    totals,
    splits,
    upcomingInstallments,
    plansCount: plans.length,
  });
}
