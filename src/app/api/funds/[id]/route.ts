import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { funds } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/funds/[id]
 * Body: { currentCents?, targetCents?, notes?, name? }
 * Aggiorna i campi passati. Per "liquid" l'utente può anche cambiare il target.
 * Per "emergency" il target null = automatico (3 × spese fisse mensili).
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "ID non valido" }, { status: 400 });

    const body = await request.json();
    const { currentCents, targetCents, notes, name } = body ?? {};

    const [existing] = await db.select().from(funds).where(eq(funds.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Fondo non trovato" }, { status: 404 });

    const patch: Partial<typeof funds.$inferInsert> = { updatedAt: new Date() };
    if (currentCents !== undefined) {
      const v = Number(currentCents);
      if (!Number.isFinite(v) || v < 0) return NextResponse.json({ error: "currentCents non valido" }, { status: 400 });
      patch.currentCents = Math.round(v);
    }
    if (targetCents !== undefined) {
      if (targetCents === null) {
        patch.targetCents = null;
      } else {
        const v = Number(targetCents);
        if (!Number.isFinite(v) || v < 0) return NextResponse.json({ error: "targetCents non valido" }, { status: 400 });
        patch.targetCents = Math.round(v);
      }
    }
    if (notes !== undefined) patch.notes = notes ?? null;
    if (name !== undefined) patch.name = String(name);

    const [updated] = await db.update(funds).set(patch).where(eq(funds.id, id)).returning();
    return NextResponse.json({ fund: updated });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
