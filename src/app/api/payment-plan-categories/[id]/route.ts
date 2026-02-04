import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentPlanCategories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// PUT - Modifica categoria
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const categoryId = parseInt(id);
  const body = await request.json();
  const { name, color, sortOrder } = body;

  if (!name) {
    return NextResponse.json(
      { error: "Nome categoria obbligatorio" },
      { status: 400 }
    );
  }

  const result = await db
    .update(paymentPlanCategories)
    .set({
      name,
      color: color || "#6B7280",
      sortOrder: sortOrder ?? undefined,
    })
    .where(eq(paymentPlanCategories.id, categoryId))
    .returning();

  if (result.length === 0) {
    return NextResponse.json(
      { error: "Categoria non trovata" },
      { status: 404 }
    );
  }

  return NextResponse.json(result[0]);
}

// DELETE - Elimina categoria (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const categoryId = parseInt(id);

  const result = await db
    .update(paymentPlanCategories)
    .set({ deletedAt: new Date() })
    .where(eq(paymentPlanCategories.id, categoryId))
    .returning();

  if (result.length === 0) {
    return NextResponse.json(
      { error: "Categoria non trovata" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
