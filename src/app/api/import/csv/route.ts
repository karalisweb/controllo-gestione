import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, forecastItems } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { parseQontoCSV } from "@/lib/csv-parser";
import { findForecastMatch } from "@/lib/reconciliation";

/**
 * POST /api/import/csv
 *
 * Riceve il contenuto CSV Qonto, lo parsa e propone match col forecast.
 * Non salva nulla — restituisce l'anteprima per conferma utente.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { csvContent } = body;

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json(
        { error: "Contenuto CSV richiesto" },
        { status: 400 }
      );
    }

    // 1. Parsa il CSV
    const { rows, errors } = parseQontoCSV(csvContent);

    if (errors.length > 0 && rows.length === 0) {
      return NextResponse.json(
        { error: "Errore parsing CSV", details: errors },
        { status: 400 }
      );
    }

    // 2. Per ogni riga, verifica duplicati e cerca match forecast
    const processedRows = [];
    let transferCount = 0;
    let duplicateCount = 0;
    let matchCount = 0;

    for (const row of rows) {
      // Controlla se è un trasferimento
      if (row.isTransfer) {
        transferCount++;
        processedRows.push({
          ...row,
          isDuplicate: false,
          isTransfer: true,
          match: null,
        });
        continue;
      }

      // Controlla duplicato via externalId
      const existing = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(eq(transactions.externalId, row.externalId))
        .limit(1);

      const isDuplicate = existing.length > 0;
      if (isDuplicate) {
        duplicateCount++;
        processedRows.push({
          ...row,
          isDuplicate: true,
          match: null,
        });
        continue;
      }

      // Cerca match nel forecast
      const match = await findForecastMatch(
        row.date,
        row.amount,
        row.counterparty
      );

      if (match) {
        matchCount++;
      }

      processedRows.push({
        ...row,
        isDuplicate: false,
        match,
      });
    }

    const importableCount =
      rows.length - transferCount - duplicateCount;

    return NextResponse.json({
      rows: processedRows,
      errors,
      summary: {
        total: rows.length,
        transfers: transferCount,
        duplicates: duplicateCount,
        importable: importableCount,
        withMatch: matchCount,
        withoutMatch: importableCount - matchCount,
      },
    });
  } catch (error) {
    console.error("Errore import CSV:", error);
    return NextResponse.json(
      {
        error: "Errore durante il parsing del CSV",
        details: error instanceof Error ? error.message : "Errore sconosciuto",
      },
      { status: 500 }
    );
  }
}
