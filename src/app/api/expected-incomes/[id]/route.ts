import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expectedIncomes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  regenerateForecastForIncome,
  updateForecastFromIncome,
  deleteForecastForIncome,
} from "@/lib/forecast-sync";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const incomeId = parseInt(id);

  const incomeArr = await db
    .select()
    .from(expectedIncomes)
    .where(eq(expectedIncomes.id, incomeId));

  const income = incomeArr[0];

  if (!income) {
    return NextResponse.json(
      { error: "Incasso previsto non trovato" },
      { status: 404 }
    );
  }

  return NextResponse.json(income);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const incomeId = parseInt(id);
  const body = await request.json();

  const existingArr = await db
    .select()
    .from(expectedIncomes)
    .where(eq(expectedIncomes.id, incomeId));

  const existing = existingArr[0];

  if (!existing) {
    return NextResponse.json(
      { error: "Incasso previsto non trovato" },
      { status: 404 }
    );
  }

  const {
    clientName,
    revenueCenterId,
    amount,
    frequency,
    expectedDay,
    startDate,
    endDate,
    reliability,
    notes,
    isActive,
  } = body;

  const updateResult = await db
    .update(expectedIncomes)
    .set({
      clientName: clientName ?? existing.clientName,
      revenueCenterId: revenueCenterId !== undefined ? revenueCenterId : existing.revenueCenterId,
      amount: amount ?? existing.amount,
      frequency: frequency ?? existing.frequency,
      expectedDay: expectedDay ?? existing.expectedDay,
      startDate: startDate ?? existing.startDate,
      endDate: endDate !== undefined ? endDate : existing.endDate,
      reliability: reliability ?? existing.reliability,
      notes: notes !== undefined ? notes : existing.notes,
      isActive: isActive !== undefined ? isActive : existing.isActive,
    })
    .where(eq(expectedIncomes.id, incomeId))
    .returning();

  const updated = Array.isArray(updateResult) ? updateResult[0] : null;

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
        await regenerateForecastForIncome({
          id: updated.id,
          clientName: updated.clientName,
          amount: updated.amount,
          frequency: updated.frequency,
          expectedDay: updated.expectedDay,
          startDate: updated.startDate,
          endDate: updated.endDate,
          revenueCenterId: updated.revenueCenterId,
          reliability: updated.reliability,
          notes: updated.notes,
        });
      } else {
        // Aggiorna solo i dati esistenti (importo, descrizione, ecc.)
        await updateForecastFromIncome({
          id: updated.id,
          clientName: updated.clientName,
          amount: updated.amount,
          frequency: updated.frequency,
          expectedDay: updated.expectedDay,
          startDate: updated.startDate,
          endDate: updated.endDate,
          revenueCenterId: updated.revenueCenterId,
          reliability: updated.reliability,
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
  const incomeId = parseInt(id);

  // Controlla se è una terminazione con data (non elimina il passato)
  const searchParams = request.nextUrl.searchParams;
  const terminateDate = searchParams.get("terminateDate"); // formato YYYY-MM-DD

  if (terminateDate) {
    // Termina l'incasso dalla data specificata (imposta endDate)
    // Questo preserva le voci passate e rimuove solo quelle future
    const existingArr = await db
      .select()
      .from(expectedIncomes)
      .where(eq(expectedIncomes.id, incomeId));

    const existing = existingArr[0];
    if (!existing) {
      return NextResponse.json(
        { error: "Incasso previsto non trovato" },
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
        .update(expectedIncomes)
        .set({ deletedAt: new Date(), isActive: false })
        .where(eq(expectedIncomes.id, incomeId));

      // Elimina tutti i forecastItems collegati
      try {
        await deleteForecastForIncome(incomeId);
      } catch (error) {
        console.error("Errore sync forecast:", error);
      }

      return NextResponse.json({
        message: "Incasso previsto eliminato completamente (terminazione prima dell'inizio)",
        action: "deleted"
      });
    }

    // Aggiorna endDate
    await db
      .update(expectedIncomes)
      .set({ endDate: newEndDate })
      .where(eq(expectedIncomes.id, incomeId));

    // Elimina i forecastItems dalla data di terminazione in poi
    try {
      await deleteForecastForIncome(incomeId, terminateDate);
    } catch (error) {
      console.error("Errore sync forecast:", error);
    }

    return NextResponse.json({
      message: `Incasso terminato dal ${newEndDate}`,
      action: "terminated",
      newEndDate
    });
  }

  // Soft delete completo (comportamento originale)
  const deleteResult = await db
    .update(expectedIncomes)
    .set({ deletedAt: new Date(), isActive: false })
    .where(eq(expectedIncomes.id, incomeId))
    .returning();

  const deleted = Array.isArray(deleteResult) ? deleteResult[0] : null;

  if (!deleted) {
    return NextResponse.json(
      { error: "Incasso previsto non trovato" },
      { status: 404 }
    );
  }

  // Elimina tutti i forecastItems futuri collegati
  try {
    await deleteForecastForIncome(incomeId);
  } catch (error) {
    console.error("Errore sync forecast:", error);
  }

  return NextResponse.json({ message: "Incasso previsto eliminato", action: "deleted" });
}
