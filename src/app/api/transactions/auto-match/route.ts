import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, contacts, costCenters, revenueCenters } from "@/lib/db/schema";
import { isNull, and } from "drizzle-orm";

/**
 * GET /api/transactions/auto-match
 *
 * Restituisce le transazioni senza contatto associato + un suggerimento di
 * matching basato sulla descrizione:
 *   - Per uscite (amount < 0): cerca tra fornitori/ex_supplier; eredita costCenterId del contatto.
 *   - Per entrate (amount > 0): cerca tra clienti; eredita revenueCenterId.
 *   - Fallback: se nessun contatto matcha, prova a matchare un centro direttamente per nome.
 *
 * Strategia: substring case-insensitive, vince il match più lungo (più specifico).
 * Soglia minima nome: 3 caratteri.
 */

interface MatchSuggestion {
  contactId: number | null;
  contactName: string | null;
  costCenterId: number | null;
  costCenterName: string | null;
  revenueCenterId: number | null;
  revenueCenterName: string | null;
  matchedOn: "contact" | "center" | null;
}

interface UncategorizedTransaction {
  id: number;
  date: string;
  description: string | null;
  amount: number;
  currentContactId: number | null;
  currentCostCenterId: number | null;
  currentRevenueCenterId: number | null;
  suggestion: MatchSuggestion;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

export async function GET() {
  try {
    // 1. Carica transactions senza contactId (deletedAt nullo)
    const txs = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        description: transactions.description,
        amount: transactions.amount,
        contactId: transactions.contactId,
        costCenterId: transactions.costCenterId,
        revenueCenterId: transactions.revenueCenterId,
      })
      .from(transactions)
      .where(
        and(
          isNull(transactions.deletedAt),
          isNull(transactions.contactId),
        ),
      );

    // 2. Carica anagrafiche per il match
    const allContacts = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        type: contacts.type,
        costCenterId: contacts.costCenterId,
        revenueCenterId: contacts.revenueCenterId,
      })
      .from(contacts)
      .where(isNull(contacts.deletedAt));

    const allCostCenters = await db
      .select({ id: costCenters.id, name: costCenters.name })
      .from(costCenters)
      .where(isNull(costCenters.deletedAt));

    const allRevenueCenters = await db
      .select({ id: revenueCenters.id, name: revenueCenters.name })
      .from(revenueCenters)
      .where(isNull(revenueCenters.deletedAt));

    const costCenterById = new Map(allCostCenters.map((c) => [c.id, c.name]));
    const revenueCenterById = new Map(allRevenueCenters.map((r) => [r.id, r.name]));

    // 3. Match per ogni transazione
    const result: UncategorizedTransaction[] = txs.map((tx) => {
      const desc = tx.description ? normalize(tx.description) : "";
      const isExpense = tx.amount < 0;

      const suggestion: MatchSuggestion = {
        contactId: null,
        contactName: null,
        costCenterId: null,
        costCenterName: null,
        revenueCenterId: null,
        revenueCenterName: null,
        matchedOn: null,
      };

      if (!desc) {
        return {
          id: tx.id,
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          currentContactId: tx.contactId,
          currentCostCenterId: tx.costCenterId,
          currentRevenueCenterId: tx.revenueCenterId,
          suggestion,
        };
      }

      // Match contatto
      const contactCandidates = isExpense
        ? allContacts.filter((c) => c.type === "supplier" || c.type === "ex_supplier")
        : allContacts.filter((c) => c.type === "client");

      let bestContact: typeof allContacts[number] | null = null;
      let bestLen = 0;
      for (const c of contactCandidates) {
        const name = normalize(c.name);
        if (name.length < 3) continue;
        if (desc.includes(name) && name.length > bestLen) {
          bestContact = c;
          bestLen = name.length;
        }
      }

      if (bestContact) {
        suggestion.contactId = bestContact.id;
        suggestion.contactName = bestContact.name;
        suggestion.matchedOn = "contact";
        if (isExpense && bestContact.costCenterId) {
          suggestion.costCenterId = bestContact.costCenterId;
          suggestion.costCenterName = costCenterById.get(bestContact.costCenterId) || null;
        }
        if (!isExpense && bestContact.revenueCenterId) {
          suggestion.revenueCenterId = bestContact.revenueCenterId;
          suggestion.revenueCenterName = revenueCenterById.get(bestContact.revenueCenterId) || null;
        }
      } else {
        // Fallback: match diretto su centri
        const centers = isExpense ? allCostCenters : allRevenueCenters;
        let bestCenter: { id: number; name: string } | null = null;
        let bestCLen = 0;
        for (const c of centers) {
          const name = normalize(c.name);
          if (name.length < 3) continue;
          if (desc.includes(name) && name.length > bestCLen) {
            bestCenter = c;
            bestCLen = name.length;
          }
        }
        if (bestCenter) {
          suggestion.matchedOn = "center";
          if (isExpense) {
            suggestion.costCenterId = bestCenter.id;
            suggestion.costCenterName = bestCenter.name;
          } else {
            suggestion.revenueCenterId = bestCenter.id;
            suggestion.revenueCenterName = bestCenter.name;
          }
        }
      }

      return {
        id: tx.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        currentContactId: tx.contactId,
        currentCostCenterId: tx.costCenterId,
        currentRevenueCenterId: tx.revenueCenterId,
        suggestion,
      };
    });

    // Ordina per data desc (più recenti in cima)
    result.sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({
      total: result.length,
      withMatch: result.filter((r) => r.suggestion.matchedOn !== null).length,
      withoutMatch: result.filter((r) => r.suggestion.matchedOn === null).length,
      transactions: result,
      contacts: allContacts,
      costCenters: allCostCenters,
      revenueCenters: allRevenueCenters,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
