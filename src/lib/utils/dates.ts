export const MONTHS = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
] as const;

export const MONTHS_SHORT = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
] as const;

/**
 * Restituisce il nome del mese dato il numero (1-12)
 */
export function getMonthName(month: number): string {
  return MONTHS[month - 1] || "";
}

/**
 * Restituisce il nome abbreviato del mese dato il numero (1-12)
 */
export function getMonthShortName(month: number): string {
  return MONTHS_SHORT[month - 1] || "";
}

/**
 * Formatta una data YYYY-MM-DD in formato italiano
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Formatta una data YYYY-MM-DD in formato breve (es. "15 Gen")
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = MONTHS_SHORT[date.getMonth()];
  return `${day} ${month}`;
}

/**
 * Estrae mese e anno da una data YYYY-MM-DD
 */
export function getMonthYear(dateStr: string): { month: number; year: number } {
  const date = new Date(dateStr);
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

/**
 * Genera una data YYYY-MM-DD dal primo giorno del mese
 */
export function getFirstDayOfMonth(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/**
 * Genera una data YYYY-MM-DD dall'ultimo giorno del mese
 */
export function getLastDayOfMonth(month: number, year: number): string {
  const date = new Date(year, month, 0);
  return `${year}-${String(month).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
