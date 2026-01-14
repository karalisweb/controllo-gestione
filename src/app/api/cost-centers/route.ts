import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { costCenters, expectedExpenses, transactions } from "@/lib/db/schema";
import { eq, isNull, and, gte, lte, sql, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const activeOnly = searchParams.get("active") !== "false";
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

  const conditions = [isNull(costCenters.deletedAt)];
  if (activeOnly) {
    conditions.push(eq(costCenters.isActive, true));
  }

  const centers = await db
    .select()
    .from(costCenters)
    .where(and(...conditions))
    .orderBy(costCenters.sortOrder, costCenters.name);

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Calcola totali per ogni centro
  const centersWithStats = await Promise.all(
    centers.map(async (center) => {
      // Conta spese previste associate a questo centro
      const expenses = await db
        .select()
        .from(expectedExpenses)
        .where(
          and(
            eq(expectedExpenses.costCenterId, center.id),
            isNull(expectedExpenses.deletedAt),
            sql`${expectedExpenses.isActive} = 1`,
            lte(expectedExpenses.startDate, endDate),
            or(
              isNull(expectedExpenses.endDate),
              gte(expectedExpenses.endDate, startDate)
            )
          )
        );

      // Calcola totale annuale previsto
      let totalExpected = 0;
      for (const expense of expenses) {
        const monthsActive = getActiveMonths(expense.startDate, expense.endDate, year);
        const multiplier = getFrequencyMultiplier(expense.frequency, monthsActive.length);
        totalExpected += expense.amount * multiplier;
      }

      // Calcola speso da transazioni
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
        );

      const spent = txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

      return {
        ...center,
        totalExpected,
        spent,
        remaining: totalExpected - spent,
        expectedExpensesCount: expenses.length,
        transactionCount: txs.length,
      };
    })
  );

  return NextResponse.json(centersWithStats);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    name,
    description,
    color,
    sortOrder = 0,
  } = body;

  if (!name) {
    return NextResponse.json(
      { error: "Nome è obbligatorio" },
      { status: 400 }
    );
  }

  const insertResult = await db
    .insert(costCenters)
    .values({
      name,
      description: description || null,
      color: color || null,
      sortOrder,
      isActive: true,
    })
    .returning();

  const result = Array.isArray(insertResult) ? insertResult[0] : null;
  return NextResponse.json(result, { status: 201 });
}

// Helper per calcolare i mesi attivi di una spesa in un anno
function getActiveMonths(startDate: string, endDate: string | null, year: number): number[] {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(`${year}-12-31`);

  const months: number[] = [];
  for (let month = 1; month <= 12; month++) {
    const monthStart = new Date(`${year}-${String(month).padStart(2, '0')}-01`);
    const monthEnd = new Date(`${year}-${String(month).padStart(2, '0')}-28`);

    if (monthStart <= end && monthEnd >= start) {
      months.push(month);
    }
  }
  return months;
}

// Helper per calcolare quante volte una spesa si ripete in base alla frequenza
function getFrequencyMultiplier(frequency: string, activeMonthsCount: number): number {
  switch (frequency) {
    case "monthly":
      return activeMonthsCount;
    case "quarterly":
      return Math.floor(activeMonthsCount / 3);
    case "semiannual":
      return Math.floor(activeMonthsCount / 6);
    case "annual":
    case "one_time":
      return 1;
    default:
      return activeMonthsCount;
  }
}
