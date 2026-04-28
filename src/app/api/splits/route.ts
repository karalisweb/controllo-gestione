import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { incomeSplits, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { calculateSplit } from "@/lib/utils/splits";
import { getSplitConfig } from "@/lib/utils/settings-server";

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

  // Usa importi custom se forniti, altrimenti calcola con percentuali configurate
  const splitConfig = await getSplitConfig();
  const baseSplit = calculateSplit(transaction.amount, splitConfig);
  const split = customAmounts ? {
    grossAmount: transaction.amount,
    netAmount: baseSplit.netAmount,
    danielaAmount: customAmounts.danielaAmount,
    alessioAmount: customAmounts.alessioAmount,
    agencyAmount: customAmounts.agencyAmount,
    vatAmount: customAmounts.vatAmount,
  } : baseSplit;

  // Crea 3 transazioni separate (IVA, Alessio, Daniela) collegate all'incasso originale.
  // Filosofia: lo split nel ledger Movimenti deve apparire come 3 righe distinte sotto l'incasso,
  // come nel foglio Excel storico.
  const splitItems = [
    { name: "IVA", amount: split.vatAmount, marker: "VAT" },
    { name: "Quota Alessio", amount: split.alessioAmount, marker: "ALESSIO" },
    { name: "Quota Daniela", amount: split.danielaAmount, marker: "DANIELA" },
  ];

  const createdTransfers: unknown[] = [];
  const ts = Date.now();
  for (const item of splitItems) {
    if (item.amount <= 0) continue; // niente riga zero
    const r = await db
      .insert(transactions)
      .values({
        externalId: `SPLIT-${item.marker}-${transactionId}-${ts}`,
        date: transaction.date,
        description: item.name,
        amount: -item.amount, // uscita
        isTransfer: true, // giroconto, non spesa operativa
        linkedTransactionId: transactionId,
        notes: `[SPLIT-${item.marker}] da incasso #${transactionId}`,
        isSplit: false,
        isVerified: true,
      })
      .returning();
    if (Array.isArray(r) && r[0]) createdTransfers.push(r[0]);
  }

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
    transfers: createdTransfers,
    summary: {
      incasso: split.grossAmount,
      iva: split.vatAmount,
      alessio: split.alessioAmount,
      daniela: split.danielaAmount,
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

  // Soft-delete delle 3 transazioni figlie (linkedTransactionId = txId, isTransfer=true)
  await db
    .update(transactions)
    .set({ deletedAt: new Date() })
    .where(eq(transactions.linkedTransactionId, txId));

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
