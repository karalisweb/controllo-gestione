import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const categoryId = parseInt(id);

  const result = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), isNull(categories.deletedAt)));

  if (result.length === 0) {
    return NextResponse.json(
      { error: "Categoria non trovata" },
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
  const categoryId = parseInt(id);
  const body = await request.json();

  const { name, type, color } = body;

  const result = await db
    .update(categories)
    .set({
      name,
      type,
      color,
    })
    .where(and(eq(categories.id, categoryId), isNull(categories.deletedAt)))
    .returning();

  if (result.length === 0) {
    return NextResponse.json(
      { error: "Categoria non trovata" },
      { status: 404 }
    );
  }

  return NextResponse.json(result[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const categoryId = parseInt(id);

  // Soft delete
  const result = await db
    .update(categories)
    .set({ deletedAt: new Date() })
    .where(and(eq(categories.id, categoryId), isNull(categories.deletedAt)))
    .returning();

  if (result.length === 0) {
    return NextResponse.json(
      { error: "Categoria non trovata" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
