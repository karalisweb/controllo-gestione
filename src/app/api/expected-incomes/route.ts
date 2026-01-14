import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expectedIncomes, revenueCenters } from "@/lib/db/schema";
import { eq, isNull, and, sql, or, lte, gte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const activeOnly = searchParams.get("active") !== "false";
  const revenueCenterId = searchParams.get("revenueCenterId");
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

  let whereClause = and(
    isNull(expectedIncomes.deletedAt),
    activeOnly ? sql`${expectedIncomes.isActive} = 1` : sql`1=1`
  );

  if (revenueCenterId) {
    whereClause = and(
      whereClause,
      eq(expectedIncomes.revenueCenterId, parseInt(revenueCenterId))
    );
  }

  // Filtra per incassi attivi nell'anno
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  whereClause = and(
    whereClause,
    lte(expectedIncomes.startDate, yearEnd),
    or(
      isNull(expectedIncomes.endDate),
      gte(expectedIncomes.endDate, yearStart)
    )
  );

  const incomes = await db
    .select()
    .from(expectedIncomes)
    .where(whereClause)
    .orderBy(expectedIncomes.clientName);

  // Aggiungi il nome del centro di ricavo
  const incomesWithCenter = await Promise.all(
    incomes.map(async (income) => {
      let revenueCenter = null;
      if (income.revenueCenterId) {
        const rcArr = await db
          .select()
          .from(revenueCenters)
          .where(eq(revenueCenters.id, income.revenueCenterId));
        revenueCenter = rcArr[0] || null;
      }

      // Calcola i mesi in cui è previsto l'incasso
      const monthlyOccurrences = getMonthlyOccurrences(
        income.startDate,
        income.endDate,
        income.frequency,
        year
      );

      return {
        ...income,
        revenueCenter,
        monthlyOccurrences,
      };
    })
  );

  return NextResponse.json(incomesWithCenter);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    clientName,
    revenueCenterId,
    amount,
    frequency = "monthly",
    expectedDay = 20,
    startDate,
    endDate,
    reliability = "high",
    notes,
  } = body;

  if (!clientName || amount === undefined || !startDate) {
    return NextResponse.json(
      { error: "Cliente, importo e data inizio sono obbligatori" },
      { status: 400 }
    );
  }

  const insertResult = await db
    .insert(expectedIncomes)
    .values({
      clientName,
      revenueCenterId: revenueCenterId || null,
      amount,
      frequency,
      expectedDay,
      startDate,
      endDate: endDate || null,
      reliability,
      notes: notes || null,
      isActive: true,
    })
    .returning();

  const result = Array.isArray(insertResult) ? insertResult[0] : null;
  return NextResponse.json(result, { status: 201 });
}

// Helper per calcolare in quali mesi è previsto l'incasso
function getMonthlyOccurrences(
  startDate: string,
  endDate: string | null,
  frequency: string,
  year: number
): number[] {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(`${year}-12-31`);
  const months: number[] = [];

  // Calcola il mese di inizio effettivo per l'anno in questione
  const startMonth = start.getFullYear() < year ? 1 : (start.getFullYear() > year ? 13 : start.getMonth() + 1);
  const endMonth = end.getFullYear() < year ? 0 : (end.getFullYear() > year ? 12 : end.getMonth() + 1);

  // Se non è attivo quest'anno, ritorna array vuoto
  if (startMonth > 12 || endMonth < 1) return months;

  for (let month = 1; month <= 12; month++) {
    // Controlla se il mese è nel range del contratto
    if (month < startMonth || month > endMonth) continue;

    // Per frequenze diverse da mensile, verifica se il mese corrisponde
    if (frequency === "monthly") {
      months.push(month);
    } else if (frequency === "quarterly") {
      // Ogni 3 mesi dal mese di inizio originale del contratto
      const contractStartMonth = start.getMonth() + 1;
      // Calcola se questo mese è un multiplo di 3 dal mese di inizio
      const monthsFromStart = month - contractStartMonth;
      if (monthsFromStart >= 0 && monthsFromStart % 3 === 0) {
        months.push(month);
      }
    } else if (frequency === "semiannual") {
      // Ogni 6 mesi dal mese di inizio
      const contractStartMonth = start.getMonth() + 1;
      const monthsFromStart = month - contractStartMonth;
      if (monthsFromStart >= 0 && monthsFromStart % 6 === 0) {
        months.push(month);
      }
    } else if (frequency === "annual" || frequency === "one_time") {
      // Solo nel mese di inizio
      const contractStartMonth = start.getMonth() + 1;
      if (month === contractStartMonth) {
        months.push(month);
      }
    }
  }

  return months;
}
