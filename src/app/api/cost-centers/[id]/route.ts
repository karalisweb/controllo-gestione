import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { costCenters } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const centerId = parseInt(id);

  const centerArr = await db
    .select()
    .from(costCenters)
    .where(eq(costCenters.id, centerId));

  const center = centerArr[0];

  if (!center) {
    return NextResponse.json(
      { error: "Centro di costo non trovato" },
      { status: 404 }
    );
  }

  return NextResponse.json(center);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const centerId = parseInt(id);
  const body = await request.json();

  const existingArr = await db
    .select()
    .from(costCenters)
    .where(eq(costCenters.id, centerId));

  const existing = existingArr[0];

  if (!existing) {
    return NextResponse.json(
      { error: "Centro di costo non trovato" },
      { status: 404 }
    );
  }

  const {
    name,
    description,
    color,
    sortOrder,
    isActive,
  } = body;

  const updateResult = await db
    .update(costCenters)
    .set({
      name: name ?? existing.name,
      description: description !== undefined ? description : existing.description,
      color: color !== undefined ? color : existing.color,
      sortOrder: sortOrder ?? existing.sortOrder,
      isActive: isActive !== undefined ? isActive : existing.isActive,
    })
    .where(eq(costCenters.id, centerId))
    .returning();

  const updated = Array.isArray(updateResult) ? updateResult[0] : null;
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const centerId = parseInt(id);

  // Soft delete
  const deleteResult = await db
    .update(costCenters)
    .set({ deletedAt: new Date(), isActive: false })
    .where(eq(costCenters.id, centerId))
    .returning();

  const deleted = Array.isArray(deleteResult) ? deleteResult[0] : null;

  if (!deleted) {
    return NextResponse.json(
      { error: "Centro di costo non trovato" },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Centro di costo eliminato" });
}
