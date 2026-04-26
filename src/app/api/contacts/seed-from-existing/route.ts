import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  contacts,
  expectedIncomes,
  expectedExpenses,
  paymentPlans,
  paymentPlanCategories,
} from "@/lib/db/schema";
import { eq, isNull, and, sql } from "drizzle-orm";

/**
 * POST /api/contacts/seed-from-existing[?clear=1]
 *
 * Crea entries in `contacts` a partire dai dati esistenti:
 *   - expected_incomes (clienti)
 *   - expected_expenses (fornitori, con normalizzazione)
 *   - payment_plans (creditori, con accorpamento FIN→Qonto)
 *
 * Idempotente: se un contatto con stesso nome+type esiste gia' non viene
 * duplicato. Per i payment_plans/expected_expenses, popola anche la FK
 * contact_id quando trova/crea il contatto corrispondente.
 *
 * Se `?clear=1`: soft-delete TUTTI i contacts esistenti e azzera tutte le FK
 * `contact_id` su expected_expenses e payment_plans, poi rifa l'import da zero.
 * Utile per ri-eseguire l'import dopo cambi nella logica di normalizzazione.
 *
 * NORMALIZZAZIONI APPLICATE:
 *
 * Su client_name (expected_incomes):
 *   "X - Dominio" → "X"  (lo stesso cliente con servizio dominio)
 *
 * Su expense.name (expected_expenses):
 *   "Dominio Y - Server Plan" → "Server Plan"  (il fornitore vero del dominio)
 *   "Server ServerPlan"       → "Server Plan"
 *   "Server Contabo"          → "Contabo"
 *   "Wind SIM Y"              → "Wind"
 *   "Stipendio Y"             → "Y" (con notes="Collaboratore")
 *   altri                     → nome originale
 *
 * Su creditor_name (payment_plans):
 *   /^FIN /i → "Qonto"  (rate Qonto su fatture collaboratori, banca creditore)
 *   altri    → nome originale
 */

function normalizeClientName(raw: string): string {
  return raw.replace(/\s*-\s*Dominio\s*$/i, "").trim();
}

interface SupplierNormalization {
  name: string;
  notes?: string;
}

function normalizeSupplierName(raw: string): SupplierNormalization {
  const trimmed = raw.trim();

  // Domini venduti tramite Server Plan (la maggior parte)
  if (/^dominio\s+.+\s-\s*server\s*plan$/i.test(trimmed)) {
    return { name: "Server Plan" };
  }

  // Server Plan diretto
  if (/^server\s*serverplan$/i.test(trimmed)) {
    return { name: "Server Plan" };
  }

  // Server Contabo (provider distinto)
  if (/^server\s+contabo$/i.test(trimmed)) {
    return { name: "Contabo" };
  }

  // Wind: tutte le SIM telefoniche → un solo fornitore
  if (/^wind\s+sim/i.test(trimmed)) {
    return { name: "Wind" };
  }

  // Stipendi → nome del collaboratore
  const stipendioMatch = trimmed.match(/^stipendio\s+(.+)$/i);
  if (stipendioMatch) {
    return { name: stipendioMatch[1].trim(), notes: "Collaboratore" };
  }

  // Default: as-is
  return { name: trimmed };
}

