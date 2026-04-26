import { eurosToCents } from "./currency";

export interface SplitResult {
  grossAmount: number; // centesimi
  netAmount: number; // centesimi
  danielaAmount: number; // centesimi (default 10% del netto)
  alessioAmount: number; // centesimi (default 20% del netto)
  agencyAmount: number; // centesimi (resto del netto, dopo soci)
  vatAmount: number; // centesimi (default 22% del netto)
}

export interface SplitConfig {
  vatPct: number; // percentuale IVA, es. 22
  alessioPct: number; // percentuale Alessio sul netto, es. 20
  danielaPct: number; // percentuale Daniela sul netto, es. 10
}

export const DEFAULT_SPLIT_CONFIG: SplitConfig = {
  vatPct: 22,
  alessioPct: 20,
  danielaPct: 10,
};

/**
 * Calcola la ripartizione di un incasso lordo (IVA inclusa).
 *
 * Formula:
 * netto = lordo / (1 + vatPct/100)
 * iva = netto * vatPct/100
 * alessio = netto * alessioPct/100
 * daniela = netto * danielaPct/100
 * agenzia = netto - (alessio + daniela)
 *
 * @param grossAmountCents Importo lordo in centesimi
 * @param config Percentuali da usare. Se omesso usa DEFAULT_SPLIT_CONFIG.
 *               Per ottenere i valori configurati dall'utente lato server,
 *               usare `getSplitConfig()` da `lib/utils/settings-server.ts`;
 *               lato client usare l'hook `useSplitConfig()`.
 */
export function calculateSplit(
  grossAmountCents: number,
  config: SplitConfig = DEFAULT_SPLIT_CONFIG,
): SplitResult {
  const vatFactor = config.vatPct / 100;
  const netAmount = Math.round(grossAmountCents / (1 + vatFactor));

  const vatAmount = Math.round(netAmount * vatFactor);
  const alessioAmount = Math.round(netAmount * (config.alessioPct / 100));
  const danielaAmount = Math.round(netAmount * (config.danielaPct / 100));
  const agencyAmount = netAmount - alessioAmount - danielaAmount;

  return {
    grossAmount: grossAmountCents,
    netAmount,
    danielaAmount,
    alessioAmount,
    agencyAmount,
    vatAmount,
  };
}

/**
 * Calcola la ripartizione da un importo lordo in euro
 */
export function calculateSplitFromEuros(
  grossEuros: number,
  config: SplitConfig = DEFAULT_SPLIT_CONFIG,
): SplitResult {
  return calculateSplit(eurosToCents(grossEuros), config);
}

/**
 * Verifica che la ripartizione sia coerente: agenzia + soci + IVA = lordo
 * (con tolleranza di 1 centesimo per arrotondamenti).
 */
export function verifySplit(split: SplitResult): boolean {
  const sum =
    split.danielaAmount + split.alessioAmount + split.agencyAmount + split.vatAmount;
  return Math.abs(sum - split.grossAmount) <= 1;
}
