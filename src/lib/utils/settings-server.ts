import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { DEFAULT_SPLIT_CONFIG, type SplitConfig } from "./splits";

/**
 * Helper server-side per leggere/scrivere le impostazioni globali dell'app.
 * Solo per uso da API routes / server components.
 */

export const SPLIT_KEYS = {
  vatPct: "split_vat_pct",
  alessioPct: "split_alessio_pct",
  danielaPct: "split_daniela_pct",
} as const;

/**
 * Restituisce la configurazione attiva delle percentuali di split.
 * Se le chiavi non esistono nel DB usa i default e NON le crea (le crea solo
 * la PUT esplicita dell'utente, per evitare ghost-write).
 */
export async function getSplitConfig(): Promise<SplitConfig> {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, Object.values(SPLIT_KEYS)));

  const map = new Map(rows.map((r) => [r.key, parseFloat(r.value)]));

  const vatPct = map.get(SPLIT_KEYS.vatPct);
  const alessioPct = map.get(SPLIT_KEYS.alessioPct);
  const danielaPct = map.get(SPLIT_KEYS.danielaPct);

  return {
    vatPct: Number.isFinite(vatPct) ? (vatPct as number) : DEFAULT_SPLIT_CONFIG.vatPct,
    alessioPct: Number.isFinite(alessioPct)
      ? (alessioPct as number)
      : DEFAULT_SPLIT_CONFIG.alessioPct,
    danielaPct: Number.isFinite(danielaPct)
      ? (danielaPct as number)
      : DEFAULT_SPLIT_CONFIG.danielaPct,
  };
}

/**
 * Aggiorna la configurazione delle percentuali di split.
 * Semantica: "da adesso in poi" — i record già esistenti in `income_splits`
 * (che memorizzano gli importi calcolati, non le percentuali) restano invariati.
 * Solo i nuovi calcoli useranno le percentuali aggiornate.
 *
 * Validazione: ogni percentuale deve essere finita e nell'intervallo [0, 100].
 */
export async function setSplitConfig(config: SplitConfig): Promise<SplitConfig> {
  const validate = (label: string, value: unknown): number => {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error(`${label}: percentuale non valida (atteso 0-100, ricevuto ${value})`);
    }
    return value;
  };

  const safe: SplitConfig = {
    vatPct: validate("vatPct", config.vatPct),
    alessioPct: validate("alessioPct", config.alessioPct),
    danielaPct: validate("danielaPct", config.danielaPct),
  };

  const upserts: Array<{ key: string; value: string; description: string }> = [
    {
      key: SPLIT_KEYS.vatPct,
      value: String(safe.vatPct),
      description: "Aliquota IVA applicata sul netto degli incassi (percentuale)",
    },
    {
      key: SPLIT_KEYS.alessioPct,
      value: String(safe.alessioPct),
      description: "Quota Alessio sul netto degli incassi (percentuale)",
    },
    {
      key: SPLIT_KEYS.danielaPct,
      value: String(safe.danielaPct),
      description: "Quota Daniela sul netto degli incassi (percentuale)",
    },
  ];

  for (const u of upserts) {
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, u.key))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(settings).values({
        key: u.key,
        value: u.value,
        type: "number",
        description: u.description,
      });
    } else {
      await db
        .update(settings)
        .set({ value: u.value, description: u.description })
        .where(eq(settings.key, u.key));
    }
  }

  return safe;
}
