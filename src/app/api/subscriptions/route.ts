import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, contacts, services, revenueCenters } from "@/lib/db/schema";
import { eq, isNull, and, asc, desc } from "drizzle-orm";

/**
 * GET /api/subscriptions
 * Query: contactId, serviceId, includeInactive (=1), q (search nome cliente)
 * Risposta: array di Subscription con join contact + service + revenueCenter.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");
    const serviceId = searchParams.get("serviceId");
    const includeInactive = searchParams.get("includeInactive") === "1";

    const conditions = [isNull(subscriptions.deletedAt)];
    if (!includeInactive) conditions.push(eq(subscriptions.isActive, true));
    if (contactId) conditions.push(eq(subscriptions.contactId, parseInt(contactId, 10)));
    if (serviceId) conditions.push(eq(subscriptions.serviceId, parseInt(serviceId, 10)));

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
          revenueCenterId: services.revenueCenterId,
        },
        revenueCenter: { id: revenueCenters.id, name: revenueCenters.name, color: revenueCenters.color },
      })
      .from(subscriptions)
      .leftJoin(contacts, eq(subscriptions.contactId, contacts.id))
      .leftJoin(services, eq(subscriptions.serviceId, services.id))
      .leftJoin(revenueCenters, eq(services.revenueCenterId, revenueCenters.id))
      .where(and(...conditions))
      .orderBy(asc(contacts.name), desc(subscriptions.startDate));

    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/subscriptions
 * Body: { contactId, serviceId, startDate, endDate?, customAmount?, customIntervalMonths?,
 *         customFirstPct?, customOffsetDays?, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      contactId,
      serviceId,
      startDate,
      endDate,
      customAmount,
      customIntervalMonths,
      customFirstPct,
      customOffsetDays,
      notes,
    } = body;

    if (!contactId) return NextResponse.json({ error: "contactId obbligatorio" }, { status: 400 });
    if (!serviceId) return NextResponse.json({ error: "serviceId obbligatorio" }, { status: 400 });
    if (!startDate || typeof startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json({ error: "startDate obbligatoria (YYYY-MM-DD)" }, { status: 400 });
    }
    if (endDate && (typeof endDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(endDate))) {
      return NextResponse.json({ error: "endDate non valida (YYYY-MM-DD)" }, { status: 400 });
    }

    // Verifica esistenza contact + service
    const [contact] = await db.select({ id: contacts.id }).from(contacts).where(and(eq(contacts.id, contactId), isNull(contacts.deletedAt))).limit(1);
    if (!contact) return NextResponse.json({ error: "Contatto non trovato" }, { status: 404 });
    const [service] = await db.select({ id: services.id }).from(services).where(and(eq(services.id, serviceId), isNull(services.deletedAt))).limit(1);
    if (!service) return NextResponse.json({ error: "Servizio non trovato" }, { status: 404 });

    const [created] = await db
      .insert(subscriptions)
      .values({
        contactId: Number(contactId),
        serviceId: Number(serviceId),
        startDate,
        endDate: endDate || null,
        customAmount: customAmount !== undefined && customAmount !== null && customAmount !== "" ? Number(customAmount) : null,
        customIntervalMonths: customIntervalMonths !== undefined && customIntervalMonths !== null && customIntervalMonths !== "" ? Number(customIntervalMonths) : null,
        customFirstPct: customFirstPct !== undefined && customFirstPct !== null && customFirstPct !== "" ? Number(customFirstPct) : null,
        customOffsetDays: customOffsetDays !== undefined && customOffsetDays !== null && customOffsetDays !== "" ? Number(customOffsetDays) : null,
        notes: notes || null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
