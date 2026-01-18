/**
 * Funzioni helper per sincronizzare il previsionale (forecastItems)
 * con il piano annuale (expectedExpenses/expectedIncomes)
 */

import { db } from "@/lib/db";
import { forecastItems } from "@/lib/db/schema";
import { eq, and, isNull, gte, lte } from "drizzle-orm";

// Periodo di default per la generazione: da oggi a fine anno prossimo
function getDefaultDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const endDate = `${now.getFullYear() + 1}-12-31`;
  return { startDate, endDate };
}

/**
 * Genera le date di occorrenza per una voce ricorrente
 */
function generateOccurrences(
  startDate: string,
  endDate: string | null,
  frequency: string,
  expectedDay: number,
  rangeStart: string,
  rangeEnd: string
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(rangeEnd);
  const rStart = new Date(rangeStart);
  const rEnd = new Date(rangeEnd);

  // Parti dal primo mese nel range
  let current = new Date(Math.max(start.getTime(), rStart.getTime()));
  current.setDate(1);

  while (current <= rEnd && current <= end) {
    const monthsDiff = monthDifference(start, current);
    let isOccurrence = false;

    switch (frequency) {
      case "monthly":
        isOccurrence = true;
        break;
      case "quarterly":
        isOccurrence = monthsDiff % 3 === 0;
        break;
      case "semiannual":
        isOccurrence = monthsDiff % 6 === 0;
        break;
      case "annual":
      case "one_time":
        isOccurrence = monthsDiff % 12 === 0;
        break;
    }

    if (isOccurrence) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const day = Math.min(expectedDay, lastDay);

      const occurrenceDate = new Date(year, month, day);

      if (
        occurrenceDate >= rStart &&
        occurrenceDate <= rEnd &&
        occurrenceDate >= start &&
        occurrenceDate <= end
      ) {
        dates.push(formatDate(occurrenceDate));
      }
    }

    current.setMonth(current.getMonth() + 1);
  }

  return dates;
}

