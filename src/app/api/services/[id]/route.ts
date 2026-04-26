import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services, revenueCenters } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "ID non valido" }, { status: 400 });

    const rows = await db
      .select({
        id: services.id,
        name: services.name,
        type: services.type,
        revenueCenterId: services.revenueCenterId,
        description: services.description,
        defaultAmount: services.defaultAmount,
        defaultIntervalMonths: services.defaultIntervalMonths,
        defaultFirstPct: services.defaultFirstPct,
        defaultOffsetDays: services.defaultOffsetDays,
        isActive: services.isActive,
        createdAt: services.createdAt,
        revenueCenter: {
          id: revenueCenters.id,
          name: revenueCenters.name,
          color: revenueCenters.color,
        },
      })
      .from(services)
      .leftJoin(revenueCenters, eq(services.revenueCenterId, revenueCenters.id))
      .where(and(eq(services.id, id), isNull(services.deletedAt)))
      .limit(1);

    if (rows.length === 0) return NextResponse.json({ error: "Servizio non trovato" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "ID non valido" }, { status: 400 });

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim() === "") {
        return NextResponse.json({ error: "Nome non puo' essere vuoto" }, { status: 400 });
      }
      updates.name = body.name.trim();
    }
    if (body.type !== undefined) {
      if (!["recurring", "installments"].includes(body.type)) {
        return NextResponse.json({ error: "Type non valido" }, { status: 400 });
      }
      updates.type = body.type;
    }
    if (body.revenueCenterId !== undefined) updates.revenueCenterId = body.revenueCenterId || null;
    if (body.description !== undefined) updates.description = body.description || null;
    if (body.defaultAmount !== undefined) updates.defaultAmount = Number(body.defaultAmount) || 0;
    if (body.defaultIntervalMonths !== undefined) {
      const n = Number(body.defaultIntervalMonths);
      if (!Number.isFinite(n) || n < 1 || n > 120) return NextResponse.json({ error: "Intervallo mesi non valido (1-120)" }, { status: 400 });
      updates.defaultIntervalMonths = n;
    }
    if (body.defaultFirstPct !== undefined) {
      const p = Number(body.defaultFirstPct);
      if (!Number.isFinite(p) || p < 0 || p > 100) return NextResponse.json({ error: "Percentuale acconto non valida (0-100)" }, { status: 400 });
      updates.defaultFirstPct = p;
    }
    if (body.defaultOffsetDays !== undefined) {
      const d = Number(body.defaultOffsetDays);
      if (!Number.isFinite(d) || d < 0 || d > 3650) return NextResponse.json({ error: "Offset giorni non valido" }, { status: 400 });
      updates.defaultOffsetDays = d;
    }
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nessun campo da aggiornare" }, { status: 400 });
    }

    const [updated] = await db
      .update(services)
      .set(updates)
      .where(and(eq(services.id, id), isNull(services.deletedAt)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Servizio non trovato" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "ID non valido" }, { status: 400 });

    const [deleted] = await db
      .update(services)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(services.id, id), isNull(services.deletedAt)))
      .returning({ id: services.id });

    if (!deleted) return NextResponse.json({ error: "Servizio non trovato o gia' eliminato" }, { status: 404 });
    return NextResponse.json({ success: true, id: deleted.id });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
