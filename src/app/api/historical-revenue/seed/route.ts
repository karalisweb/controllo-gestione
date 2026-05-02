import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { historicalRevenue } from "@/lib/db/schema";

/**
 * POST /api/historical-revenue/seed
 *
 * Inserisce i dati storici 2015-2025 (foglio Excel originale di Alessio) se la
 * tabella è vuota. Idempotente: se ci sono già righe, non fa nulla. Per ricaricare
 * passa `?force=1` (cancella tutto e ri-inserisce).
 *
 * Importi in euro lordi (× 100 = centesimi).
 */

// Matrice [year][monthIndex 0-11] = euro lordi
const HISTORICAL: Record<number, number[]> = {
  2015: [3787, 5625, 8345, 1251, 3060, 4103, 2626, 1133, 2130, 2405, 3278, 3475],
  2016: [803, 2790, 1480, 2675, 2800, 2848, 3775, 4830, 5510, 4414, 5232, 5281],
  2017: [4883, 5708, 5563, 3422, 5959, 7349, 6838, 5304, 5106, 5315, 7720, 4292],
  2018: [3854, 3862, 4886, 5173, 4893, 5643, 5293, 3427, 4395, 6386, 3464, 2801],
  2019: [3277, 2672, 2975, 3342, 3021, 4611, 4071, 4851, 5866, 1820, 5500, 3884],
  2020: [3246, 2549, 1230, 1443, 7485, 3967, 5134, 2715, 5340, 6327, 7170, 8090],
  2021: [3617, 4468, 3942, 5231, 6095, 6814, 4616, 5423, 5359, 5532, 7755, 6385],
  2022: [6870, 5180, 4365, 4795, 5932, 5455, 6039, 6875, 8151, 7430, 4639, 5109],
  2023: [7224, 5371, 6219, 6084, 7726, 7818, 5278, 5939, 5278, 4395, 7381, 4053],
  2024: [3599, 7228, 6606, 4443, 3189, 7426, 6989, 3409, 8136, 4112, 5048, 4998],
  2025: [8539, 3075, 5481, 1928, 5428, 7776, 4985, 5890, 5070, 5503, 4965, 4086],
};

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "1";

    const existing = await db.select().from(historicalRevenue).limit(1);
    if (existing.length > 0 && !force) {
      return NextResponse.json({
        action: "skipped",
        message: "Dati storici già presenti. Usa ?force=1 per ricaricare.",
        rowCount: existing.length,
      });
    }
    if (force) {
      await db.delete(historicalRevenue);
    }

    const rows: { year: number; month: number; amountCents: number }[] = [];
    for (const [yearStr, months] of Object.entries(HISTORICAL)) {
      const year = parseInt(yearStr, 10);
      months.forEach((euro, idx) => {
        rows.push({
          year,
          month: idx + 1,
          amountCents: euro * 100,
        });
      });
    }

    await db.insert(historicalRevenue).values(rows);
    return NextResponse.json({ action: force ? "reseeded" : "seeded", inserted: rows.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
