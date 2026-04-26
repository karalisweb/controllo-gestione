import { NextRequest, NextResponse } from "next/server";
import { getSplitConfig, setSplitConfig } from "@/lib/utils/settings-server";

/**
 * GET /api/settings/percentages
 * Restituisce le percentuali attive di split (IVA / Alessio / Daniela).
 */
export async function GET() {
  try {
    const config = await getSplitConfig();
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * PUT /api/settings/percentages
 * Aggiorna le percentuali di split.
 * Body: { vatPct: number, alessioPct: number, danielaPct: number }
 *
 * Semantica "da adesso in poi": i record `income_splits` esistenti (che
 * conservano gli importi calcolati al momento dell'incasso) NON vengono
 * modificati. Solo i nuovi split useranno le percentuali aggiornate.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { vatPct, alessioPct, danielaPct } = body ?? {};

    const updated = await setSplitConfig({ vatPct, alessioPct, danielaPct });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
