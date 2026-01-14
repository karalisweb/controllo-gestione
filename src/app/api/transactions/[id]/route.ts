import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const transactionId = parseInt(id);

  const resultArr = await db
    .select({
      id: transactions.id,
      externalId: transactions.externalId,
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      categoryId: transactions.categoryId,
      isSplit: transactions.isSplit,
      notes: transactions.notes,
      createdAt: transactions.createdAt,
      category: {
        id: categories.id,
        name: categories.name,
        type: categories.type,
        color: categories.color,
      },
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.id, transactionId));

  const result = resultArr[0];

  if (!result) {
    return NextResponse.json(
      { error: "Transazione non trovata" },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const transactionId = parseInt(id);
  const body = await request.json();

  const { date, description, amount, categoryId, costCenterId, revenueCenterId, notes } = body;

  const existingArr = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId));

  const existing = existingArr[0];

  if (!existing) {
    return NextResponse.json(
      { error: "Transazione non trovata" },
      { status: 404 }
    );
  }

  const updateResult = await db
    .update(transactions)
    .set({
      date: date ?? existing.date,
      description: description !== undefined ? description : existing.description,
      amount: amount ?? existing.amount,
      categoryId: categoryId !== undefined ? categoryId : existing.categoryId,
      costCenterId: costCenterId !== undefined ? costCenterId : existing.costCenterId,
      revenueCenterId: revenueCenterId !== undefined ? revenueCenterId : existing.revenueCenterId,
      notes: notes !== undefined ? notes : existing.notes,
    })
    .where(eq(transactions.id, transactionId))
    .returning();

  const updated = Array.isArray(updateResult) ? updateResult[0] : null;
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const transactionId = parseInt(id);

  // Soft delete
  const deleteResult = await db
    .update(transactions)
    .set({ deletedAt: new Date() })
    .where(eq(transactions.id, transactionId))
    .returning();

  const deleted = Array.isArray(deleteResult) ? deleteResult[0] : null;

  if (!deleted) {
    return NextResponse.json(
      { error: "Transazione non trovata" },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Transazione eliminata" });
}
