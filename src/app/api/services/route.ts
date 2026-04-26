import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services, revenueCenters } from "@/lib/db/schema";
import { eq, isNull, and, like, asc } from "drizzle-orm";

/**
 * GET /api/services
 * Query params:
 *   - type: recurring | installments
 *   - q: search per nome
 *   - includeInactive: "1"
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const q = searchParams.get("q")?.trim();
    const includeInactive = searchParams.get("includeInactive") === "1";

    const conditions = [isNull(services.deletedAt)];
    if (!includeInactive) conditions.push(eq(services.isActive, true));
    if (type) conditions.push(eq(services.type, type as never));
    if (q) conditions.push(like(services.name, `%${q}%`));

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
      .where(and(...conditions))
      .orderBy(asc(services.type), asc(services.name));

    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/services
 * Body: { name, type, revenueCenterId?, description?, defaultAmount?, defaultIntervalMonths?, defaultFirstPct?, defaultOffsetDays? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      type,
      revenueCenterId,
      description,
      defaultAmount,
      defaultIntervalMonths,
      defaultFirstPct,
      defaultOffsetDays,
    } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Nome obbligatorio" }, { status: 400 });
    }
    if (!type || !["recurring", "installments"].includes(type)) {
      return NextResponse.json({ error: "Type deve essere 'recurring' o 'installments'" }, { status: 400 });
    }

    // Validazioni soft
    if (type === "recurring" && defaultIntervalMonths !== undefined && defaultIntervalMonths !== null) {
      const n = Number(defaultIntervalMonths);
      if (!Number.isFinite(n) || n < 1 || n > 120) {
        return NextResponse.json({ error: "Intervallo mesi non valido (1-120)" }, { status: 400 });
      }
    }
    if (type === "installments" && defaultFirstPct !== undefined && defaultFirstPct !== null) {
      const p = Number(defaultFirstPct);
      if (!Number.isFinite(p) || p < 0 || p > 100) {
        return NextResponse.json({ error: "Percentuale acconto non valida (0-100)" }, { status: 400 });
      }
    }
    if (type === "installments" && defaultOffsetDays !== undefined && defaultOffsetDays !== null) {
      const d = Number(defaultOffsetDays);
      if (!Number.isFinite(d) || d < 0 || d > 3650) {
        return NextResponse.json({ error: "Offset giorni non valido (0-3650)" }, { status: 400 });
      }
    }

    const [created] = await db
      .insert(services)
      .values({
        name: name.trim(),
        type,
        revenueCenterId: revenueCenterId || null,
        description: description || null,
        defaultAmount: defaultAmount !== undefined ? Number(defaultAmount) : 0,
        defaultIntervalMonths: defaultIntervalMonths !== undefined ? Number(defaultIntervalMonths) : 1,
        defaultFirstPct: defaultFirstPct !== undefined ? Number(defaultFirstPct) : 50,
        defaultOffsetDays: defaultOffsetDays !== undefined ? Number(defaultOffsetDays) : 60,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
