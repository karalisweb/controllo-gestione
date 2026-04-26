import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contacts, costCenters, revenueCenters } from "@/lib/db/schema";
import { eq, isNull, and, like, asc } from "drizzle-orm";

/**
 * GET /api/contacts
 * Query params:
 *   - type: client | supplier | ex_supplier | other (filtra per tipo)
 *   - q: stringa di ricerca su nome (LIKE)
 *   - includeInactive: "1" per includere anche i disattivati
 * Risposta: array di Contact con join a costCenter (per fornitori) e revenueCenter (per clienti)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const q = searchParams.get("q")?.trim();
    const includeInactive = searchParams.get("includeInactive") === "1";

    const conditions = [isNull(contacts.deletedAt)];
    if (!includeInactive) conditions.push(eq(contacts.isActive, true));
    if (type) conditions.push(eq(contacts.type, type as never));
    if (q) conditions.push(like(contacts.name, `%${q}%`));

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
      .where(and(...conditions))
      .orderBy(asc(contacts.type), asc(contacts.name));

    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/contacts
 * Body: { name, type?, email?, phone?, costCenterId?, revenueCenterId?, isMovable?, notes? }
 * Crea un nuovo contatto. Verifica unicità soft del nome+type per evitare doppioni.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type = "other", email, phone, costCenterId, revenueCenterId, isMovable, notes } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Nome obbligatorio" }, { status: 400 });
    }

    const cleanName = name.trim();
    const validTypes = ["client", "supplier", "ex_supplier", "other"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Tipo non valido. Ammessi: ${validTypes.join(", ")}` }, { status: 400 });
    }

    // Check duplicato soft (stesso nome + tipo, attivo, non cancellato)
    const existing = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(
          eq(contacts.name, cleanName),
          eq(contacts.type, type),
          isNull(contacts.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Contatto "${cleanName}" di tipo "${type}" esiste già`, existingId: existing[0].id },
        { status: 409 },
      );
    }

    const [created] = await db
      .insert(contacts)
      .values({
        name: cleanName,
        type,
        email: email || null,
        phone: phone || null,
        costCenterId: costCenterId || null,
        revenueCenterId: revenueCenterId || null,
        isMovable: isMovable === undefined ? true : Boolean(isMovable),
        notes: notes || null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
