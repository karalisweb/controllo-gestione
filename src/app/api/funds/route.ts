import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { funds, expectedExpenses } from "@/lib/db/schema";
import { and, eq, isNull, asc } from "drizzle-orm";

/**
 * GET /api/funds
 *
 * Ritorna i fondi attivi con il target effettivo:
 *  - "liquid" → target_cents salvato (default 1.000 €)
 *  - "emergency" → se target_cents è NULL, calcolato dinamicamente come
 *                  3 × media mensile delle spese fisse strutturali (template
 *                  ricorrenti escl. one_time). Se l'utente ha impostato un
 *                  target_cents custom, prevale quello.
 */
function occurrencesPerYear(frequency: string): number {
  switch (frequency) {
    case "monthly": return 12;
    case "quarterly": return 4;
    case "semiannual": return 2;
    case "annual": return 1;
    default: return 0;
  }
}

async function computeFixedMonthlyCosts(): Promise<number> {
  const tpl = await db
    .select()
    .from(expectedExpenses)
    .where(and(isNull(expectedExpenses.deletedAt), eq(expectedExpenses.isActive, true)));
  let total = 0;
  for (const e of tpl) {
    const occ = occurrencesPerYear(e.frequency);
    if (occ === 0) continue;
    total += (e.amount * occ) / 12;
  }
  return Math.round(total);
}

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(funds)
      .where(isNull(funds.deletedAt))
      .orderBy(asc(funds.sortOrder), asc(funds.id));

    const fixedMonthlyCosts = await computeFixedMonthlyCosts();

    const enriched = rows.map((f) => {
      let effectiveTarget = f.targetCents;
      if (f.type === "emergency" && (effectiveTarget == null || effectiveTarget === 0)) {
        effectiveTarget = fixedMonthlyCosts * 3;
      }
      const target = effectiveTarget ?? 0;
      const progressPct = target > 0
        ? Math.min(100, Math.max(0, Math.round((f.currentCents / target) * 100)))
        : 0;
      return {
        id: f.id,
        name: f.name,
        type: f.type,
        targetCents: target,
        currentCents: f.currentCents,
        progressPct,
        notes: f.notes,
        targetIsAuto: f.type === "emergency" && (f.targetCents == null || f.targetCents === 0),
      };
    });

    const totals = enriched.reduce(
      (acc, f) => ({ target: acc.target + f.targetCents, current: acc.current + f.currentCents }),
      { target: 0, current: 0 },
    );

    return NextResponse.json({
      funds: enriched,
      fixedMonthlyCosts,
      totals,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Endpoint vivo per usi futuri (es. aggiungere un terzo fondo). Per ora i 2
  // fondi default vengono seedati alla migration; questo POST è opzionale.
  try {
    const body = await request.json();
    const { name, type, targetCents, currentCents, notes } = body ?? {};
    if (!name || !type) {
      return NextResponse.json({ error: "name e type obbligatori" }, { status: 400 });
    }
    if (type !== "liquid" && type !== "emergency") {
      return NextResponse.json({ error: "type non valido (atteso 'liquid' o 'emergency')" }, { status: 400 });
    }
    const [created] = await db
      .insert(funds)
      .values({
        name: String(name),
        type,
        targetCents: targetCents != null ? Math.round(Number(targetCents)) : null,
        currentCents: Math.round(Number(currentCents) || 0),
        notes: notes ?? null,
      })
      .returning();
    return NextResponse.json({ fund: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
