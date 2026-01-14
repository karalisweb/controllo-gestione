import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";

export async function GET() {
  const result = await db
    .select()
    .from(categories)
    .where(isNull(categories.deletedAt));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { name, type, color } = body;

  if (!name || !type) {
    return NextResponse.json(
      { error: "Nome e tipo sono obbligatori" },
      { status: 400 }
    );
  }

  if (!["income", "expense"].includes(type)) {
    return NextResponse.json(
      { error: "Tipo deve essere 'income' o 'expense'" },
      { status: 400 }
    );
  }

  const result = await db.insert(categories).values({
    name,
    type,
    color: color || null,
  }).returning();

  return NextResponse.json(result[0], { status: 201 });
}
