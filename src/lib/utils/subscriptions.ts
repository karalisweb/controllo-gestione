/**
 * Generatore di occorrenze di una sottoscrizione.
 *
 * Funzione pura: dato il pattern (recurring o installments) e i parametri
 * (importo, intervallo/percentuali, date), restituisce l'array di occorrenze
 * concrete (data + importo + descrizione + indice).
 *
 * NON tocca il DB. Usata sia dalla pagina Movimenti che da eventuali endpoint
 * di "preview" per mostrare quante rate verranno generate prima di salvare.
 */

import type { ServiceType } from "@/types";

export interface OccurrenceInput {
  type: ServiceType;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD; per installments puo' essere derivata
  amount: number; // centesimi, lordo IVA (per recurring: importo per occorrenza; per installments: TOTALE pacchetto)
  // Recurring
  intervalMonths?: number; // default 1
  // Installments
  firstPct?: number; // default 50
  offsetDays?: number; // default 60
  // Etichetta opzionale (es. nome servizio + cliente) per la description
  label?: string;
}

export interface OccurrenceOutput {
  date: string; // YYYY-MM-DD
  amount: number; // centesimi
  description: string;
  index: number;
  isFinal: boolean;
}

/**
 * Aggiunge N mesi a una data YYYY-MM-DD preservando il giorno se possibile
 * (clamp all'ultimo giorno valido del mese target — es. 31 gen + 1 mese = 28 feb).
 */
export function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;

  // Calcola anno/mese target (1-based per i mesi nel calcolo, poi convertiamo)
  const totalMonth0 = (m - 1) + months;
  const targetYear = y + Math.floor(totalMonth0 / 12);
  const targetMonth0 = ((totalMonth0 % 12) + 12) % 12; // gestisce mesi negativi
  const targetMonth = targetMonth0 + 1;

  // Ultimo giorno del mese target
  const lastDay = new Date(targetYear, targetMonth, 0).getDate();
  const targetDay = Math.min(d, lastDay);

  return `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}

/**
 * Aggiunge N giorni a una data YYYY-MM-DD.
 */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Confronto fra date YYYY-MM-DD: ritorna negativo, zero o positivo come Date.
 */
function cmpDate(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Genera le occorrenze concrete di una sottoscrizione.
 *
 * Pattern recurring:
 *   data inizio + intervallo + intervallo... finche' <= endDate (se settato)
 *   importo = amount per ogni occorrenza
 *
 * Pattern installments:
 *   2 rate. Acconto a startDate (importo = totale * firstPct/100).
 *   Saldo a startDate + offsetDays (importo = totale - acconto).
 *   endDate ignorata (la fine effettiva e' la data del saldo).
 *
 * Tutte le occorrenze hanno indice progressivo (0-based) e flag isFinal solo
 * sull'ultima generata.
 */
export function generateOccurrences(input: OccurrenceInput): OccurrenceOutput[] {
  const { type, startDate, label } = input;
  const baseLabel = label?.trim() || "Sottoscrizione";

  if (type === "installments") {
    const total = Math.max(0, input.amount || 0);
    const firstPct = Math.max(0, Math.min(100, input.firstPct ?? 50));
    const offsetDays = Math.max(0, input.offsetDays ?? 60);

    const acconto = Math.round((total * firstPct) / 100);
    const saldo = total - acconto;

    const result: OccurrenceOutput[] = [];
    if (acconto > 0 || total > 0) {
      result.push({
        date: startDate,
        amount: acconto,
        description: total > 0
          ? `${baseLabel} — acconto ${firstPct}%`
          : `${baseLabel} — acconto`,
        index: 0,
        isFinal: false,
      });
    }
    if (saldo > 0 || total > 0) {
      result.push({
        date: addDays(startDate, offsetDays),
        amount: saldo,
        description: total > 0
          ? `${baseLabel} — saldo ${100 - firstPct}%`
          : `${baseLabel} — saldo`,
        index: 1,
        isFinal: true,
      });
    }
    return result;
  }

  // Recurring
  const interval = Math.max(1, input.intervalMonths ?? 1);
  const amount = Math.max(0, input.amount || 0);
  const endDate = input.endDate || null;

  const result: OccurrenceOutput[] = [];
  let current = startDate;
  let i = 0;
  // Safety: max 240 occorrenze (20 anni mensili) per evitare loop infiniti
  const MAX_ITERATIONS = 240;
  while (i < MAX_ITERATIONS) {
    if (endDate && cmpDate(current, endDate) > 0) break;
    result.push({
      date: current,
      amount,
      description: `${baseLabel}${interval === 1 ? "" : ` (ogni ${interval} mesi)`}`,
      index: i,
      isFinal: false, // verra' settato dopo
    });
    if (!endDate) break; // se non c'e' end_date, generiamo solo la prima (per safety)
    current = addMonths(current, interval);
    i++;
  }

  // Marca l'ultima come finale
  if (result.length > 0) result[result.length - 1].isFinal = true;
  return result;
}
