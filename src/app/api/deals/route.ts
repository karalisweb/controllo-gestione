import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { isNull, asc } from "drizzle-orm";

const STAGE_DEFAULT_PROB: Record<string, number> = {
  lead: 10,
  preventivo: 40,
  trattativa: 70,
  won: 100,
  lost: 0,
};

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(deals)
      .where(isNull(deals.deletedAt))
      .orderBy(asc(deals.expectedCloseDate));
    return NextResponse.json({ deals: rows });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientName, valueCents, stage, probabilityPct, expectedCloseDate, contactId, notes } = body ?? {};
    if (!clientName || !Number.isFinite(Number(valueCents))) {
      return NextResponse.json({ error: "clientName e valueCents obbligatori" }, { status: 400 });
    }
    const finalStage = ["lead", "preventivo", "trattativa", "won", "lost"].includes(stage) ? stage : "lead";
    const finalProb = probabilityPct != null
      ? Math.min(100, Math.max(0, Math.round(Number(probabilityPct))))
      : (STAGE_DEFAULT_PROB[finalStage] ?? 10);

    const [created] = await db
      .insert(deals)
      .values({
        clientName: String(clientName).trim(),
        valueCents: Math.round(Number(valueCents)),
        stage: finalStage,
        probabilityPct: finalProb,
        expectedCloseDate: expectedCloseDate || null,
        contactId: contactId ?? null,
        notes: notes ?? null,
      })
      .returning();
    return NextResponse.json({ deal: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
