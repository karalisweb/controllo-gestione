import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgetItems, categories } from "@/lib/db/schema";
import { eq, and, isNull, gte, lte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const year = parseInt(searchParams.get("year") || "2026");
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;

  let query = db
    .select({
      id: budgetItems.id,
      categoryId: budgetItems.categoryId,
      costCenterId: budgetItems.costCenterId,
      revenueCenterId: budgetItems.revenueCenterId,
      description: budgetItems.description,
      amount: budgetItems.amount,
      month: budgetItems.month,
      year: budgetItems.year,
      isRecurring: budgetItems.isRecurring,
      clientName: budgetItems.clientName,
      notes: budgetItems.notes,
      createdAt: budgetItems.createdAt,
      category: {
        id: categories.id,
        name: categories.name,
        type: categories.type,
        color: categories.color,
      },
    })
    .from(budgetItems)
    .leftJoin(categories, eq(budgetItems.categoryId, categories.id))
    .where(
      and(
        isNull(budgetItems.deletedAt),
        eq(budgetItems.year, year),
        month ? eq(budgetItems.month, month) : undefined
      )
    )
    .orderBy(budgetItems.month, budgetItems.description);

  const result = await query;

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    categoryId,
    costCenterId,
    revenueCenterId,
    description,
    amount,
    month,
    year = 2026,
    isRecurring = false,
    clientName,
    notes,
  } = body;

  if (!description || amount === undefined || !month) {
    return NextResponse.json(
      { error: "Descrizione, importo e mese sono obbligatori" },
      { status: 400 }
    );
  }

  if (month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Mese deve essere tra 1 e 12" },
      { status: 400 }
    );
  }

  const result = await db.insert(budgetItems).values({
    categoryId: categoryId || null,
    costCenterId: costCenterId || null,
    revenueCenterId: revenueCenterId || null,
    description,
    amount, // in centesimi
    month,
    year,
    isRecurring,
    clientName: clientName || null,
    notes: notes || null,
  }).returning();

  const inserted = Array.isArray(result) ? result[0] : null;
  return NextResponse.json(inserted, { status: 201 });
}
