import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expectedExpenses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  regenerateForecastForExpense,
  updateForecastFromExpense,
  deleteForecastForExpense,
} from "@/lib/forecast-sync";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const expense = await db
    .select()
    .from(expectedExpenses)
    .where(eq(expectedExpenses.id, parseInt(id)));

  if (!expense[0]) {
    return NextResponse.json({ error: "Spesa non trovata" }, { status: 404 });
  }

  return NextResponse.json(expense[0]);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const {
    name,
    costCenterId,
    amount,
    frequency,
    expectedDay,
    startDate,
    endDate,
    priority,
    notes,
    isActive,
  } = body;

  const updateData: Record<string, unknown> = {};

  if (name !== undefined) updateData.name = name;
  if (costCenterId !== undefined) updateData.costCenterId = costCenterId || null;
  if (amount !== undefined) updateData.amount = amount;
  if (frequency !== undefined) updateData.frequency = frequency;
  if (expectedDay !== undefined) updateData.expectedDay = expectedDay;
  if (startDate !== undefined) updateData.startDate = startDate;
  if (endDate !== undefined) updateData.endDate = endDate || null;
  if (priority !== undefined) updateData.priority = priority;
  if (notes !== undefined) updateData.notes = notes || null;
  if (isActive !== undefined) updateData.isActive = isActive;

  const result = await db
    .update(expectedExpenses)
    .set(updateData)
    .where(eq(expectedExpenses.id, parseInt(id)))
    .returning();

  const updated = result[0];

  // Sincronizza con il previsionale
  if (updated) {
    try {
      // Controlla se sono cambiate le date/frequenza (richiede rigenerazione)
      const needsRegeneration =
        frequency !== undefined ||
        expectedDay !== undefined ||
        startDate !== undefined ||
        endDate !== undefined;

      if (needsRegeneration) {
        await regenerateForecastForExpense({
          id: updated.id,
          name: updated.name,
          amount: updated.amount,
          frequency: updated.frequency,
          expectedDay: updated.expectedDay,
          startDate: updated.startDate,
          endDate: updated.endDate,
          costCenterId: updated.costCenterId,
          priority: updated.priority,
          notes: updated.notes,
        });
      } else {
        // Aggiorna solo i dati esistenti (importo, descrizione, ecc.)
        await updateForecastFromExpense({
          id: updated.id,
          name: updated.name,
          amount: updated.amount,
          frequency: updated.frequency,
          expectedDay: updated.expectedDay,
          startDate: updated.startDate,
          endDate: updated.endDate,
          costCenterId: updated.costCenterId,
          priority: updated.priority,
          notes: updated.notes,
        });
      }
    } catch (error) {
      console.error("Errore sync forecast:", error);
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const expenseId = parseInt(id);

  // Controlla se è una terminazione con data (non elimina il passato)
  const searchParams = request.nextUrl.searchParams;
  const terminateDate = searchParams.get("terminateDate"); // formato YYYY-MM-DD

  if (terminateDate) {
    // Termina la spesa dalla data specificata (imposta endDate)
    // Questo preserva le voci passate e rimuove solo quelle future
    const existingArr = await db
      .select()
      .from(expectedExpenses)
      .where(eq(expectedExpenses.id, expenseId));

    const existing = existingArr[0];
    if (!existing) {
      return NextResponse.json(
        { error: "Spesa prevista non trovata" },
        { status: 404 }
      );
    }

    // Calcola l'ultimo giorno del mese precedente alla data di terminazione
    const termDate = new Date(terminateDate);
    // Imposta l'endDate all'ultimo giorno del mese precedente
    const lastDayPrevMonth = new Date(termDate.getFullYear(), termDate.getMonth(), 0);
    const newEndDate = lastDayPrevMonth.toISOString().split("T")[0]; // YYYY-MM-DD

    // Se la nuova endDate è prima della startDate, fai soft delete completo
    if (newEndDate < existing.startDate) {
      await db
        .update(expectedExpenses)
        .set({ deletedAt: new Date(), isActive: false })
        .where(eq(expectedExpenses.id, expenseId));

      // Elimina tutti i forecastItems collegati
      try {
        await deleteForecastForExpense(expenseId);
      } catch (error) {
        console.error("Errore sync forecast:", error);
      }

      return NextResponse.json({
        message: "Spesa prevista eliminata completamente (terminazione prima dell'inizio)",
        action: "deleted"
      });
    }

    // Aggiorna endDate
    await db
      .update(expectedExpenses)
      .set({ endDate: newEndDate })
      .where(eq(expectedExpenses.id, expenseId));

    // Elimina i forecastItems dalla data di terminazione in poi
    try {
      await deleteForecastForExpense(expenseId, terminateDate);
    } catch (error) {
      console.error("Errore sync forecast:", error);
    }

    return NextResponse.json({
      message: `Spesa terminata dal ${newEndDate}`,
      action: "terminated",
      newEndDate
    });
  }

  // Soft delete completo (comportamento originale)
  await db
    .update(expectedExpenses)
    .set({ deletedAt: new Date(), isActive: false })
    .where(eq(expectedExpenses.id, expenseId));

  // Elimina tutti i forecastItems futuri collegati
  try {
    await deleteForecastForExpense(expenseId);
  } catch (error) {
    console.error("Errore sync forecast:", error);
  }

  return NextResponse.json({ success: true, action: "deleted" });
}
