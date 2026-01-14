import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expectedIncomes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const incomeId = parseInt(id);

  const incomeArr = await db
    .select()
    .from(expectedIncomes)
    .where(eq(expectedIncomes.id, incomeId));

  const income = incomeArr[0];

  if (!income) {
    return NextResponse.json(
      { error: "Incasso previsto non trovato" },
      { status: 404 }
    );
  }

  return NextResponse.json(income);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const incomeId = parseInt(id);
  const body = await request.json();

  const existingArr = await db
    .select()
    .from(expectedIncomes)
    .where(eq(expectedIncomes.id, incomeId));

  const existing = existingArr[0];

  if (!existing) {
    return NextResponse.json(
      { error: "Incasso previsto non trovato" },
      { status: 404 }
    );
  }

  const {
    clientName,
    revenueCenterId,
    amount,
    frequency,
    expectedDay,
    startDate,
    endDate,
    reliability,
    notes,
    isActive,
  } = body;

  const updateResult = await db
    .update(expectedIncomes)
    .set({
      clientName: clientName ?? existing.clientName,
      revenueCenterId: revenueCenterId !== undefined ? revenueCenterId : existing.revenueCenterId,
      amount: amount ?? existing.amount,
      frequency: frequency ?? existing.frequency,
      expectedDay: expectedDay ?? existing.expectedDay,
      startDate: startDate ?? existing.startDate,
      endDate: endDate !== undefined ? endDate : existing.endDate,
      reliability: reliability ?? existing.reliability,
      notes: notes !== undefined ? notes : existing.notes,
      isActive: isActive !== undefined ? isActive : existing.isActive,
    })
    .where(eq(expectedIncomes.id, incomeId))
    .returning();

  const updated = Array.isArray(updateResult) ? updateResult[0] : null;
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const incomeId = parseInt(id);

  // Soft delete
  const deleteResult = await db
    .update(expectedIncomes)
    .set({ deletedAt: new Date(), isActive: false })
    .where(eq(expectedIncomes.id, incomeId))
    .returning();

  const deleted = Array.isArray(deleteResult) ? deleteResult[0] : null;

  if (!deleted) {
    return NextResponse.json(
      { error: "Incasso previsto non trovato" },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Incasso previsto eliminato" });
}
