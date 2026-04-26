import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expectedExpenseOverrides, expectedExpenses } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/expected-expenses/[id]/override
 * Body: { year: number, month: number, amount: number, notes?: string }
 *
 * Upsert dell'override per il (year, month) di una spesa prevista.
 * Se l'amount === expense.amount (default del template), l'override viene
 * cancellato (la cella torna al default).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "ID non valido" }, { status: 400 });

    const body = await request.json();
    const { year, month, amount, notes } = body;

    if (!Number.isInteger(year) || year < 2000 || year > 2100)
      return NextResponse.json({ error: "Anno non valido" }, { status: 400 });
    if (!Number.isInteger(month) || month < 1 || month > 12)
      return NextResponse.json({ error: "Mese non valido (1-12)" }, { status: 400 });
    if (!Number.isFinite(amount) || amount < 0)
      return NextResponse.json({ error: "Importo non valido" }, { status: 400 });

    // Verifica che la spesa esista
    const [expense] = await db
      .select({ id: expectedExpenses.id, amount: expectedExpenses.amount })
      .from(expectedExpenses)
      .where(and(eq(expectedExpenses.id, id), isNull(expectedExpenses.deletedAt)))
      .limit(1);
    if (!expense) return NextResponse.json({ error: "Spesa non trovata" }, { status: 404 });

    // Cerca override esistente
    const existing = await db
      .select({ id: expectedExpenseOverrides.id })
      .from(expectedExpenseOverrides)
      .where(
        and(
          eq(expectedExpenseOverrides.expectedExpenseId, id),
          eq(expectedExpenseOverrides.year, year),
          eq(expectedExpenseOverrides.month, month),
        ),
      )
      .limit(1);

    // Se l'amount coincide col default del template → cancella l'override (cella torna al default)
    if (Math.round(amount) === expense.amount) {
      if (existing.length > 0) {
        await db
          .delete(expectedExpenseOverrides)
          .where(eq(expectedExpenseOverrides.id, existing[0].id));
      }
      return NextResponse.json({ success: true, action: "cleared", amount: expense.amount });
    }

    // Upsert
    if (existing.length > 0) {
      const [updated] = await db
        .update(expectedExpenseOverrides)
        .set({ amount: Math.round(amount), notes: notes ?? null, updatedAt: new Date() })
        .where(eq(expectedExpenseOverrides.id, existing[0].id))
        .returning();
      return NextResponse.json({ success: true, action: "updated", override: updated });
    } else {
      const [created] = await db
        .insert(expectedExpenseOverrides)
        .values({
          expectedExpenseId: id,
          year,
          month,
          amount: Math.round(amount),
          notes: notes ?? null,
        })
        .returning();
      return NextResponse.json({ success: true, action: "created", override: created });
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/expected-expenses/[id]/override?year=YYYY&month=M
 * Cancella esplicitamente l'override per (year, month).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "ID non valido" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || "0", 10);
    const month = parseInt(searchParams.get("month") || "0", 10);
    if (!year || !month) return NextResponse.json({ error: "year e month obbligatori" }, { status: 400 });

    const result = await db
      .delete(expectedExpenseOverrides)
      .where(
        and(
          eq(expectedExpenseOverrides.expectedExpenseId, id),
          eq(expectedExpenseOverrides.year, year),
          eq(expectedExpenseOverrides.month, month),
        ),
      )
      .returning({ id: expectedExpenseOverrides.id });

    return NextResponse.json({ success: true, deleted: result.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
