import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      date,
      description,
      amount,
      costCenterId,
      revenueCenterId,
      notes,
      isExtraordinary,
      expectedExpenseId,
      expectedIncomeId,
    } = body;

    // Validazione
    if (!date || amount === undefined) {
      return NextResponse.json(
        { error: "Data e importo sono obbligatori" },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: "Descrizione obbligatoria" },
        { status: 400 }
      );
    }

    // Genera un ID manuale univoco
    const manualId = `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Costruisci le note includendo info sulla previsione se presente
    let fullNotes = notes || "";
    if (isExtraordinary) {
      fullNotes = fullNotes ? `[STRAORDINARIO] ${fullNotes}` : "[STRAORDINARIO]";
    }
    if (expectedExpenseId) {
      fullNotes = fullNotes
        ? `${fullNotes} [REF:EXP-${expectedExpenseId}]`
        : `[REF:EXP-${expectedExpenseId}]`;
    }
    if (expectedIncomeId) {
      fullNotes = fullNotes
        ? `${fullNotes} [REF:INC-${expectedIncomeId}]`
        : `[REF:INC-${expectedIncomeId}]`;
    }

    const result = await db
      .insert(transactions)
      .values({
        externalId: manualId,
        date,
        description,
        amount, // già in centesimi, già con segno corretto
        costCenterId: costCenterId || null,
        revenueCenterId: revenueCenterId || null,
        notes: fullNotes || null,
        isSplit: false,
        isVerified: false,
        rawData: JSON.stringify({
          source: "manual",
          isExtraordinary,
          expectedExpenseId,
          expectedIncomeId,
          originalAmount: amount,
          insertedAt: new Date().toISOString(),
        }),
      })
      .returning();

    const inserted = Array.isArray(result) ? result[0] : null;

    return NextResponse.json(
      {
        success: true,
        transaction: inserted,
        message: "Transazione salvata con successo",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Errore salvataggio transazione manuale:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
