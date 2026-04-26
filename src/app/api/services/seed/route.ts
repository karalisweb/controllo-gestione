import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services, revenueCenters } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

/**
 * POST /api/services/seed
 *
 * Crea un catalogo iniziale di servizi se mancanti. Idempotente: salta i
 * servizi gia' presenti con stesso nome.
 *
 * Mappa per `revenue_center_name` (lookup case-insensitive sul nome del centro)
 * per legare il servizio al centro di ricavo corretto. Se il centro non esiste
 * il servizio viene creato comunque ma senza FK.
 */

interface SeedSpec {
  name: string;
  type: "recurring" | "installments";
  revenueCenterName: string;
  description?: string;
  // Importo lordo IVA in centesimi (0 = variabile per cliente)
  defaultAmountCents?: number;
  // recurring
  defaultIntervalMonths?: number;
  // installments
  defaultFirstPct?: number;
  defaultOffsetDays?: number;
}

// Nomi di servizi precedenti che vanno deprecati (soft-delete) all'esecuzione
// del seed, perche' sostituiti da pacchetti piu' specifici.
const DEPRECATED_NAMES = ["Marketing mensile", "Marketing trimestrale"];

// Tutti gli importi sono LORDI IVA (la lordizzazione da netto x1.22 e' gia'
// stata fatta a tavolino sui valori del listino "Singolo OK" dell'Excel).
const CATALOG: SeedSpec[] = [
  // ═══ MARKETING - 8 pacchetti specifici da listino ═══
  {
    name: "SMM",
    type: "recurring",
    revenueCenterName: "Marketing",
    description: "Social Media Management mensile (260€ netto/mese)",
    defaultAmountCents: 31720, // 260 * 1.22
    defaultIntervalMonths: 1,
  },
  {
    name: "GMB",
    type: "recurring",
    revenueCenterName: "Marketing",
    description: "Google My Business mensile (120€ netto/mese)",
    defaultAmountCents: 14640, // 120 * 1.22
    defaultIntervalMonths: 1,
  },
  {
    name: "ADS Boost Post",
    type: "recurring",
    revenueCenterName: "Marketing",
    description: "Boost post mensile (260€ netto/mese)",
    defaultAmountCents: 31720,
    defaultIntervalMonths: 1,
  },
  {
    name: "Blog",
    type: "recurring",
    revenueCenterName: "Marketing",
    description: "Articoli blog mensili (120€ netto/mese)",
    defaultAmountCents: 14640,
    defaultIntervalMonths: 1,
  },
  {
    name: "SEO",
    type: "recurring",
    revenueCenterName: "Marketing",
    description: "Ottimizzazione SEO mensile (290€ netto/mese)",
    defaultAmountCents: 35380, // 290 * 1.22
    defaultIntervalMonths: 1,
  },
  {
    name: "Meta Ads Traffico",
    type: "recurring",
    revenueCenterName: "Marketing",
    description: "Campagne Meta Ads traffico mensili (260€ netto/mese)",
    defaultAmountCents: 31720,
    defaultIntervalMonths: 1,
  },
  {
    name: "Google ADS",
    type: "recurring",
    revenueCenterName: "Marketing",
    description: "Campagne Google ADS mensili (320€ netto/mese)",
    defaultAmountCents: 39040, // 320 * 1.22
    defaultIntervalMonths: 1,
  },
  {
    name: "Lead Gen",
    type: "recurring",
    revenueCenterName: "Marketing",
    description: "Generazione lead mensile (320€ netto/mese)",
    defaultAmountCents: 39040,
    defaultIntervalMonths: 1,
  },

  // ═══ PACCHETTO ASSISTENZA - 4 tier per ore prepagate ═══
  {
    name: "Pacchetto Assistenza 10h",
    type: "recurring",
    revenueCenterName: "Pacchetto Assistenza",
    description: "10 ore di assistenza prepagate (50€/h netto = 500€ netto)",
    defaultAmountCents: 61000, // 500 * 1.22
    defaultIntervalMonths: 1,
  },
  {
    name: "Pacchetto Assistenza 20h",
    type: "recurring",
    revenueCenterName: "Pacchetto Assistenza",
    description: "20 ore di assistenza prepagate (45€/h netto = 900€ netto)",
    defaultAmountCents: 109800, // 900 * 1.22
    defaultIntervalMonths: 1,
  },
  {
    name: "Pacchetto Assistenza 30h",
    type: "recurring",
    revenueCenterName: "Pacchetto Assistenza",
    description: "30 ore di assistenza prepagate (40€/h netto = 1.200€ netto)",
    defaultAmountCents: 146400, // 1200 * 1.22
    defaultIntervalMonths: 1,
  },
  {
    name: "Pacchetto Assistenza 40h",
    type: "recurring",
    revenueCenterName: "Pacchetto Assistenza",
    description: "40 ore di assistenza prepagate (35€/h netto = 1.400€ netto)",
    defaultAmountCents: 170800, // 1400 * 1.22
    defaultIntervalMonths: 1,
  },

  // ═══ DOMINI ═══
  {
    name: "Dominio annuale",
    type: "recurring",
    revenueCenterName: "Domini",
    description: "Rinnovo dominio annuale (importo variabile per cliente)",
    defaultIntervalMonths: 12,
  },

  // ═══ LICENZE / SOFTWARE ANNUALI ═══
  {
    name: "Elementor",
    type: "recurring",
    revenueCenterName: "Licenze",
    description: "Licenza Elementor annuale (70€ netto/anno)",
    defaultAmountCents: 8540, // 70 * 1.22
    defaultIntervalMonths: 12,
  },

  // ═══ PRIVACY ═══
  {
    name: "Privacy",
    type: "recurring",
    revenueCenterName: "Privacy",
    description: "Servizio gestione privacy annuale (80€ netto/anno)",
    defaultAmountCents: 9760, // 80 * 1.22
    defaultIntervalMonths: 12,
  },

  // ═══ ACCONTO + SALDO ═══
  {
    name: "Sito Web 50/50",
    type: "installments",
    revenueCenterName: "Siti Web",
    description: "Sito web: acconto 50% + saldo 50% a delivery (default 60gg)",
    defaultFirstPct: 50,
    defaultOffsetDays: 60,
  },
  {
    name: "MSD pacchetto",
    type: "installments",
    revenueCenterName: "MSD",
    description: "Pacchetto MSD: acconto 30% + saldo 70% a 14gg",
    defaultFirstPct: 30,
    defaultOffsetDays: 14,
  },
];

