import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { incomeSplits, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { calculateSplit } from "@/lib/utils/splits";

// GET - Recupera tutte le ripartizioni o filtra per transazione
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const transactionId = searchParams.get("transactionId");

  if (transactionId) {
    const result = await db
      .select()
      .from(incomeSplits)
      .where(eq(incomeSplits.transactionId, parseInt(transactionId)));

    return NextResponse.json(result[0] || null);
  }

  const result = await db.select().from(incomeSplits);
  return NextResponse.json(result);
}

// POST - Crea una nuova ripartizione per una transazione
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { transactionId, customAmounts } = body;

  if (!transactionId) {
    return NextResponse.json(
      { error: "ID transazione obbligatorio" },
      { status: 400 }
    );
  }

  // Verifica che la transazione esista e sia un'entrata
  const transactionArr = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId));

  const transaction = transactionArr[0];

  if (!transaction) {
    return NextResponse.json(
      { error: "Transazione non trovata" },
      { status: 404 }
    );
  }

  if (transaction.amount <= 0) {
    return NextResponse.json(
      { error: "La ripartizione si applica solo alle entrate" },
      { status: 400 }
    );
  }

  // Verifica che non esista già una ripartizione
  const existingSplit = await db
    .select()
    .from(incomeSplits)
    .where(eq(incomeSplits.transactionId, transactionId));

  if (existingSplit.length > 0) {
    return NextResponse.json(
      { error: "Ripartizione già esistente per questa transazione" },
      { status: 409 }
    );
  }

  // Usa importi custom se forniti, altrimenti calcola
  const baseSplit = calculateSplit(transaction.amount);
  const split = customAmounts ? {
    grossAmount: transaction.amount,
    netAmount: baseSplit.netAmount,
    danielaAmount: customAmounts.danielaAmount,
    alessioAmount: customAmounts.alessioAmount,
    agencyAmount: customAmounts.agencyAmount,
    vatAmount: customAmounts.vatAmount,
  } : baseSplit;

  // Calcola importo totale bonifico: Alessio + Daniela + IVA
  const transferAmount = split.alessioAmount + split.danielaAmount + split.vatAmount;

  // Crea la transazione di uscita per il bonifico soci + IVA
  // Usa solo la descrizione dell'incasso originale
  const transferResult = await db
    .insert(transactions)
    .values({
      externalId: `SPLIT-${transactionId}-${Date.now()}`,
      date: transaction.date, // Stessa data dell'incasso
      description: transaction.description || 'Bonifico soci + IVA',
      amount: -transferAmount, // Negativo perché è un'uscita
      isTransfer: true, // Marca come giroconto, non spesa operativa
      linkedTransactionId: transactionId, // Collega all'incasso originale
      notes: `[RIPARTIZIONE] Alessio: ${split.alessioAmount}, Daniela: ${split.danielaAmount}, IVA: ${split.vatAmount}`,
      isSplit: false,
      isVerified: true,
    })
    .returning();

  const transferTx = Array.isArray(transferResult) ? transferResult[0] : null;

  // Salva la ripartizione
  const insertResult = await db
    .insert(incomeSplits)
    .values({
      transactionId,
      grossAmount: split.grossAmount,
      netAmount: split.netAmount,
      danielaAmount: split.danielaAmount,
      alessioAmount: split.alessioAmount,
      agencyAmount: split.agencyAmount,
      vatAmount: split.vatAmount,
    })
    .returning();

  const newSplit = Array.isArray(insertResult) ? insertResult[0] : null;

  // Aggiorna la transazione come ripartita
  await db
    .update(transactions)
    .set({ isSplit: true })
    .where(eq(transactions.id, transactionId));

  return NextResponse.json({
    split: newSplit,
    transfer: transferTx,
    summary: {
      incasso: split.grossAmount,
      bonificoSoci: transferAmount,
      disponibileAgenzia: split.agencyAmount,
    }
  }, { status: 201 });
}

// DELETE - Elimina una ripartizione
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const transactionId = searchParams.get("transactionId");

  if (!transactionId) {
    return NextResponse.json(
      { error: "ID transazione obbligatorio" },
      { status: 400 }
    );
  }

  const txId = parseInt(transactionId);

  // Elimina la ripartizione
  await db
    .delete(incomeSplits)
    .where(eq(incomeSplits.transactionId, txId));

  // Aggiorna la transazione
  await db
    .update(transactions)
    .set({ isSplit: false })
    .where(eq(transactions.id, txId));

  return NextResponse.json({ message: "Ripartizione eliminata" });
}
