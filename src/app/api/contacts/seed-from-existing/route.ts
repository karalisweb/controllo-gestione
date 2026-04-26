import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  contacts,
  expectedIncomes,
  paymentPlans,
  paymentPlanCategories,
} from "@/lib/db/schema";
import { eq, isNull, and, sql } from "drizzle-orm";

/**
 * POST /api/contacts/seed-from-existing
 *
 * Crea entries in `contacts` a partire dai dati gia' presenti nelle tabelle
 * legacy: expected_incomes (clienti) e payment_plans (creditori).
 *
 * Idempotente: se un contatto con stesso `name + type` esiste gia' non viene
 * duplicato. Per i payment_plans, popola anche la FK contact_id.
 *
 * NB: i fornitori dei `expected_expenses` NON vengono seedati automaticamente
 * perche' i nomi sono spesso descrizioni piu' che fornitori (es. "Stipendio
 * Stefano", "Wind SIM Daniela"). L'utente li aggiungera' a mano dalla UI o
 * verranno collegati al momento della migrazione delle sottoscrizioni.
 *
 * NORMALIZZAZIONE: il suffisso "- Dominio" sui client_name viene rimosso
 * (es. "Cambarau - Dominio" → "Cambarau") perche' rappresenta un servizio
 * dello stesso cliente, non un cliente separato. Cosi' "Cambarau" e
 * "Cambarau - Dominio" vengono fusi in un unico contatto.
 */
function normalizeClientName(raw: string): string {
  return raw.replace(/\s*-\s*Dominio\s*$/i, "").trim();
}

export async function POST() {
  try {
    const summary = {
      created: { client: 0, supplier: 0, ex_supplier: 0, other: 0 },
      skippedExisting: 0,
      paymentPlansLinked: 0,
    };

    // ───── 1. CLIENTI da expected_incomes ─────
    const incomeClients = await db
      .selectDistinct({ name: expectedIncomes.clientName })
      .from(expectedIncomes)
      .where(isNull(expectedIncomes.deletedAt));

    // De-duplica nomi normalizzati (Set) prima dell'iterazione
    const normalizedClientNames = new Set<string>();
    for (const row of incomeClients) {
      const raw = row.name?.trim();
      if (!raw) continue;
      const normalized = normalizeClientName(raw);
      if (normalized) normalizedClientNames.add(normalized);
    }

    for (const name of normalizedClientNames) {
      const exists = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(
          and(
            eq(contacts.name, name),
            eq(contacts.type, "client"),
            isNull(contacts.deletedAt),
          ),
        )
        .limit(1);

      if (exists.length > 0) {
        summary.skippedExisting++;
      } else {
        await db.insert(contacts).values({
          name,
          type: "client",
          notes: "Importato da expected_incomes",
        });
        summary.created.client++;
      }
    }

    // ───── 2. CREDITORI da payment_plans ─────
    // Mappa categoria (Ex Fornitore / Fornitore Attuale / Finanziamento Qonto)
    // al tipo contact (ex_supplier / supplier / supplier).
    const planRows = await db
      .select({
        id: paymentPlans.id,
        creditorName: paymentPlans.creditorName,
        contactId: paymentPlans.contactId,
        categoryName: paymentPlanCategories.name,
      })
      .from(paymentPlans)
      .leftJoin(
        paymentPlanCategories,
        eq(paymentPlans.categoryId, paymentPlanCategories.id),
      )
      .where(isNull(paymentPlans.deletedAt));

    for (const plan of planRows) {
      const name = plan.creditorName?.trim();
      if (!name) continue;

      const cat = plan.categoryName || "";
      const inferredType: "client" | "supplier" | "ex_supplier" | "other" =
        cat.toLowerCase().includes("ex ") || cat.toLowerCase().includes("ex-")
          ? "ex_supplier"
          : "supplier";

      // Trova o crea il contact
      let contactId: number | null = plan.contactId;

      if (!contactId) {
        const existing = await db
          .select({ id: contacts.id })
          .from(contacts)
          .where(
            and(
              eq(contacts.name, name),
              isNull(contacts.deletedAt),
              // accetta qualsiasi tipo "supplier-like" gia' presente
              sql`${contacts.type} IN ('supplier', 'ex_supplier')`,
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          contactId = existing[0].id;
          summary.skippedExisting++;
        } else {
          const [created] = await db
            .insert(contacts)
            .values({
              name,
              type: inferredType,
              notes: `Importato da payment_plans (categoria: ${cat || "n/d"})`,
            })
            .returning({ id: contacts.id });
          contactId = created.id;
          summary.created[inferredType]++;
        }

        // Link FK su payment_plans
        await db
          .update(paymentPlans)
          .set({ contactId })
          .where(eq(paymentPlans.id, plan.id));
        summary.paymentPlansLinked++;
      }
    }

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
