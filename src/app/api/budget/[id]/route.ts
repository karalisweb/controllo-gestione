import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgetItems } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = parseInt(id);

  const result = await db
    .select()
    .from(budgetItems)
    .where(and(eq(budgetItems.id, itemId), isNull(budgetItems.deletedAt)));

  if (result.length === 0) {
    return NextResponse.json(
      { error: "Voce previsionale non trovata" },
      { status: 404 }
    );
  }

  return NextResponse.json(result[0]);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = parseInt(id);
  const body = await request.json();

  const {
    categoryId,
    costCenterId,
    revenueCenterId,
    description,
    amount,
    month,
    year,
    isRecurring,
    clientName,
    notes,
  } = body;

  const result = await db
    .update(budgetItems)
    .set({
      categoryId,
      costCenterId: costCenterId || null,
      revenueCenterId: revenueCenterId || null,
      description,
      amount,
      month,
      year,
      isRecurring,
      clientName,
      notes,
    })
    .where(and(eq(budgetItems.id, itemId), isNull(budgetItems.deletedAt)))
    .returning();

  const updated = Array.isArray(result) ? result[0] : null;

  if (!updated) {
    return NextResponse.json(
      { error: "Voce previsionale non trovata" },
      { status: 404 }
    );
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = parseInt(id);

  // Soft delete
  const deleteResult = await db
    .update(budgetItems)
    .set({ deletedAt: new Date() })
    .where(and(eq(budgetItems.id, itemId), isNull(budgetItems.deletedAt)))
    .returning();

  const deleted = Array.isArray(deleteResult) ? deleteResult[0] : null;

  if (!deleted) {
    return NextResponse.json(
      { error: "Voce previsionale non trovata" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
