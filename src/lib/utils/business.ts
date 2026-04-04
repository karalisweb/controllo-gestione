/**
 * Logica di business pura (senza dipendenze DB)
 * Estratta dalle API routes per testabilità
 */

/**
 * Calcola l'importo disponibile da un incasso lordo (IVA inclusa)
 * Formula: lordo → netto (÷1.22) → meno commissione → meno soci 30% → disponibile
 *
 * @param grossAmount Importo lordo in centesimi
 * @param commissionRate Percentuale commissione (es. 20 = 20%), default 0
 * @returns Importo disponibile in centesimi
 */
export function calculateAvailableFromGross(grossAmount: number, commissionRate: number = 0): number {
  const netAmount = Math.round(grossAmount / 1.22);
  const commissionAmount = Math.round(netAmount * (commissionRate / 100));
  const postCommission = netAmount - commissionAmount;
  const partnersAmount = Math.round(postCommission * 0.30);
  return postCommission - partnersAmount;
}

/**
 * Genera rate virtuali in base al tipo di pagamento
 *
 * @param totalAmount Importo totale lordo in centesimi
 * @param paymentType Tipo pagamento (sito_web_50_50, msd_30_70, marketing_4_trim, immediato)
 * @param startMonth Mese di partenza (1-12)
 * @param startYear Anno di partenza
 * @returns Array di rate con mese, anno e importo lordo
 */
export function generateVirtualInstallments(
  totalAmount: number,
  paymentType: string,
  startMonth: number,
  startYear: number
): { month: number; year: number; grossAmount: number }[] {
  switch (paymentType) {
    case "sito_web_50_50": {
      const first = Math.round(totalAmount / 2);
      let secondMonth = startMonth + 2;
      let secondYear = startYear;
      if (secondMonth > 12) { secondMonth -= 12; secondYear += 1; }
      return [
        { month: startMonth, year: startYear, grossAmount: first },
        { month: secondMonth, year: secondYear, grossAmount: totalAmount - first },
      ];
    }
    case "msd_30_70": {
      const msdFirst = Math.round(totalAmount * 0.30);
      return [
        { month: startMonth, year: startYear, grossAmount: msdFirst },
        { month: startMonth, year: startYear, grossAmount: totalAmount - msdFirst },
      ];
    }
    case "marketing_4_trim": {
      const quarterly = Math.round(totalAmount / 4);
      const installments = [];
      for (let i = 0; i < 4; i++) {
        let m = startMonth + (i * 3);
        let y = startYear;
        while (m > 12) { m -= 12; y += 1; }
        installments.push({
          month: m,
          year: y,
          grossAmount: i === 3 ? totalAmount - (quarterly * 3) : quarterly,
        });
      }
      return installments;
    }
    default: // immediato, custom
      return [{ month: startMonth, year: startYear, grossAmount: totalAmount }];
  }
}

/**
 * Calcola il runway in mesi
 *
 * @param currentBalance Saldo attuale in centesimi
 * @param monthlyBurn Uscite medie mensili in centesimi (spese + PDR)
 * @returns Numero di mesi di liquidità (max 99 se burn = 0)
 */
export function calculateRunway(currentBalance: number, monthlyBurn: number): number {
  if (monthlyBurn <= 0) return 99;
  return currentBalance / monthlyBurn;
}

/**
 * Determina lo stato aziendale
 *
 * @param daysTodifficulty Giorni fino al giorno di difficoltà
 * @param endOfPeriodBalance Saldo a fine periodo in centesimi
 * @returns Stato: DIFESA | STABILIZZAZIONE | CRESCITA
 */
export function getCompanyState(
  daysToDifficulty: number,
  endOfPeriodBalance: number
): "DIFESA" | "STABILIZZAZIONE" | "CRESCITA" {
  if (daysToDifficulty < 30) return "DIFESA";
  if (endOfPeriodBalance < 100000) return "STABILIZZAZIONE"; // 1.000 EUR = 100.000 centesimi
  return "CRESCITA";
}

/**
 * Calcola la differenza in mesi tra due date
 */
export function monthDifference(d1: Date, d2: Date): number {
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

/**
 * Calcola la distanza in giorni tra due date YYYY-MM-DD
 */
export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Confronto fuzzy tra nome controparte bancaria e descrizione forecast
 */
export function namesMatch(counterparty: string, forecastDescription: string): boolean {
  const cp = counterparty.toLowerCase().trim();
  const fd = forecastDescription.toLowerCase().trim();

  if (cp === fd) return true;
  if (cp.includes(fd) || fd.includes(cp)) return true;

  const cpWords = cp.split(/[\s\-_.,&]+/).filter((w) => w.length >= 4);
  const fdWords = fd.split(/[\s\-_.,&]+/).filter((w) => w.length >= 4);

  for (const cpWord of cpWords) {
    for (const fdWord of fdWords) {
      if (cpWord === fdWord || cpWord.includes(fdWord) || fdWord.includes(cpWord)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Genera le date di occorrenza per una voce ricorrente (forecast)
 */
export function generateOccurrences(
  startDate: string,
  endDate: string | null,
  frequency: string,
  expectedDay: number,
  rangeStart: string,
  rangeEnd: string
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(rangeEnd);
  const rStart = new Date(rangeStart);
  const rEnd = new Date(rangeEnd);

  let current = new Date(Math.max(start.getTime(), rStart.getTime()));
  current.setDate(1);

  while (current <= rEnd && current <= end) {
    const monthsDiff = monthDifference(start, current);
    let isOccurrence = false;

    switch (frequency) {
      case "monthly":
        isOccurrence = true;
        break;
      case "quarterly":
        isOccurrence = monthsDiff % 3 === 0;
        break;
      case "semiannual":
        isOccurrence = monthsDiff % 6 === 0;
        break;
      case "annual":
      case "one_time":
        isOccurrence = monthsDiff % 12 === 0;
        break;
    }

    if (isOccurrence) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const day = Math.min(expectedDay, lastDay);

      const occurrenceDate = new Date(year, month, day);

      if (
        occurrenceDate >= rStart &&
        occurrenceDate <= rEnd &&
        occurrenceDate >= start &&
        occurrenceDate <= end
      ) {
        const y = occurrenceDate.getFullYear();
        const m = String(occurrenceDate.getMonth() + 1).padStart(2, "0");
        const d = String(occurrenceDate.getDate()).padStart(2, "0");
        dates.push(`${y}-${m}-${d}`);
      }
    }

    current.setMonth(current.getMonth() + 1);
  }

  return dates;
}
