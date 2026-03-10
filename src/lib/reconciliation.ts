/**
 * Algoritmo di riconciliazione Previsionale ↔ Consuntivo
 *
 * Cerca corrispondenze tra transazioni reali e voci del forecast.
 * Non decide mai automaticamente — propone match che l'utente conferma.
 */

import { db } from "@/lib/db";
import { forecastItems, transactions } from "@/lib/db/schema";
import { eq, and, isNull, gte, lte } from "drizzle-orm";

export type MatchConfidence = "high" | "medium";

export interface ForecastMatch {
  forecastItemId: number;
  forecastDescription: string;
  forecastAmount: number; // centesimi
  forecastDate: string;
  confidence: MatchConfidence;
  dateDistance: number; // giorni di distanza
}

/**
 * Calcola la distanza in giorni tra due date YYYY-MM-DD
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Confronto fuzzy tra nome controparte bancaria e descrizione forecast
 * Restituisce true se c'è una corrispondenza ragionevole
 */
function namesMatch(counterparty: string, forecastDescription: string): boolean {
  const cp = counterparty.toLowerCase().trim();
  const fd = forecastDescription.toLowerCase().trim();

  // Match esatto
  if (cp === fd) return true;

  // Uno contiene l'altro
  if (cp.includes(fd) || fd.includes(cp)) return true;

  // Confronto parole significative (almeno 4 caratteri)
  const cpWords = cp
    .split(/[\s\-_.,&]+/)
    .filter((w) => w.length >= 4);
  const fdWords = fd
    .split(/[\s\-_.,&]+/)
    .filter((w) => w.length >= 4);

  // Se almeno una parola significativa combacia
  for (const cpWord of cpWords) {
    for (const fdWord of fdWords) {
      if (
        cpWord === fdWord ||
        cpWord.includes(fdWord) ||
        fdWord.includes(cpWord)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Cerca il miglior match nel forecast per una transazione
 *
 * Regole:
 * - Importo deve essere esatto (valore assoluto)
 * - Data deve essere entro ±7 giorni
 * - HIGH: importo esatto + data ±3gg + nome simile
 * - MEDIUM: importo esatto + data ±7gg
 * - Se più match, prende quello con data più vicina
 */
export async function findForecastMatch(
  transactionDate: string,
  transactionAmount: number, // centesimi (positivo o negativo)
  counterparty: string
): Promise<ForecastMatch | null> {
  const absAmount = Math.abs(transactionAmount);
  const type = transactionAmount > 0 ? "income" : "expense";

  // Calcola range date: ±7 giorni
  const txDate = new Date(transactionDate);
  const minDate = new Date(txDate);
  minDate.setDate(minDate.getDate() - 7);
  const maxDate = new Date(txDate);
  maxDate.setDate(maxDate.getDate() + 7);

  const minDateStr = minDate.toISOString().split("T")[0];
  const maxDateStr = maxDate.toISOString().split("T")[0];

  // Cerca forecast items candidati
  const candidates = await db
    .select()
    .from(forecastItems)
    .where(
      and(
        eq(forecastItems.type, type),
        eq(forecastItems.amount, absAmount),
        eq(forecastItems.isRealized, false),
        isNull(forecastItems.deletedAt),
        gte(forecastItems.date, minDateStr),
        lte(forecastItems.date, maxDateStr)
      )
    );

  if (candidates.length === 0) return null;

  // Valuta ogni candidato
  let bestMatch: ForecastMatch | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const dateDistance = daysBetween(transactionDate, candidate.date);
    const nameMatch = namesMatch(counterparty, candidate.description);

    // Calcola score: distanza bassa + nome match = score alto
    let score = 100 - dateDistance * 10; // base: penalizza distanza
    if (nameMatch) score += 50; // bonus nome

    // Determina confidenza
    let confidence: MatchConfidence;
    if (dateDistance <= 3 && nameMatch) {
      confidence = "high";
    } else {
      confidence = "medium";
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        forecastItemId: candidate.id,
        forecastDescription: candidate.description,
        forecastAmount: candidate.amount,
        forecastDate: candidate.date,
        confidence,
        dateDistance,
      };
    }
  }

  return bestMatch;
}

/**
 * Conferma la riconciliazione tra una transazione e un forecast item
 */
export async function reconcileTransaction(
  transactionId: number,
  forecastItemId: number
): Promise<void> {
  // Segna il forecast come realizzato
  await db
    .update(forecastItems)
    .set({
      matchedTransactionId: transactionId,
      isRealized: true,
      updatedAt: new Date(),
    })
    .where(eq(forecastItems.id, forecastItemId));

  // Segna la transazione come verificata
  await db
    .update(transactions)
    .set({
      isVerified: true,
    })
    .where(eq(transactions.id, transactionId));
}

/**
 * Trova forecast items scaduti e non realizzati (segnali d'allarme)
 * Es: incassi previsti ma non ricevuti, spese previste ma non pagate
 */
export async function findUnmatchedForecasts(beforeDate: string) {
  const results = await db
    .select()
    .from(forecastItems)
    .where(
      and(
        lte(forecastItems.date, beforeDate),
        eq(forecastItems.isRealized, false),
        isNull(forecastItems.deletedAt)
      )
    );

  return {
    missedIncomes: results.filter((r) => r.type === "income"),
    unpaidExpenses: results.filter((r) => r.type === "expense"),
  };
}
