import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revenueCenters, expectedIncomes, transactions } from "@/lib/db/schema";
import { eq, isNull, and, gte, lte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const activeOnly = searchParams.get("active") !== "false";
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

  const whereClause = and(
    isNull(revenueCenters.deletedAt),
    activeOnly ? sql`${revenueCenters.isActive} = 1` : sql`1=1`
  );

  const centers = await db
    .select()
    .from(revenueCenters)
    .where(whereClause)
    .orderBy(revenueCenters.sortOrder, revenueCenters.name);

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const centersWithStats = await Promise.all(
    centers.map(async (center) => {
      // Conta gli incassi previsti attivi per questo centro
      const incomes = await db
        .select()
        .from(expectedIncomes)
        .where(
          and(
            eq(expectedIncomes.revenueCenterId, center.id),
            isNull(expectedIncomes.deletedAt),
            sql`${expectedIncomes.isActive} = 1`
          )
        );

      // Calcola totale annuale previsto dagli incassi
      let totalExpected = 0;
      for (const income of incomes) {
        const monthsActive = getActiveMonths(income.startDate, income.endDate, year);
        const multiplier = getFrequencyMultiplier(income.frequency, monthsActive.length);
        totalExpected += income.amount * multiplier;
      }

      // Calcola incassato dalle transazioni
      const txs = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.revenueCenterId, center.id),
            isNull(transactions.deletedAt),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate)
          )
        );

      const collected = txs.reduce((sum, tx) => sum + tx.amount, 0);

      return {
        ...center,
        totalExpected,
        collected,
        remaining: totalExpected - collected,
        expectedIncomesCount: incomes.length,
      };
    })
  );

  return NextResponse.json(centersWithStats);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { name, description, color, sortOrder = 0 } = body;

  if (!name) {
    return NextResponse.json(
      { error: "Nome obbligatorio" },
      { status: 400 }
    );
  }

  const insertResult = await db
    .insert(revenueCenters)
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

// Helper per calcolare i mesi attivi di un incasso in un anno
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

// Helper per calcolare quante volte un incasso si ripete in un anno
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
