import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentPlanCategories } from "@/lib/db/schema";
import { eq, isNull, asc } from "drizzle-orm";

// GET - Lista categorie
export async function GET() {
  const categories = await db
    .select()
    .from(paymentPlanCategories)
    .where(isNull(paymentPlanCategories.deletedAt))
    .orderBy(asc(paymentPlanCategories.sortOrder));

  return NextResponse.json(categories);
}

// POST - Crea nuova categoria
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, color } = body;

  if (!name) {
    return NextResponse.json(
      { error: "Nome categoria obbligatorio" },
      { status: 400 }
    );
  }

  // Trova l'ordine massimo per mettere la nuova categoria in fondo
  const existing = await db
    .select()
    .from(paymentPlanCategories)
    .where(isNull(paymentPlanCategories.deletedAt))
    .orderBy(asc(paymentPlanCategories.sortOrder));

  const maxOrder = existing.length > 0
    ? Math.max(...existing.map(c => c.sortOrder || 0))
    : 0;

  const result = await db
    .insert(paymentPlanCategories)
    .values({
      name,
      color: color || "#6B7280",
      sortOrder: maxOrder + 1,
    })
    .returning();

  return NextResponse.json(result[0]);
}
