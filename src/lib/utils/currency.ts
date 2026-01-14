/**
 * Converte un importo in centesimi in euro
 */
export function centsToEuros(cents: number): number {
  return cents / 100;
}

/**
 * Converte un importo in euro in centesimi
 */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Formatta un importo in centesimi come stringa in euro
 * Formato: 10.000,00 €
 */
export function formatCurrency(cents: number): string {
  const euros = centsToEuros(cents);
  // Formatta manualmente per garantire il formato italiano
  // con punto come separatore migliaia e virgola per decimali
  const [intPart, decPart] = euros.toFixed(2).split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withThousands},${decPart} €`;
}

/**
 * Formatta un importo in centesimi come stringa senza simbolo valuta
 */
export function formatAmount(cents: number): string {
  const euros = centsToEuros(cents);
  // Formatta manualmente per garantire il formato italiano
  const [intPart, decPart] = euros.toFixed(2).split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withThousands},${decPart}`;
}

/**
 * Parse una stringa in formato italiano (1.234,56) in centesimi
 */
export function parseItalianCurrency(value: string): number {
  const cleaned = value
    .replace(/[€\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return eurosToCents(parseFloat(cleaned) || 0);
}
