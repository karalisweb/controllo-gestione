import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { historicalRevenue } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";

/**
 * GET /api/historical-revenue
 *
 * Ritorna la matrice fatturato per anno/mese:
 *  - anni storici dal seed (historical_revenue)
 *  - anno corrente calcolato dinamicamente dalle transactions reali (incassi
 *    lordi del mese, escl. transfer e figlie split)
 *
 * Output:
 *  - years: array anni ordinati ASC (es. [2015,2016,...,2026])
 *  - months: array di 12 oggetti { month, byYear: {[year]: cents}, avg }
 *  - totalsByYear: { [year]: cents }
 *  - avgByYear: { [year]: cents }   media mensile dell'anno
 *  - bestMonth / worstMonth: { year, month, amount }
 *  - currentYear: number
 *  - currentMonthIdx: number (0-based, per evidenziare la cella in corso)
 */

const MONTH_LABELS = [
  "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre",
];

export async function GET() {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();

    // Carica TUTTI i dati storici. L'utente li inserisce a mano: il fatturato
    // dichiarato non è derivabile dalle transactions (che includono versamenti
    // e saldi vecchi che non sono ricavi).
    const historicRows = await db
      .select()
      .from(historicalRevenue)
      .orderBy(asc(historicalRevenue.year), asc(historicalRevenue.month));

    // Mappa: year → [12 mesi]
    const byYear = new Map<number, (number | null)[]>();
    for (const r of historicRows) {
      if (!byYear.has(r.year)) byYear.set(r.year, Array(12).fill(null));
      byYear.get(r.year)![r.month - 1] = r.amountCents;
    }

    // Assicura che l'anno corrente sia presente come riga (anche se ha 0 record)
    if (!byYear.has(currentYear)) {
      byYear.set(currentYear, Array(12).fill(null));
    }

    // Anni ordinati ASC (poi il client invertirà DESC se vuole)
    const years = Array.from(byYear.keys()).sort((a, b) => a - b);

    // 3. Costruisci matrice mese × anno + AVG storico per mese
    const months = MONTH_LABELS.map((label, idx) => {
      const monthIdx = idx;
      const yearAmounts: Record<number, number | null> = {};
      let sumHistoric = 0;
      let countHistoric = 0;
      for (const y of years) {
        const amount = byYear.get(y)![monthIdx];
        yearAmounts[y] = amount;
        // AVG calcolata su anni storici "completi" (no anno corrente, no null)
        if (y !== currentYear && amount != null) {
          sumHistoric += amount;
          countHistoric++;
        }
      }
      const avg = countHistoric > 0 ? Math.round(sumHistoric / countHistoric) : 0;
      return { month: idx + 1, label, byYear: yearAmounts, avg };
    });

    // 4. Totali e medie per anno
    const totalsByYear: Record<number, number> = {};
    const avgByYear: Record<number, number> = {};
    for (const y of years) {
      const months12 = byYear.get(y)!;
      const monthsWithData = months12.filter((v) => v != null) as number[];
      const total = monthsWithData.reduce((s, v) => s + v, 0);
      totalsByYear[y] = total;
      avgByYear[y] = monthsWithData.length > 0 ? Math.round(total / monthsWithData.length) : 0;
    }

    // 5. Best / worst month di sempre (escl. anno corrente per non penalizzare l'in-corso)
    let bestMonth: { year: number; month: number; amount: number } | null = null;
    let worstMonth: { year: number; month: number; amount: number } | null = null;
    for (const y of years) {
      if (y === currentYear) continue;
      const months12 = byYear.get(y)!;
      months12.forEach((amount, idx) => {
        if (amount == null) return;
        if (bestMonth == null || amount > bestMonth.amount) {
          bestMonth = { year: y, month: idx + 1, amount };
        }
        if (worstMonth == null || amount < worstMonth.amount) {
          worstMonth = { year: y, month: idx + 1, amount };
        }
      });
    }

    return NextResponse.json({
      years,
      months,
      totalsByYear,
      avgByYear,
      bestMonth,
      worstMonth,
      currentYear,
      currentMonthIdx,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/historical-revenue
 * Body: { year, month, amountCents }
 *
 * Upsert di una cella della matrice. Se amountCents=0 → cancella la riga.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const year = Number(body?.year);
    const month = Number(body?.month);
    const amountCents = Number(body?.amountCents);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Anno non valido" }, { status: 400 });
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Mese non valido" }, { status: 400 });
    }
    if (!Number.isFinite(amountCents) || amountCents < 0) {
      return NextResponse.json({ error: "Importo non valido" }, { status: 400 });
    }
    const cents = Math.round(amountCents);
    const existing = await db
      .select()
      .from(historicalRevenue)
      .where(and(eq(historicalRevenue.year, year), eq(historicalRevenue.month, month)))
      .limit(1);
    if (cents === 0) {
      if (existing.length > 0) {
        await db.delete(historicalRevenue).where(eq(historicalRevenue.id, existing[0].id));
      }
      return NextResponse.json({ action: "cleared" });
    }
    if (existing.length > 0) {
      const [updated] = await db
        .update(historicalRevenue)
        .set({ amountCents: cents })
        .where(eq(historicalRevenue.id, existing[0].id))
        .returning();
      return NextResponse.json({ action: "updated", row: updated });
    }
    const [created] = await db
      .insert(historicalRevenue)
      .values({ year, month, amountCents: cents })
      .returning();
    return NextResponse.json({ action: "created", row: created });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
