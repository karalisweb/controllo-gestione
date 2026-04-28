import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { incomeSplits, transactions, costCenters } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { calculateSplit } from "@/lib/utils/splits";
import { getSplitConfig } from "@/lib/utils/settings-server";

/**
 * Trova o crea un centro di costo per nome (case-sensitive sul DB, ma la convenzione
 * d'uso sono nomi capitalizzati come "IVA" / "Soci").
 */
async function ensureCostCenterByName(name: string): Promise<number> {
  const existing = await db
    .select({ id: costCenters.id })
    .from(costCenters)
    .where(and(eq(costCenters.name, name), isNull(costCenters.deletedAt)))
    .limit(1);
  if (existing.length > 0) return existing[0].id;
  const created = await db
    .insert(costCenters)
    .values({ name, isActive: true })
    .returning();
  return Array.isArray(created) ? created[0].id : 0;
}


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

  // Pre-crea (o recupera) il centro di costo "Soci" per categorizzare la riga totale
  // (cosmetico: il box "Uscite per centro" esclude comunque le righe con linkedTransactionId).
  const sociCenterId = await ensureCostCenterByName("Soci");

  // Modello: 1 SOLA riga totale "Bonifico soci+IVA <incasso>" che corrisponde al
  // bonifico bancario reale. Lo spaccato (IVA/Alessio/Daniela) vive in `incomeSplits`
  // ed è esposto come dettaglio espandibile nella UI di /movimenti.
  const incassoDesc = (transaction.description || "").trim();
  const transferAmount = split.vatAmount + split.alessioAmount + split.danielaAmount;
  const totalDescription = incassoDesc
    ? `Bonifico soci+IVA ${incassoDesc}`
    : "Bonifico soci+IVA";

  const ts = Date.now();
  const transferResult = await db
    .insert(transactions)
    .values({
      externalId: `SPLIT-TOTAL-${transactionId}-${ts}`,
      date: transaction.date,
      description: totalDescription,
      amount: -transferAmount,
      costCenterId: sociCenterId,
      isTransfer: false, // INCIDE sul saldo (corrisponde al bonifico bancario reale)
      linkedTransactionId: transactionId,
      notes: `[SPLIT-TOTAL] da incasso #${transactionId}`,
      isSplit: false,
      isVerified: true,
    })
    .returning();
  const createdTransfers = Array.isArray(transferResult) ? [transferResult[0]] : [];

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
