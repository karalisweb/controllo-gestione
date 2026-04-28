import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { incomeSplits, transactions, contacts, costCenters } from "@/lib/db/schema";
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

/**
 * Trova o crea un contatto fornitore per nome. Se esiste già senza costCenterId
 * lo lascia com'è (rispetto della scelta utente).
 */
async function ensureSupplierByName(name: string, defaultCostCenterId: number): Promise<number> {
  const existing = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(
      and(
        eq(contacts.name, name),
        eq(contacts.type, "supplier"),
        isNull(contacts.deletedAt),
      ),
    )
    .limit(1);
  if (existing.length > 0) return existing[0].id;
  const created = await db
    .insert(contacts)
    .values({
      name,
      type: "supplier",
      costCenterId: defaultCostCenterId,
      isActive: true,
    })
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

  // Pre-crea (o recupera) centri di costo IVA/Soci e i 3 contatti supplier.
  // Filosofia: ogni riga split deve nascere già "tracciata" con contatto + centro,
  // così non serve passare da /riconcilia per categorizzarle.
  const ivaCenterId = await ensureCostCenterByName("IVA");
  const sociCenterId = await ensureCostCenterByName("Soci");
  const ivaContactId = await ensureSupplierByName("IVA", ivaCenterId);
  const alessioContactId = await ensureSupplierByName("Alessio", sociCenterId);
  const danielaContactId = await ensureSupplierByName("Daniela", sociCenterId);

  // Crea 3 transazioni separate (IVA, Alessio, Daniela) collegate all'incasso originale.
  // Descrizione: "{prefisso} {descrizione incasso}" (es. "IVA Cambarau marzo")
  const incassoDesc = (transaction.description || "").trim();
  const splitItems = [
    {
      descPrefix: "IVA",
      amount: split.vatAmount,
      marker: "VAT",
      contactId: ivaContactId,
      costCenterId: ivaCenterId,
    },
    {
      descPrefix: "Quota Alessio",
      amount: split.alessioAmount,
      marker: "ALESSIO",
      contactId: alessioContactId,
      costCenterId: sociCenterId,
    },
    {
      descPrefix: "Quota Daniela",
      amount: split.danielaAmount,
      marker: "DANIELA",
      contactId: danielaContactId,
      costCenterId: sociCenterId,
    },
  ];

  const createdTransfers: unknown[] = [];
  const ts = Date.now();
  for (const item of splitItems) {
    if (item.amount <= 0) continue; // niente riga zero
    const description = incassoDesc
      ? `${item.descPrefix} ${incassoDesc}`
      : item.descPrefix;
    const r = await db
      .insert(transactions)
      .values({
        externalId: `SPLIT-${item.marker}-${transactionId}-${ts}`,
        date: transaction.date,
        description,
        amount: -item.amount, // uscita
        contactId: item.contactId,
        costCenterId: item.costCenterId,
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
