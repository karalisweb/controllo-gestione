import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, contacts, services, revenueCenters } from "@/lib/db/schema";
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
        id: subscriptions.id,
        contactId: subscriptions.contactId,
        serviceId: subscriptions.serviceId,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        customAmount: subscriptions.customAmount,
        customIntervalMonths: subscriptions.customIntervalMonths,
        customFirstPct: subscriptions.customFirstPct,
        customOffsetDays: subscriptions.customOffsetDays,
        notes: subscriptions.notes,
        isActive: subscriptions.isActive,
        createdAt: subscriptions.createdAt,
        contact: { id: contacts.id, name: contacts.name, type: contacts.type },
        service: {
          id: services.id,
          name: services.name,
          type: services.type,
          defaultAmount: services.defaultAmount,
          defaultIntervalMonths: services.defaultIntervalMonths,
          defaultFirstPct: services.defaultFirstPct,
          defaultOffsetDays: services.defaultOffsetDays,
        },
        revenueCenter: { id: revenueCenters.id, name: revenueCenters.name, color: revenueCenters.color },
      })
      .from(subscriptions)
      .leftJoin(contacts, eq(subscriptions.contactId, contacts.id))
      .leftJoin(services, eq(subscriptions.serviceId, services.id))
      .leftJoin(revenueCenters, eq(services.revenueCenterId, revenueCenters.id))
      .where(and(eq(subscriptions.id, id), isNull(subscriptions.deletedAt)))
      .limit(1);

    if (rows.length === 0) return NextResponse.json({ error: "Sottoscrizione non trovata" }, { status: 404 });
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

    if (body.contactId !== undefined) updates.contactId = Number(body.contactId);
    if (body.serviceId !== undefined) updates.serviceId = Number(body.serviceId);
    if (body.startDate !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) return NextResponse.json({ error: "startDate non valida" }, { status: 400 });
      updates.startDate = body.startDate;
    }
    if (body.endDate !== undefined) {
      if (body.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.endDate)) return NextResponse.json({ error: "endDate non valida" }, { status: 400 });
      updates.endDate = body.endDate || null;
    }
    if (body.customAmount !== undefined) updates.customAmount = body.customAmount !== null && body.customAmount !== "" ? Number(body.customAmount) : null;
    if (body.customIntervalMonths !== undefined) updates.customIntervalMonths = body.customIntervalMonths !== null && body.customIntervalMonths !== "" ? Number(body.customIntervalMonths) : null;
    if (body.customFirstPct !== undefined) updates.customFirstPct = body.customFirstPct !== null && body.customFirstPct !== "" ? Number(body.customFirstPct) : null;
    if (body.customOffsetDays !== undefined) updates.customOffsetDays = body.customOffsetDays !== null && body.customOffsetDays !== "" ? Number(body.customOffsetDays) : null;
    if (body.notes !== undefined) updates.notes = body.notes || null;
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nessun campo da aggiornare" }, { status: 400 });
    }

    const [updated] = await db
      .update(subscriptions)
      .set(updates)
      .where(and(eq(subscriptions.id, id), isNull(subscriptions.deletedAt)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Sottoscrizione non trovata" }, { status: 404 });
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
      .update(subscriptions)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(subscriptions.id, id), isNull(subscriptions.deletedAt)))
      .returning({ id: subscriptions.id });

    if (!deleted) return NextResponse.json({ error: "Sottoscrizione non trovata o gia' eliminata" }, { status: 404 });
    return NextResponse.json({ success: true, id: deleted.id });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
