import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forecastItems } from "@/lib/db/schema";
import { inArray, isNull, and } from "drizzle-orm";

// POST - Eliminazione multipla (soft delete)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ids } = body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "Specificare almeno un ID" },
      { status: 400 }
    );
  }

  const numericIds = ids.map((id: unknown) => Number(id)).filter((id: number) => !isNaN(id));

  if (numericIds.length === 0) {
    return NextResponse.json(
      { error: "Nessun ID valido" },
      { status: 400 }
    );
  }

  // Verifica quante voci esistono e non sono già cancellate
  const existing = await db
    .select({ id: forecastItems.id })
    .from(forecastItems)
    .where(and(inArray(forecastItems.id, numericIds), isNull(forecastItems.deletedAt)));

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Nessuna voce trovata", deleted: 0 },
      { status: 404 }
    );
  }

  const existingIds = existing.map((e) => e.id);

  // Soft delete
  await db
    .update(forecastItems)
    .set({ deletedAt: new Date() })
    .where(inArray(forecastItems.id, existingIds));

  return NextResponse.json({
    message: `${existingIds.length} voci eliminate`,
    deleted: existingIds.length,
  });
}
