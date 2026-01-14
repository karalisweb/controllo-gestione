import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { eurosToCents } from "@/lib/utils/currency";

interface QontoTransaction {
  id: string;
  date: string;
  description: string;
  amount: number; // in euro (può essere stringa nel CSV)
  counterparty?: string;
  category?: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseQontoCSV(csvContent: string): QontoTransaction[] {
  const lines = csvContent.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  // Prima riga = header
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());

  // Trova indici delle colonne rilevanti
  // Qonto può avere diverse versioni di export, cerchiamo le colonne comuni
  const dateIndex = headers.findIndex(
    (h) =>
      h.includes("data") ||
      h.includes("date") ||
      h === "settlement_date" ||
      h === "operation_date"
  );
  const descIndex = headers.findIndex(
    (h) =>
      h.includes("descrizione") ||
      h.includes("description") ||
      h.includes("label") ||
      h.includes("counterparty")
  );
  const amountIndex = headers.findIndex(
    (h) =>
      h.includes("importo") ||
      h.includes("amount") ||
      h.includes("total_amount")
  );
  const idIndex = headers.findIndex(
    (h) =>
      h.includes("transaction_id") ||
      h.includes("id") ||
      h === "reference"
  );
  const counterpartyIndex = headers.findIndex(
    (h) => h.includes("counterparty") || h.includes("controparte")
  );

  if (dateIndex === -1 || amountIndex === -1) {
    throw new Error(
      "Formato CSV non riconosciuto. Colonne richieste: data, importo"
    );
  }

  const result: QontoTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < Math.max(dateIndex, amountIndex) + 1) continue;

    // Parse della data (supporta diversi formati)
    let dateStr = values[dateIndex];
    // Converti da DD/MM/YYYY a YYYY-MM-DD se necessario
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // DD/MM/YYYY
          dateStr = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        } else if (parts[0].length === 4) {
          // YYYY/MM/DD
          dateStr = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
        }
      }
    }

    // Parse dell'importo (rimuovi simboli e converti virgola in punto)
    let amountStr = values[amountIndex]
      .replace(/[€\s]/g, "")
      .replace(/\./g, "") // rimuovi separatore migliaia
      .replace(",", "."); // virgola decimale -> punto

    const amount = parseFloat(amountStr);
    if (isNaN(amount)) continue;

    // Genera ID univoco se non presente
    const id =
      idIndex !== -1 && values[idIndex]
        ? values[idIndex]
        : `qonto_${dateStr}_${i}_${Math.abs(amount)}`;

    // Descrizione
    let description = descIndex !== -1 ? values[descIndex] : "";
    if (counterpartyIndex !== -1 && values[counterpartyIndex]) {
      description = description
        ? `${values[counterpartyIndex]} - ${description}`
        : values[counterpartyIndex];
    }

    result.push({
      id,
      date: dateStr,
      description: description || "Movimento senza descrizione",
      amount,
    });
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File non fornito" }, { status: 400 });
    }

    const csvContent = await file.text();
    const parsedTransactions = parseQontoCSV(csvContent);

    if (parsedTransactions.length === 0) {
      return NextResponse.json(
        { error: "Nessuna transazione trovata nel file" },
        { status: 400 }
      );
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const tx of parsedTransactions) {
      try {
        // Verifica duplicato
        const existing = await db
          .select()
          .from(transactions)
          .where(eq(transactions.externalId, tx.id));

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        // Inserisci la transazione
        await db.insert(transactions).values({
          externalId: tx.id,
          date: tx.date,
          description: tx.description,
          amount: eurosToCents(tx.amount),
          isSplit: false,
          rawData: JSON.stringify(tx),
        });

        imported++;
      } catch (err) {
        errors.push(
          `Errore importazione riga ${tx.id}: ${err instanceof Error ? err.message : "Errore sconosciuto"}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      total: parsedTransactions.length,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Errore durante l'importazione",
      },
      { status: 500 }
    );
  }
}
