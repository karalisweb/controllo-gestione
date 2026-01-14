import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, categories, costCenters, revenueCenters } from "@/lib/db/schema";
import { eq, and, isNull, gte, lte, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const categoryId = searchParams.get("categoryId");
  const type = searchParams.get("type"); // income | expense

  const conditions = [isNull(transactions.deletedAt)];

  if (startDate) {
    conditions.push(gte(transactions.date, startDate));
  }
  if (endDate) {
    conditions.push(lte(transactions.date, endDate));
  }
  if (categoryId) {
    conditions.push(eq(transactions.categoryId, parseInt(categoryId)));
  }

  const result = await db
    .select({
      id: transactions.id,
      externalId: transactions.externalId,
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      categoryId: transactions.categoryId,
      costCenterId: transactions.costCenterId,
      revenueCenterId: transactions.revenueCenterId,
      isSplit: transactions.isSplit,
      isTransfer: transactions.isTransfer,
      linkedTransactionId: transactions.linkedTransactionId,
      notes: transactions.notes,
      createdAt: transactions.createdAt,
      category: {
        id: categories.id,
        name: categories.name,
        type: categories.type,
        color: categories.color,
      },
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
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(costCenters, eq(transactions.costCenterId, costCenters.id))
    .leftJoin(revenueCenters, eq(transactions.revenueCenterId, revenueCenters.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.date));

  // Filtra per tipo se richiesto
  let filteredResult = result;
  if (type === "income") {
    filteredResult = result.filter((t) => t.amount > 0);
  } else if (type === "expense") {
    filteredResult = result.filter((t) => t.amount < 0);
  }

  return NextResponse.json(filteredResult);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { externalId, date, description, amount, categoryId, notes } = body;

  if (!date || amount === undefined) {
    return NextResponse.json(
      { error: "Data e importo sono obbligatori" },
      { status: 400 }
    );
  }

  // Verifica duplicato per externalId
  if (externalId) {
    const existing = await db
      .select()
      .from(transactions)
      .where(eq(transactions.externalId, externalId));

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Transazione già presente", duplicate: true },
        { status: 409 }
      );
    }
  }

  const result = await db
    .insert(transactions)
    .values({
      externalId: externalId || null,
      date,
      description: description || null,
      amount, // centesimi
      categoryId: categoryId || null,
      notes: notes || null,
      isSplit: false,
    })
    .returning();

  const inserted = Array.isArray(result) ? result[0] : null;
  return NextResponse.json(inserted, { status: 201 });
}
