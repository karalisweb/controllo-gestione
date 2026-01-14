import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { revenueCenters, expectedIncomes, transactions } from "@/lib/db/schema";
import { eq, isNull, and, gte, lte, asc, or, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const activeOnly = searchParams.get("active") !== "false";

  const conditions = [isNull(revenueCenters.deletedAt)];
  if (activeOnly) {
    conditions.push(eq(revenueCenters.isActive, true));
  }

  // Prendi tutti i centri di ricavo (aggregatori)
  const centers = await db
    .select()
    .from(revenueCenters)
    .where(and(...conditions))
    .orderBy(revenueCenters.sortOrder, revenueCenters.name);

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Per ogni centro, calcola incassi per mese + totale previsto dagli expected incomes
  const reportData = await Promise.all(
    centers.map(async (center) => {
      // Tutte le transazioni del centro nell'anno
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
        )
        .orderBy(asc(transactions.date));

      // Raggruppa per mese
      const monthlyCollected: Record<number, number> = {};
      for (let m = 1; m <= 12; m++) {
        monthlyCollected[m] = 0;
      }

      let firstCollectionDate: string | null = null;
      let lastCollectionDate: string | null = null;

      txs.forEach((tx) => {
        const month = parseInt(tx.date.split("-")[1]);
        monthlyCollected[month] += tx.amount;

        if (!firstCollectionDate || tx.date < firstCollectionDate) {
          firstCollectionDate = tx.date;
        }
        if (!lastCollectionDate || tx.date > lastCollectionDate) {
          lastCollectionDate = tx.date;
        }
      });

      const totalCollected = Object.values(monthlyCollected).reduce((sum, val) => sum + val, 0);

      // Calcola totale previsto dagli incassi associati a questo centro
      const incomes = await db
        .select()
        .from(expectedIncomes)
        .where(
          and(
            eq(expectedIncomes.revenueCenterId, center.id),
            isNull(expectedIncomes.deletedAt),
            sql`${expectedIncomes.isActive} = 1`,
            lte(expectedIncomes.startDate, endDate),
            or(
              isNull(expectedIncomes.endDate),
              gte(expectedIncomes.endDate, startDate)
            )
          )
        );

      // Calcola il totale annuale previsto
      let totalExpected = 0;
      for (const income of incomes) {
        const monthsActive = getActiveMonths(income.startDate, income.endDate, year);
        const multiplier = getFrequencyMultiplier(income.frequency, monthsActive.length);
        totalExpected += income.amount * multiplier;
      }

      return {
        id: center.id,
        name: center.name,
        description: center.description,
        color: center.color,
        totalExpected,
        monthlyCollected,
        totalCollected,
        remaining: totalExpected - totalCollected,
        percentComplete: totalExpected > 0
          ? Math.round((totalCollected / totalExpected) * 100)
          : 0,
        firstCollectionDate,
        lastCollectionDate,
        transactionCount: txs.length,
        expectedIncomesCount: incomes.length,
      };
    })
  );

  // Calcola totali per mese
  const monthlyTotals: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) {
    monthlyTotals[m] = reportData.reduce((sum, center) => sum + center.monthlyCollected[m], 0);
  }

  const grandTotal = Object.values(monthlyTotals).reduce((sum, val) => sum + val, 0);
  const totalExpected = reportData.reduce((sum, center) => sum + center.totalExpected, 0);

  return NextResponse.json({
    year,
    centers: reportData,
    monthlyTotals,
    grandTotal,
    totalExpected,
    variance: grandTotal - totalExpected,
  });
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
