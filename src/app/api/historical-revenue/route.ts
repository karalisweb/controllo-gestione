import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { historicalRevenue, transactions } from "@/lib/db/schema";
import { and, gte, isNull, lte, asc } from "drizzle-orm";

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
    const todayStr = now.toISOString().slice(0, 10);

    // 1. Carica storico (esclude anno corrente per evitare doppio conteggio)
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

    // 2. Anno corrente da transactions reali
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;
    const txs = await db
      .select({
        date: transactions.date,
        amount: transactions.amount,
        isTransfer: transactions.isTransfer,
        linkedTransactionId: transactions.linkedTransactionId,
      })
      .from(transactions)
      .where(
        and(
          isNull(transactions.deletedAt),
          gte(transactions.date, yearStart),
          lte(transactions.date, yearEnd),
        ),
      );

    const currentYearMonths: (number | null)[] = Array(12).fill(null);
    for (const t of txs) {
      if (t.isTransfer) continue;
      if (t.linkedTransactionId != null) continue;
      if (t.amount <= 0) continue;
      // Solo incassi reali del passato (escludi futuri datati avanti)
      if (t.date > todayStr) continue;
      const monthIdx = parseInt(t.date.slice(5, 7), 10) - 1;
      currentYearMonths[monthIdx] = (currentYearMonths[monthIdx] || 0) + t.amount;
    }
    byYear.set(currentYear, currentYearMonths);

    // Anni ordinati ASC
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
