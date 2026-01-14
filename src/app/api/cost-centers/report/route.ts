import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { costCenters, expectedExpenses, transactions } from "@/lib/db/schema";
import { eq, isNull, and, gte, lte, asc } from "drizzle-orm";

// Helper per calcolare le occorrenze mensili di una spesa
function getMonthlyOccurrences(
  frequency: string,
  startDate: string,
  endDate: string | null,
  year: number
): number[] {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(`${year}-12-31`);
  const months: number[] = [];

  if (frequency === "monthly") {
    for (let m = 1; m <= 12; m++) {
      const checkDate = new Date(year, m - 1, 15);
      if (checkDate >= start && checkDate <= end) {
        months.push(m);
      }
    }
  } else if (frequency === "quarterly") {
    const startMonth = start.getMonth() + 1;
    for (let m = 1; m <= 12; m++) {
      const checkDate = new Date(year, m - 1, 15);
      if (checkDate >= start && checkDate <= end && (m - startMonth) % 3 === 0) {
        months.push(m);
      }
    }
  } else if (frequency === "semiannual") {
    const startMonth = start.getMonth() + 1;
    for (let m = 1; m <= 12; m++) {
      const checkDate = new Date(year, m - 1, 15);
      if (checkDate >= start && checkDate <= end && (m - startMonth) % 6 === 0) {
        months.push(m);
      }
    }
  } else if (frequency === "annual" || frequency === "one_time") {
    const startMonth = start.getMonth() + 1;
    if (start.getFullYear() === year) {
      months.push(startMonth);
    }
  }

  return months;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const activeOnly = searchParams.get("active") !== "false";

  const conditions = [isNull(costCenters.deletedAt)];
  if (activeOnly) {
    conditions.push(eq(costCenters.isActive, true));
  }

  // Prendi tutti i centri di costo
  const centers = await db
    .select()
    .from(costCenters)
    .where(and(...conditions))
    .orderBy(costCenters.sortOrder, costCenters.name);

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Per ogni centro, calcola spese previste e transazioni effettive
  const reportData = await Promise.all(
    centers.map(async (center) => {
      // Spese previste per questo centro
      const expenses = await db
        .select()
        .from(expectedExpenses)
        .where(
          and(
            eq(expectedExpenses.costCenterId, center.id),
            eq(expectedExpenses.isActive, true),
            isNull(expectedExpenses.deletedAt),
            lte(expectedExpenses.startDate, endDate)
          )
        );

      // Calcola budget mensile previsto
      const monthlyBudget: Record<number, number> = {};
      for (let m = 1; m <= 12; m++) {
        monthlyBudget[m] = 0;
      }

      let totalExpected = 0;
      for (const expense of expenses) {
        const occurrences = getMonthlyOccurrences(
          expense.frequency,
          expense.startDate,
          expense.endDate,
          year
        );
        for (const month of occurrences) {
          monthlyBudget[month] += expense.amount;
          totalExpected += expense.amount;
        }
      }

      // Transazioni effettive del centro nell'anno
      const txs = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.costCenterId, center.id),
            isNull(transactions.deletedAt),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate)
          )
        )
        .orderBy(asc(transactions.date));

      // Raggruppa speso per mese
      const monthlySpent: Record<number, number> = {};
      for (let m = 1; m <= 12; m++) {
        monthlySpent[m] = 0;
      }

      let firstPaymentDate: string | null = null;
      let lastPaymentDate: string | null = null;

      txs.forEach((tx) => {
        const month = parseInt(tx.date.split("-")[1]);
        monthlySpent[month] += Math.abs(tx.amount);

        if (!firstPaymentDate || tx.date < firstPaymentDate) {
          firstPaymentDate = tx.date;
        }
        if (!lastPaymentDate || tx.date > lastPaymentDate) {
          lastPaymentDate = tx.date;
        }
      });

      const totalSpent = Object.values(monthlySpent).reduce((sum, val) => sum + val, 0);

      return {
        id: center.id,
        name: center.name,
        description: center.description,
        color: center.color,
        expectedExpensesCount: expenses.length,
        monthlyBudget,
        monthlySpent,
        totalExpected,
        totalSpent,
        variance: totalExpected - totalSpent,
        firstPaymentDate,
        lastPaymentDate,
        transactionCount: txs.length,
      };
    })
  );

  // Calcola totali per mese
  const monthlyBudgetTotals: Record<number, number> = {};
  const monthlySpentTotals: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) {
    monthlyBudgetTotals[m] = reportData.reduce((sum, center) => sum + center.monthlyBudget[m], 0);
    monthlySpentTotals[m] = reportData.reduce((sum, center) => sum + center.monthlySpent[m], 0);
  }

  const totalExpected = reportData.reduce((sum, center) => sum + center.totalExpected, 0);
  const totalSpent = reportData.reduce((sum, center) => sum + center.totalSpent, 0);

  return NextResponse.json({
    year,
    centers: reportData,
    monthlyBudgetTotals,
    monthlySpentTotals,
    totalExpected,
    totalSpent,
    variance: totalExpected - totalSpent,
  });
}
