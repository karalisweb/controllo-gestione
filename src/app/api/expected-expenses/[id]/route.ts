import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expectedExpenses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const expense = await db
    .select()
    .from(expectedExpenses)
    .where(eq(expectedExpenses.id, parseInt(id)));

  if (!expense[0]) {
    return NextResponse.json({ error: "Spesa non trovata" }, { status: 404 });
  }

  return NextResponse.json(expense[0]);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const {
    name,
    costCenterId,
    amount,
    frequency,
    expectedDay,
    startDate,
    endDate,
    priority,
    notes,
    isActive,
  } = body;

  const updateData: Record<string, unknown> = {};

  if (name !== undefined) updateData.name = name;
  if (costCenterId !== undefined) updateData.costCenterId = costCenterId || null;
  if (amount !== undefined) updateData.amount = amount;
  if (frequency !== undefined) updateData.frequency = frequency;
  if (expectedDay !== undefined) updateData.expectedDay = expectedDay;
  if (startDate !== undefined) updateData.startDate = startDate;
  if (endDate !== undefined) updateData.endDate = endDate || null;
  if (priority !== undefined) updateData.priority = priority;
  if (notes !== undefined) updateData.notes = notes || null;
  if (isActive !== undefined) updateData.isActive = isActive;

  const result = await db
    .update(expectedExpenses)
    .set(updateData)
    .where(eq(expectedExpenses.id, parseInt(id)))
    .returning();

  return NextResponse.json(result[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Soft delete
  await db
    .update(expectedExpenses)
    .set({ deletedAt: new Date() })
    .where(eq(expectedExpenses.id, parseInt(id)));

  return NextResponse.json({ success: true });
}
