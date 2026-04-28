import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/transactions/auto-match/apply
 *
 * Body: { updates: [{ transactionId, contactId?, costCenterId?, revenueCenterId? }] }
 *
 * Aggiorna in batch i campi specificati per ogni transazione. Solo i campi
 * presenti nel payload vengono toccati: undefined = non modifico, null = svuoto.
 */

interface UpdateItem {
  transactionId: number;
  contactId?: number | null;
  costCenterId?: number | null;
  revenueCenterId?: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const updates = body?.updates;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "updates array obbligatorio e non vuoto" }, { status: 400 });
    }

    let appliedCount = 0;
    const errors: { transactionId: number; error: string }[] = [];

    for (const u of updates as UpdateItem[]) {
      if (!u.transactionId || typeof u.transactionId !== "number") {
        errors.push({ transactionId: u.transactionId ?? -1, error: "transactionId mancante" });
        continue;
      }
      const setData: Record<string, unknown> = {};
      if (u.contactId !== undefined) setData.contactId = u.contactId;
      if (u.costCenterId !== undefined) setData.costCenterId = u.costCenterId;
      if (u.revenueCenterId !== undefined) setData.revenueCenterId = u.revenueCenterId;

      if (Object.keys(setData).length === 0) {
        errors.push({ transactionId: u.transactionId, error: "nessun campo da aggiornare" });
        continue;
      }

      try {
        const updated = await db
          .update(transactions)
          .set(setData)
          .where(eq(transactions.id, u.transactionId))
          .returning();
        if (Array.isArray(updated) && updated.length > 0) {
          appliedCount++;
        } else {
          errors.push({ transactionId: u.transactionId, error: "transazione non trovata" });
        }
      } catch (e) {
        errors.push({ transactionId: u.transactionId, error: String(e) });
      }
    }

    return NextResponse.json({
      applied: appliedCount,
      requested: updates.length,
      errors,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
