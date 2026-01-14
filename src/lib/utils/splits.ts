import { eurosToCents } from "./currency";

export interface SplitResult {
  grossAmount: number; // centesimi
  netAmount: number; // centesimi
  danielaAmount: number; // centesimi (10% del netto)
  alessioAmount: number; // centesimi (20% del netto)
  agencyAmount: number; // centesimi (70% del netto)
  vatAmount: number; // centesimi (22% del netto)
}

/**
 * Calcola la ripartizione di un incasso lordo (IVA inclusa)
 *
 * Formula:
 * netto = lordo / 1.22
 * daniela = netto * 0.10
 * alessio = netto * 0.20
 * agenzia = netto * 0.70
 * iva = netto * 0.22
 *
 * @param grossAmountCents Importo lordo in centesimi
 * @returns Oggetto con tutti gli importi della ripartizione in centesimi
 */
export function calculateSplit(grossAmountCents: number): SplitResult {
  // Calcola il netto (imponibile senza IVA)
  const netAmount = Math.round(grossAmountCents / 1.22);

  // Calcola le ripartizioni sul netto
  const danielaAmount = Math.round(netAmount * 0.1);
  const alessioAmount = Math.round(netAmount * 0.2);
  const agencyAmount = Math.round(netAmount * 0.7);
  const vatAmount = Math.round(netAmount * 0.22);

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
export function calculateSplitFromEuros(grossEuros: number): SplitResult {
  return calculateSplit(eurosToCents(grossEuros));
}

/**
 * Verifica che la ripartizione sia corretta (somma = lordo)
 */
export function verifySplit(split: SplitResult): boolean {
  const sum = split.danielaAmount + split.alessioAmount + split.agencyAmount + split.vatAmount;
  // Tolleranza di 1 centesimo per arrotondamenti
  return Math.abs(sum - split.grossAmount) <= 1;
}
