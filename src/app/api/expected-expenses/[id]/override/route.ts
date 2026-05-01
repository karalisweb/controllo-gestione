import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expectedExpenseOverrides, expectedExpenses } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/expected-expenses/[id]/override
 * Body: { year, month, amount?, day?, notes? }
 *
 * Upsert dell'override per il (year, month) di una spesa prevista.
 * `amount` opzionale: se omesso conserva quello esistente (o usa il default).
 * `day` opzionale (1-31): sposta solo quel mese; null = giorno default del template.
 * Se sia amount che day combaciano col default, l'override viene cancellato.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "ID non valido" }, { status: 400 });

    const body = await request.json();
    const { year, month, amount, day, notes } = body;

    if (!Number.isInteger(year) || year < 2000 || year > 2100)
      return NextResponse.json({ error: "Anno non valido" }, { status: 400 });
    if (!Number.isInteger(month) || month < 1 || month > 12)
      return NextResponse.json({ error: "Mese non valido (1-12)" }, { status: 400 });
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0))
      return NextResponse.json({ error: "Importo non valido" }, { status: 400 });
    if (day !== undefined && day !== null && (!Number.isInteger(day) || day < 1 || day > 31))
      return NextResponse.json({ error: "Giorno non valido (1-31)" }, { status: 400 });

    // Verifica che la spesa esista
    const [expense] = await db
      .select({ id: expectedExpenses.id, amount: expectedExpenses.amount })
      .from(expectedExpenses)
      .where(and(eq(expectedExpenses.id, id), isNull(expectedExpenses.deletedAt)))
      .limit(1);
    if (!expense) return NextResponse.json({ error: "Spesa non trovata" }, { status: 404 });

    // Cerca override esistente
    const existing = await db
      .select()
      .from(expectedExpenseOverrides)
      .where(
        and(
          eq(expectedExpenseOverrides.expectedExpenseId, id),
          eq(expectedExpenseOverrides.year, year),
          eq(expectedExpenseOverrides.month, month),
        ),
      )
      .limit(1);

    const nextAmount = amount !== undefined
      ? Math.round(amount)
      : existing[0]?.amount ?? expense.amount;
    const nextDay = day !== undefined ? day : existing[0]?.day ?? null;

    // Override "vuoto" (amount default + day default): cancella se esiste
    if (nextAmount === expense.amount && (nextDay === null || nextDay === undefined)) {
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
        .set({
          amount: nextAmount,
          day: nextDay,
          notes: notes ?? existing[0].notes ?? null,
          updatedAt: new Date(),
        })
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
          amount: nextAmount,
          day: nextDay,
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
