import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expectedExpenses, costCenters } from "@/lib/db/schema";
import { eq, isNull, and, sql, or, lte, gte } from "drizzle-orm";
import { syncForecastFromExpense } from "@/lib/forecast-sync";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const activeOnly = searchParams.get("active") !== "false";
  const costCenterId = searchParams.get("costCenterId");
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

  let whereClause = and(
    isNull(expectedExpenses.deletedAt),
    activeOnly ? sql`${expectedExpenses.isActive} = 1` : sql`1=1`
  );

  if (costCenterId) {
    whereClause = and(
      whereClause,
      eq(expectedExpenses.costCenterId, parseInt(costCenterId))
    );
  }

  // Filtra per spese attive nell'anno
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  whereClause = and(
    whereClause,
    lte(expectedExpenses.startDate, yearEnd),
    or(
      isNull(expectedExpenses.endDate),
      gte(expectedExpenses.endDate, yearStart)
    )
  );

  const expenses = await db
    .select()
    .from(expectedExpenses)
    .where(whereClause)
    .orderBy(expectedExpenses.name);

  // Aggiungi il nome del centro di costo
  const expensesWithCenter = await Promise.all(
    expenses.map(async (expense) => {
      let costCenter = null;
      if (expense.costCenterId) {
        const ccArr = await db
          .select()
          .from(costCenters)
          .where(eq(costCenters.id, expense.costCenterId));
        costCenter = ccArr[0] || null;
      }

      // Calcola i mesi in cui è prevista la spesa
      const monthlyOccurrences = getMonthlyOccurrences(
        expense.startDate,
        expense.endDate,
        expense.frequency,
        year
      );

      return {
        ...expense,
        costCenter,
        monthlyOccurrences,
      };
    })
  );

  return NextResponse.json(expensesWithCenter);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    name,
    costCenterId,
    amount,
    frequency = "monthly",
    expectedDay = 1,
    startDate,
    endDate,
    priority = "normal",
    notes,
  } = body;

  if (!name || amount === undefined || !startDate) {
    return NextResponse.json(
      { error: "Nome, importo e data inizio sono obbligatori" },
      { status: 400 }
    );
  }

  const insertResult = await db
    .insert(expectedExpenses)
    .values({
      name,
      costCenterId: costCenterId || null,
      amount,
      frequency,
      expectedDay,
      startDate,
      endDate: endDate || null,
      priority,
      notes: notes || null,
      isActive: true,
    })
    .returning();

  const result = Array.isArray(insertResult) ? insertResult[0] : null;

  // Sincronizza con il previsionale (genera forecastItems)
  if (result) {
    try {
      await syncForecastFromExpense({
        id: result.id,
        name: result.name,
        amount: result.amount,
        frequency: result.frequency,
        expectedDay: result.expectedDay,
        startDate: result.startDate,
        endDate: result.endDate,
        costCenterId: result.costCenterId,
        priority: result.priority,
        notes: result.notes,
      });
    } catch (error) {
      console.error("Errore sync forecast:", error);
      // Non blocca la creazione, solo log dell'errore
    }
  }

  return NextResponse.json(result, { status: 201 });
}

// Helper per calcolare in quali mesi è prevista la spesa
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
      const contractStartMonth = start.getMonth() + 1;
      const monthsFromStart = month - contractStartMonth;
      if (monthsFromStart >= 0 && monthsFromStart % 3 === 0) {
        months.push(month);
      }
    } else if (frequency === "semiannual") {
      const contractStartMonth = start.getMonth() + 1;
      const monthsFromStart = month - contractStartMonth;
      if (monthsFromStart >= 0 && monthsFromStart % 6 === 0) {
        months.push(month);
      }
    } else if (frequency === "annual" || frequency === "one_time") {
      const contractStartMonth = start.getMonth() + 1;
      if (month === contractStartMonth) {
        months.push(month);
      }
    }
  }

  return months;
}
