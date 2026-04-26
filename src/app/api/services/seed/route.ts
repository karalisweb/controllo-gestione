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
  // recurring
  defaultIntervalMonths?: number;
  // installments
  defaultFirstPct?: number;
  defaultOffsetDays?: number;
}

const CATALOG: SeedSpec[] = [
  {
    name: "Marketing mensile",
    type: "recurring",
    revenueCenterName: "Marketing",
    description: "Servizio marketing ricorrente con cadenza mensile",
    defaultIntervalMonths: 1,
  },
  {
    name: "Marketing trimestrale",
    type: "recurring",
    revenueCenterName: "Marketing",
    description: "Servizio marketing ricorrente con cadenza trimestrale",
    defaultIntervalMonths: 3,
  },
  {
    name: "Pacchetto Assistenza",
    type: "recurring",
    revenueCenterName: "Pacchetto Assistenza",
    description: "Pacchetto assistenza ricorrente mensile",
    defaultIntervalMonths: 1,
  },
  {
    name: "Dominio annuale",
    type: "recurring",
    revenueCenterName: "Domini",
    description: "Rinnovo dominio annuale",
    defaultIntervalMonths: 12,
  },
  {
    name: "Sito Web 50/50",
    type: "installments",
    revenueCenterName: "Siti Web",
    description: "Sito web con acconto 50% e saldo 50% a delivery (default 60gg)",
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
      created: 0,
      skippedExisting: 0,
      missingRevenueCenter: [] as string[],
    };

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
        defaultAmount: 0,
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
