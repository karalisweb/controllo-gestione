import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const STAGE_DEFAULT_PROB: Record<string, number> = {
  lead: 10,
  preventivo: 40,
  trattativa: 70,
  won: 100,
  lost: 0,
};

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "ID non valido" }, { status: 400 });

    const [existing] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Deal non trovato" }, { status: 404 });

    const body = await request.json();
    const patch: Partial<typeof deals.$inferInsert> = { updatedAt: new Date() };
    if (body.clientName !== undefined) patch.clientName = String(body.clientName).trim();
    if (body.valueCents !== undefined) {
      const v = Number(body.valueCents);
      if (!Number.isFinite(v) || v < 0) return NextResponse.json({ error: "valueCents non valido" }, { status: 400 });
      patch.valueCents = Math.round(v);
    }
    if (body.stage !== undefined) {
      const s = body.stage;
      if (!["lead", "preventivo", "trattativa", "won", "lost"].includes(s)) {
        return NextResponse.json({ error: "stage non valido" }, { status: 400 });
      }
      patch.stage = s;
      // Se l'utente non ha fornito probabilityPct e cambia stage, aggiorna prob automaticamente
      if (body.probabilityPct === undefined) {
        patch.probabilityPct = STAGE_DEFAULT_PROB[s] ?? existing.probabilityPct;
      }
    }
    if (body.probabilityPct !== undefined) {
      patch.probabilityPct = Math.min(100, Math.max(0, Math.round(Number(body.probabilityPct))));
    }
    if (body.expectedCloseDate !== undefined) patch.expectedCloseDate = body.expectedCloseDate || null;
    if (body.contactId !== undefined) patch.contactId = body.contactId;
    if (body.notes !== undefined) patch.notes = body.notes;

    const [updated] = await db.update(deals).set(patch).where(eq(deals.id, id)).returning();
    return NextResponse.json({ deal: updated });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "ID non valido" }, { status: 400 });
    await db.update(deals).set({ deletedAt: new Date() }).where(eq(deals.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