function normalizeCreditorName(raw: string): string {
  const trimmed = raw.trim();
  if (/^FIN\s+/i.test(trimmed)) return "Qonto";
  return trimmed;
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clear = searchParams.get("clear") === "1";

    const summary = {
      cleared: { contacts: 0, expectedExpensesUnlinked: 0, paymentPlansUnlinked: 0 },
      created: { client: 0, supplier: 0, ex_supplier: 0, other: 0 },
      skippedExisting: 0,
      paymentPlansLinked: 0,
      expectedExpensesLinked: 0,
    };

    // ───── 0. CLEAR opzionale ─────
    if (clear) {
      const cleared = await db
        .update(contacts)
        .set({ deletedAt: new Date(), isActive: false })
        .where(isNull(contacts.deletedAt))
        .returning({ id: contacts.id });
      summary.cleared.contacts = cleared.length;

      const unlinkedExp = await db
        .update(expectedExpenses)
        .set({ contactId: null })
        .where(sql`${expectedExpenses.contactId} IS NOT NULL`)
        .returning({ id: expectedExpenses.id });
      summary.cleared.expectedExpensesUnlinked = unlinkedExp.length;

      const unlinkedPP = await db
        .update(paymentPlans)
        .set({ contactId: null })
        .where(sql`${paymentPlans.contactId} IS NOT NULL`)
        .returning({ id: paymentPlans.id });
      summary.cleared.paymentPlansUnlinked = unlinkedPP.length;
    }

    // ───── 1. CLIENTI da expected_incomes ─────
    const incomeClients = await db
      .selectDistinct({ name: expectedIncomes.clientName })
      .from(expectedIncomes)
      .where(isNull(expectedIncomes.deletedAt));

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
          notes: "Importato da incassi previsti",
        });
        summary.created.client++;
      }
    }

    // ───── 2. FORNITORI da expected_expenses (con normalizzazione) ─────
    // Raccoglie le righe distinte name+costCenterId per linkare la FK
    const expenseRows = await db
      .select({
        id: expectedExpenses.id,
        name: expectedExpenses.name,
        costCenterId: expectedExpenses.costCenterId,
        contactId: expectedExpenses.contactId,
      })
      .from(expectedExpenses)
      .where(isNull(expectedExpenses.deletedAt));

    // Mappa nome-normalizzato → contactId (riusa per evitare ricerche ripetute)
    const supplierContactCache = new Map<string, number>();

    for (const exp of expenseRows) {
      const raw = exp.name?.trim();
      if (!raw) continue;

      const { name: normalizedName, notes: extraNotes } = normalizeSupplierName(raw);
      if (!normalizedName) continue;

      let contactId: number | null = exp.contactId;

      if (!contactId) {
        // Check cache
        const cached = supplierContactCache.get(normalizedName);
        if (cached) {
          contactId = cached;
        } else {
          // Cerca nel DB: stesso nome con tipo supplier-like
          const existing = await db
            .select({ id: contacts.id })
            .from(contacts)
            .where(
              and(
                eq(contacts.name, normalizedName),
                isNull(contacts.deletedAt),
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
                name: normalizedName,
                type: "supplier",
                costCenterId: exp.costCenterId,
                notes: extraNotes
                  ? `${extraNotes}. Importato da spese previste.`
                  : "Importato da spese previste",
              })
              .returning({ id: contacts.id });
            contactId = created.id;
            summary.created.supplier++;
          }
          supplierContactCache.set(normalizedName, contactId);
        }

        // Link FK su expected_expenses
        await db
          .update(expectedExpenses)
          .set({ contactId })
          .where(eq(expectedExpenses.id, exp.id));
        summary.expectedExpensesLinked++;
      }
    }

    // ───── 3. CREDITORI da payment_plans (con FIN→Qonto) ─────
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

    const creditorContactCache = new Map<string, number>();

    for (const plan of planRows) {
      const raw = plan.creditorName?.trim();
      if (!raw) continue;

      const normalizedName = normalizeCreditorName(raw);
      const cat = plan.categoryName || "";
      const inferredType: "supplier" | "ex_supplier" =
        cat.toLowerCase().includes("ex ") || cat.toLowerCase().includes("ex-")
          ? "ex_supplier"
          : "supplier";

      let contactId: number | null = plan.contactId;

      if (!contactId) {
        const cached = creditorContactCache.get(normalizedName);
        if (cached) {
          contactId = cached;
        } else {
          const existing = await db
            .select({ id: contacts.id })
            .from(contacts)
            .where(
              and(
                eq(contacts.name, normalizedName),
                isNull(contacts.deletedAt),
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
                name: normalizedName,
                type: inferredType,
                notes: `Importato da piani di rientro (categoria: ${cat || "n/d"})`,
              })
              .returning({ id: contacts.id });
            contactId = created.id;
            summary.created[inferredType]++;
          }
          creditorContactCache.set(normalizedName, contactId);
        }

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
