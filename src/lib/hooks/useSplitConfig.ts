"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SPLIT_CONFIG, type SplitConfig } from "@/lib/utils/splits";

/**
 * Hook client-side per leggere le percentuali di split attive.
 * Fetcha da `/api/settings/percentages` al mount del componente che lo usa.
 *
 * Restituisce sempre una `config` valida: durante il fetch (o se errore)
 * usa `DEFAULT_SPLIT_CONFIG`, così i componenti possono renderizzare subito
 * senza stati intermedi.
 *
 * Cache module-level: una sola fetch per sessione/pagina.
 */

type Listener = (config: SplitConfig) => void;

let cachedConfig: SplitConfig | null = null;
let inflight: Promise<SplitConfig> | null = null;
const listeners = new Set<Listener>();

async function fetchConfig(): Promise<SplitConfig> {
  if (cachedConfig) return cachedConfig;
  if (inflight) return inflight;

  inflight = fetch("/api/settings/percentages")
    .then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as SplitConfig;
      cachedConfig = data;
      listeners.forEach((l) => l(data));
      return data;
    })
    .catch(() => {
      cachedConfig = DEFAULT_SPLIT_CONFIG;
      return DEFAULT_SPLIT_CONFIG;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/**
 * Invalida la cache delle percentuali. Da chiamare dopo aver aggiornato
 * le percentuali via PUT /api/settings/percentages, così tutti i componenti
 * che usano l'hook si aggiornano.
 */
export function invalidateSplitConfig(next?: SplitConfig) {
  cachedConfig = next ?? null;
  if (next) listeners.forEach((l) => l(next));
}

export function useSplitConfig(): { config: SplitConfig; loading: boolean } {
  const [config, setConfig] = useState<SplitConfig>(cachedConfig ?? DEFAULT_SPLIT_CONFIG);
  const [loading, setLoading] = useState(cachedConfig === null);

  useEffect(() => {
    const listener: Listener = (next) => setConfig(next);
    listeners.add(listener);

    if (cachedConfig === null) {
      fetchConfig().then((c) => {
        setConfig(c);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { config, loading };
}
