import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * PUT /api/dashboard/sales-target
 * Body: { year: number, month: number, amount: number (centesimi) }
 * Upsert su settings con chiave `sales_target_<year>_<month>`.
 */
export async function PUT(request: NextRequest) {
  try {
    const { year, month, amount } = await request.json();
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "year/month non validi" }, { status: 400 });
    }
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "amount non valido (centesimi >= 0)" }, { status: 400 });
    }
    const key = `sales_target_${year}_${month}`;
    const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    if (existing.length > 0) {
      await db.update(settings).set({ value: String(Math.round(amount)), updatedAt: new Date() }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({
        key,
        value: String(Math.round(amount)),
        type: "number",
        description: `Obiettivo vendite per ${month}/${year} (centesimi)`,
      });
    }
    return NextResponse.json({ ok: true, key, amount: Math.round(amount) });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
