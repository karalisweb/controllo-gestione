import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { reconcileTransaction } from "@/lib/reconciliation";

interface ImportItem {
  date: string;
  description: string;
  amount: number; // centesimi
  externalId: string;
  isTransfer: boolean;
  costCenterId?: number | null;
  revenueCenterId?: number | null;
  matchedForecastItemId?: number | null;
  rawData?: string;
}

/**
 * POST /api/import/confirm
 *
 * Conferma l'import delle transazioni selezionate dall'utente.
 * Crea le transazioni e riconcilia quelle con match al forecast.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body as { items: ImportItem[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Nessun movimento da importare" },
        { status: 400 }
      );
    }

    let created = 0;
    let reconciled = 0;
    let transfersCreated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        // Verifica duplicato
        if (item.externalId) {
          const existing = await db
            .select({ id: transactions.id })
            .from(transactions)
            .where(eq(transactions.externalId, item.externalId))
            .limit(1);

          if (existing.length > 0) {
            skipped++;
            continue;
          }
        }

        // Crea la transazione
        const result = await db
          .insert(transactions)
          .values({
            externalId: item.externalId || null,
            date: item.date,
            description: item.description,
            amount: item.amount,
            costCenterId: item.costCenterId || null,
            revenueCenterId: item.revenueCenterId || null,
            isTransfer: item.isTransfer,
            isSplit: false,
            isVerified: false,
            rawData: item.rawData || JSON.stringify({ source: "csv-import", importedAt: new Date().toISOString() }),
            notes: item.isTransfer ? "Giroconto (import CSV)" : null,
          })
          .returning();

        const inserted = Array.isArray(result) ? result[0] : null;

        if (!inserted) {
          errors.push(`Errore creazione transazione: ${item.description}`);
          continue;
        }

        if (item.isTransfer) {
          transfersCreated++;
        }

        created++;

        // Riconcilia col forecast se c'è un match confermato
        if (item.matchedForecastItemId && !item.isTransfer) {
          try {
            await reconcileTransaction(inserted.id, item.matchedForecastItemId);
            reconciled++;
          } catch (reconcileError) {
            console.error(
              `Errore riconciliazione forecast ${item.matchedForecastItemId}:`,
              reconcileError
            );
            // Non blocca — la transazione è già creata
          }
        }
      } catch (itemError) {
        errors.push(
          `Errore per "${item.description}": ${
            itemError instanceof Error ? itemError.message : "errore sconosciuto"
          }`
        );
      }
    }

    return NextResponse.json({
      created,
      reconciled,
      transfers: transfersCreated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Errore conferma import:", error);
    return NextResponse.json(
      {
        error: "Errore durante l'import",
        details: error instanceof Error ? error.message : "Errore sconosciuto",
      },
      { status: 500 }
    );
  }
}