function monthDifference(d1: Date, d2: Date): number {
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface ExpectedExpenseData {
  id: number;
  name: string;
  amount: number;
  frequency: string;
  expectedDay: number | null;
  startDate: string;
  endDate: string | null;
  costCenterId: number | null;
  priority: string | null;
  notes: string | null;
}

interface ExpectedIncomeData {
  id: number;
  clientName: string;
  amount: number;
  frequency: string;
  expectedDay: number | null;
  startDate: string;
  endDate: string | null;
  revenueCenterId: number | null;
  reliability: string | null;
  notes: string | null;
}

/**
 * Genera i forecastItems per una spesa prevista
 */
export async function syncForecastFromExpense(expense: ExpectedExpenseData): Promise<number> {
  const { startDate, endDate } = getDefaultDateRange();

  const occurrences = generateOccurrences(
    expense.startDate,
    expense.endDate,
    expense.frequency,
    expense.expectedDay || 1,
    startDate,
    endDate
  );

  let created = 0;

  for (const date of occurrences) {
    // Controlla se esiste già
    const existing = await db
      .select()
      .from(forecastItems)
      .where(
        and(
          eq(forecastItems.sourceType, "expected_expense"),
          eq(forecastItems.sourceId, expense.id),
          eq(forecastItems.date, date),
          isNull(forecastItems.deletedAt)
        )
      );

    if (existing.length === 0) {
      await db.insert(forecastItems).values({
        date,
        description: expense.name,
        type: "expense",
        amount: expense.amount,
        sourceType: "expected_expense",
        sourceId: expense.id,
        costCenterId: expense.costCenterId,
        priority: expense.priority as "essential" | "important" | "investment" | "normal" | null,
        notes: expense.notes,
      });
      created++;
    }
  }

  return created;
}

/**
 * Genera i forecastItems per un incasso previsto
 */
export async function syncForecastFromIncome(income: ExpectedIncomeData): Promise<number> {
  const { startDate, endDate } = getDefaultDateRange();

  const occurrences = generateOccurrences(
    income.startDate,
    income.endDate,
    income.frequency,
    income.expectedDay || 20,
    startDate,
    endDate
  );

  let created = 0;

  for (const date of occurrences) {
    // Controlla se esiste già
    const existing = await db
      .select()
      .from(forecastItems)
      .where(
        and(
          eq(forecastItems.sourceType, "expected_income"),
          eq(forecastItems.sourceId, income.id),
          eq(forecastItems.date, date),
          isNull(forecastItems.deletedAt)
        )
      );

    if (existing.length === 0) {
      await db.insert(forecastItems).values({
        date,
        description: income.clientName,
        type: "income",
        amount: income.amount,
        sourceType: "expected_income",
        sourceId: income.id,
        revenueCenterId: income.revenueCenterId,
        reliability: income.reliability as "high" | "medium" | "low" | null,
        notes: income.notes,
      });
      created++;
    }
  }

  return created;
}

/**
 * Aggiorna i forecastItems esistenti per una spesa prevista
 * (aggiorna importo, descrizione, ecc. ma non le date)
 */
export async function updateForecastFromExpense(expense: ExpectedExpenseData): Promise<number> {
  const result = await db
    .update(forecastItems)
    .set({
      description: expense.name,
      amount: expense.amount,
      costCenterId: expense.costCenterId,
      priority: expense.priority as "essential" | "important" | "investment" | "normal" | null,
      notes: expense.notes,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(forecastItems.sourceType, "expected_expense"),
        eq(forecastItems.sourceId, expense.id),
        isNull(forecastItems.deletedAt)
      )
    );

  return 0; // Drizzle non restituisce count per update senza returning
}

/**
 * Aggiorna i forecastItems esistenti per un incasso previsto
 */
export async function updateForecastFromIncome(income: ExpectedIncomeData): Promise<number> {
  await db
    .update(forecastItems)
    .set({
      description: income.clientName,
      amount: income.amount,
      revenueCenterId: income.revenueCenterId,
      reliability: income.reliability as "high" | "medium" | "low" | null,
      notes: income.notes,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(forecastItems.sourceType, "expected_income"),
        eq(forecastItems.sourceId, income.id),
        isNull(forecastItems.deletedAt)
      )
    );

  return 0;
}

/**
 * Elimina (soft delete) i forecastItems futuri per una spesa eliminata
 * Se viene passata una terminateDate, elimina solo quelli da quella data in poi
 */
export async function deleteForecastForExpense(
  expenseId: number,
  terminateDate?: string
): Promise<void> {
  const today = formatDate(new Date());
  const fromDate = terminateDate || today;

  await db
    .update(forecastItems)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(forecastItems.sourceType, "expected_expense"),
        eq(forecastItems.sourceId, expenseId),
        gte(forecastItems.date, fromDate),
        isNull(forecastItems.deletedAt)
      )
    );
}

/**
 * Elimina (soft delete) i forecastItems futuri per un incasso eliminato
 */
export async function deleteForecastForIncome(
  incomeId: number,
  terminateDate?: string
): Promise<void> {
  const today = formatDate(new Date());
  const fromDate = terminateDate || today;

  await db
    .update(forecastItems)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(forecastItems.sourceType, "expected_income"),
        eq(forecastItems.sourceId, incomeId),
        gte(forecastItems.date, fromDate),
        isNull(forecastItems.deletedAt)
      )
    );
}

/**
 * Rigenera completamente i forecastItems per una spesa
 * (elimina quelli esistenti futuri e ricrea)
 */
export async function regenerateForecastForExpense(expense: ExpectedExpenseData): Promise<number> {
  // Elimina i forecast futuri esistenti
  await deleteForecastForExpense(expense.id);

  // Ricrea
  return await syncForecastFromExpense(expense);
}

/**
 * Rigenera completamente i forecastItems per un incasso
 */
export async function regenerateForecastForIncome(income: ExpectedIncomeData): Promise<number> {
  // Elimina i forecast futuri esistenti
  await deleteForecastForIncome(income.id);

  // Ricrea
  return await syncForecastFromIncome(income);
}