export async function POST() {
  try {
    const summary = {
      deprecated: 0,
      created: 0,
      skippedExisting: 0,
      missingRevenueCenter: [] as string[],
    };

    // ───── Pre-step: deprecata vecchi servizi generici sostituiti ─────
    for (const name of DEPRECATED_NAMES) {
      const existing = await db
        .select({ id: services.id })
        .from(services)
        .where(and(eq(services.name, name), isNull(services.deletedAt)))
        .limit(1);
      if (existing.length > 0) {
        await db
          .update(services)
          .set({ deletedAt: new Date(), isActive: false })
          .where(eq(services.id, existing[0].id));
        summary.deprecated++;
      }
    }

    // Carica revenue centers attivi per lookup case-insensitive
    const centers = await db
      .select({ id: revenueCenters.id, name: revenueCenters.name })
      .from(revenueCenters)
      .where(isNull(revenueCenters.deletedAt));
    const centersByName = new Map(centers.map((c) => [c.name.toLowerCase(), c.id]));

    for (const spec of CATALOG) {
      // Check duplicato
      const existing = await db
        .select({ id: services.id })
        .from(services)
        .where(
          and(eq(services.name, spec.name), isNull(services.deletedAt)),
        )
        .limit(1);

      if (existing.length > 0) {
        summary.skippedExisting++;
        continue;
      }

      const revenueCenterId = centersByName.get(spec.revenueCenterName.toLowerCase()) || null;
      if (!revenueCenterId) summary.missingRevenueCenter.push(`${spec.name} → ${spec.revenueCenterName}`);

      await db.insert(services).values({
        name: spec.name,
        type: spec.type,
        revenueCenterId,
        description: spec.description ?? null,
        defaultAmount: spec.defaultAmountCents ?? 0,
        defaultIntervalMonths: spec.defaultIntervalMonths ?? 1,
        defaultFirstPct: spec.defaultFirstPct ?? 50,
        defaultOffsetDays: spec.defaultOffsetDays ?? 60,
      });
      summary.created++;
    }

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
