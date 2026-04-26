import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  subscriptions,
  contacts,
  services,
  expectedIncomes,
  revenueCenters,
} from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

/**
 * POST /api/subscriptions/migrate-from-expected-incomes
 *
 * Crea sottoscrizioni a partire dai `expected_incomes` esistenti.
 *
 * Mappatura cliente: normalizeClientName (rimuovi "- Dominio") → cerca contact
 * di tipo client con quel nome.
 *
 * Mappatura servizio: in base a revenueCenter del expected_income, sceglie
 * un servizio "default" del catalogo. L'utente potra' poi cambiare il servizio
 * assegnato dalla UI per i casi piu' specifici (es. SMM vs SEO vs Blog all'interno
 * del centro Marketing).
 *
 * Idempotente: salta se esiste gia' una subscription con stesso (contactId,
 * serviceId, startDate).
 *
 * NOTA: questa migrazione NON disattiva i `expected_incomes` originali — verra'
 * fatto in Fase 1.5 quando la pagina Movimenti usera' direttamente le subscriptions.
 */

const REVENUE_TO_SERVICE_DEFAULTS: Record<string, string> = {
  domini: "Dominio annuale",
  marketing: "SMM", // default fra i servizi marketing — l'utente cambia se serve
  "pacchetto assistenza": "Pacchetto Assistenza 10h",
  msd: "MSD pacchetto",
  "siti web": "Sito Web 50/50",
  privacy: "Privacy",
  licenze: "Elementor",
};

function normalizeClientName(raw: string): string {
  return raw.replace(/\s*-\s*Dominio\s*$/i, "").trim();
}

export async function POST() {
  try {
    const summary = {
      total: 0,
      created: 0,
      skippedExisting: 0,
      skippedNoContact: [] as string[],
      skippedNoService: [] as string[],
    };

    // Carica catalogo servizi (cerca per nome, case-insensitive)
    const allServices = await db
      .select({ id: services.id, name: services.name, type: services.type })
      .from(services)
      .where(and(isNull(services.deletedAt), eq(services.isActive, true)));
    const servicesByName = new Map(allServices.map((s) => [s.name.toLowerCase(), s]));

    // Carica anagrafica clienti
    const allClients = await db
      .select({ id: contacts.id, name: contacts.name })
      .from(contacts)
      .where(and(isNull(contacts.deletedAt), eq(contacts.type, "client")));
    const clientsByName = new Map(allClients.map((c) => [c.name.toLowerCase(), c.id]));

    // Carica revenue_centers per nome
    const allCenters = await db
      .select({ id: revenueCenters.id, name: revenueCenters.name })
      .from(revenueCenters)
      .where(isNull(revenueCenters.deletedAt));
    const centerNameById = new Map(allCenters.map((c) => [c.id, c.name.toLowerCase()]));

    // Tutti gli expected_incomes attivi
    const incomes = await db
      .select()
      .from(expectedIncomes)
      .where(and(isNull(expectedIncomes.deletedAt), eq(expectedIncomes.isActive, true)));

    summary.total = incomes.length;

    for (const inc of incomes) {
      // 1. Trova contact
      const clientName = normalizeClientName(inc.clientName);
      const contactId = clientsByName.get(clientName.toLowerCase());
      if (!contactId) {
        summary.skippedNoContact.push(clientName);
        continue;
      }

      // 2. Trova servizio dal mapping revenueCenter → service name
      const centerName = inc.revenueCenterId ? centerNameById.get(inc.revenueCenterId) : null;
      const defaultServiceName = centerName ? REVENUE_TO_SERVICE_DEFAULTS[centerName] : null;
      if (!defaultServiceName) {
        summary.skippedNoService.push(`${clientName} (centro: ${centerName || "n/d"})`);
        continue;
      }
      const service = servicesByName.get(defaultServiceName.toLowerCase());
      if (!service) {
        summary.skippedNoService.push(`${clientName} → servizio "${defaultServiceName}" non trovato`);
        continue;
      }

      // 3. Check duplicato: stessa (contactId, serviceId, startDate)
      const existing = await db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.contactId, contactId),
            eq(subscriptions.serviceId, service.id),
            eq(subscriptions.startDate, inc.startDate),
            isNull(subscriptions.deletedAt),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        summary.skippedExisting++;
        continue;
      }

      // 4. Determina customIntervalMonths se la frequency dell'expected_income
      //    non corrisponde al default del servizio
      let customIntervalMonths: number | null = null;
      if (service.type === "recurring") {
        const freqToInterval: Record<string, number> = {
          monthly: 1,
          quarterly: 3,
          semiannual: 6,
          annual: 12,
          one_time: 0, // tratteremo a parte
        };
        const wantInterval = freqToInterval[inc.frequency] ?? 1;
        if (wantInterval > 0 && wantInterval !== 1) {
          customIntervalMonths = wantInterval;
        }
      }

      // 5. Crea subscription
      await db.insert(subscriptions).values({
        contactId,
        serviceId: service.id,
        startDate: inc.startDate,
        endDate: inc.endDate || null,
        customAmount: inc.amount, // sempre, anche se uguale al default
        customIntervalMonths,
        notes: `Migrato da expected_incomes #${inc.id} (cliente "${inc.clientName}", freq ${inc.frequency})`,
      });
      summary.created++;
    }

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
