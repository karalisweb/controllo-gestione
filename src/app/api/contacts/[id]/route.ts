import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contacts, costCenters, revenueCenters } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/contacts/[id]
 * Restituisce dettaglio contatto con join al costCenter.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "ID non valido" }, { status: 400 });
    }

    const rows = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        type: contacts.type,
        email: contacts.email,
        phone: contacts.phone,
        costCenterId: contacts.costCenterId,
        revenueCenterId: contacts.revenueCenterId,
        isMovable: contacts.isMovable,
        notes: contacts.notes,
        isActive: contacts.isActive,
        createdAt: contacts.createdAt,
        costCenter: {
          id: costCenters.id,
          name: costCenters.name,
          color: costCenters.color,
        },
        revenueCenter: {
          id: revenueCenters.id,
          name: revenueCenters.name,
          color: revenueCenters.color,
        },
      })
      .from(contacts)
      .leftJoin(costCenters, eq(contacts.costCenterId, costCenters.id))
      .leftJoin(revenueCenters, eq(contacts.revenueCenterId, revenueCenters.id))
      .where(and(eq(contacts.id, id), isNull(contacts.deletedAt)))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Contatto non trovato" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * PUT /api/contacts/[id]
 * Body: campi da aggiornare (nome, type, email, phone, costCenterId, isMovable, notes, isActive)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "ID non valido" }, { status: 400 });
    }

    const body = await request.json();
    const { name, type, email, phone, costCenterId, revenueCenterId, isMovable, notes, isActive } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return NextResponse.json({ error: "Nome non può essere vuoto" }, { status: 400 });
      }
      updates.name = name.trim();
    }
    if (type !== undefined) {
      const validTypes = ["client", "supplier", "ex_supplier", "other"];
      if (!validTypes.includes(type)) {
        return NextResponse.json({ error: `Tipo non valido. Ammessi: ${validTypes.join(", ")}` }, { status: 400 });
      }
      updates.type = type;
    }
    if (email !== undefined) updates.email = email || null;
    if (phone !== undefined) updates.phone = phone || null;
    if (costCenterId !== undefined) updates.costCenterId = costCenterId || null;
    if (revenueCenterId !== undefined) updates.revenueCenterId = revenueCenterId || null;
    if (isMovable !== undefined) updates.isMovable = Boolean(isMovable);
    if (notes !== undefined) updates.notes = notes || null;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nessun campo da aggiornare" }, { status: 400 });
    }

    const [updated] = await db
      .update(contacts)
      .set(updates)
      .where(and(eq(contacts.id, id), isNull(contacts.deletedAt)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Contatto non trovato" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/contacts/[id]
 * Soft delete (imposta deleted_at). Il contatto sparisce dalle liste ma resta
 * referenziabile per dati storici (es. expected_expenses gia' linkati).
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "ID non valido" }, { status: 400 });
    }

    const [deleted] = await db
      .update(contacts)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(contacts.id, id), isNull(contacts.deletedAt)))
      .returning({ id: contacts.id });

    if (!deleted) {
      return NextResponse.json({ error: "Contatto non trovato o già eliminato" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: deleted.id });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
