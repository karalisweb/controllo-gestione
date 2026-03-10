/**
 * Parser CSV per export Qonto
 *
 * Formato Qonto:
 * - Separatore: ;
 * - Colonne: Data di valuta (UTC), Controparte, Importo totale (IVA incl.)
 * - Date: DD-MM-YYYY HH:MM:SS
 * - Importi: formato italiano con virgola decimale (positivo = entrata, negativo = uscita)
 */

import { parseItalianCurrency } from "@/lib/utils/currency";

export interface CsvRow {
  date: string; // YYYY-MM-DD
  counterparty: string; // controparte originale
  amount: number; // centesimi (positivo = entrata, negativo = uscita)
  isTransfer: boolean; // trasferimento interno (giroconto)
  externalId: string; // ID univoco per dedup
  rawDate: string; // data originale dal CSV
}

export interface ParseResult {
  rows: CsvRow[];
  errors: string[];
}

// Pattern per identificare trasferimenti interni
const TRANSFER_PATTERNS = [
  "conto principale",
  "conto iva e risparmio",
  "karalisweb di daniela spiggia",
];

/**
 * Controlla se una controparte è un trasferimento interno
 */
function isInternalTransfer(counterparty: string): boolean {
  const lower = counterparty.toLowerCase().trim();
  return TRANSFER_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Converte data Qonto (DD-MM-YYYY HH:MM:SS) in formato YYYY-MM-DD
 */
function parseQontoDate(dateStr: string): string {
  // Formato: "09-03-2026 11:20:30"
  const parts = dateStr.trim().split(" ")[0]; // prende solo la data
  const [day, month, year] = parts.split("-");

  if (!day || !month || !year) {
    throw new Error(`Formato data non valido: ${dateStr}`);
  }

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Converte importo Qonto (formato italiano con segno) in centesimi
 * Gestisce sia positivi che negativi: "10,00", "-188,40"
 */
function parseQontoAmount(amountStr: string): number {
  const cleaned = amountStr.trim();
  const isNegative = cleaned.startsWith("-");
  const absValue = cleaned.replace("-", "");

  // Usa parseItalianCurrency che gestisce il formato italiano
  const cents = parseItalianCurrency(absValue);

  return isNegative ? -cents : cents;
}

/**
 * Genera un ID esterno univoco per evitare duplicati
 * Formato: QONTO-{YYYY-MM-DD}-{controparte_normalizzata}-{importo_cents}
 */
function generateExternalId(
  date: string,
  counterparty: string,
  amount: number,
  rawDate: string
): string {
  // Includi l'orario per unicità (stessa controparte/importo/giorno ma orari diversi)
  const time = rawDate.trim().split(" ")[1] || "000000";
  const timeClean = time.replace(/:/g, "");
  const cpNorm = counterparty
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 30);
  return `QONTO-${date}-${timeClean}-${cpNorm}-${amount}`;
}

/**
 * Parsa un CSV export Qonto e restituisce le righe strutturate
 */
export function parseQontoCSV(csvContent: string): ParseResult {
  const rows: CsvRow[] = [];
  const errors: string[] = [];

  // Splitta per righe, gestisci sia \r\n che \n
  const lines = csvContent
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { rows: [], errors: ["File CSV vuoto"] };
  }

  // Verifica header (prima riga)
  const header = lines[0].toLowerCase();
  if (
    !header.includes("data di valuta") ||
    !header.includes("controparte") ||
    !header.includes("importo")
  ) {
    errors.push(
      `Header CSV non riconosciuto. Atteso: "Data di valuta (UTC);Controparte;Importo totale (IVA incl.)". Trovato: "${lines[0]}"`
    );
    return { rows: [], errors };
  }

  // Parsa ogni riga (salta header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(";");
    if (parts.length < 3) {
      errors.push(`Riga ${i + 1}: formato non valido (${parts.length} colonne, attese 3)`);
      continue;
    }

    const [rawDate, counterparty, amountStr] = parts;

    try {
      const date = parseQontoDate(rawDate);
      const amount = parseQontoAmount(amountStr);
      const isTransfer = isInternalTransfer(counterparty);
      const externalId = generateExternalId(
        date,
        counterparty,
        amount,
        rawDate
      );

      rows.push({
        date,
        counterparty: counterparty.trim(),
        amount,
        isTransfer,
        externalId,
        rawDate: rawDate.trim(),
      });
    } catch (err) {
      errors.push(
        `Riga ${i + 1}: ${err instanceof Error ? err.message : "errore sconosciuto"}`
      );
    }
  }

  return { rows, errors };
}
