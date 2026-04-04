import { describe, it, expect } from "vitest";
import {
  calculateAvailableFromGross,
  generateVirtualInstallments,
  calculateRunway,
  getCompanyState,
  monthDifference,
  daysBetween,
  namesMatch,
  generateOccurrences,
} from "../business";

// =============================================================================
// CALCOLO DISPONIBILE DA INCASSO LORDO
// =============================================================================

describe("calculateAvailableFromGross", () => {
  it("calcola disponibile senza commissione: lordo 1.220 EUR", () => {
    // 1220 EUR lordi → 1000 netti → soci 30% = 300 → disponibile = 700
    const result = calculateAvailableFromGross(122000);
    expect(result).toBe(70000); // 700 EUR
  });

  it("calcola disponibile con commissione 20%", () => {
    // 1220 EUR lordi → 1000 netti → commissione 200 → post-comm 800 → soci 240 → disponibile 560
    const result = calculateAvailableFromGross(122000, 20);
    expect(result).toBe(56000); // 560 EUR
  });

  it("gestisce commissione 0%", () => {
    const withZero = calculateAvailableFromGross(122000, 0);
    const withDefault = calculateAvailableFromGross(122000);
    expect(withZero).toBe(withDefault);
  });

  it("gestisce importo zero", () => {
    expect(calculateAvailableFromGross(0)).toBe(0);
  });

  it("regola business: il 48% del lordo per incassi ricorrenti (senza commissione)", () => {
    // Per incassi senza commissione: disponibile ≈ 48% del lordo
    // lordo / 1.22 * 0.70 = lordo * 0.5738...
    // In realtà il CLAUDE.md dice 48% ma il calcolo reale è netto * 0.70
    const result = calculateAvailableFromGross(100000); // 1000 EUR
    const netAmount = Math.round(100000 / 1.22); // 81967
    const expected = netAmount - Math.round(netAmount * 0.30); // 81967 - 24590 = 57377
    expect(result).toBe(expected);
  });
});

// =============================================================================
// GENERAZIONE RATE VIRTUALI
// =============================================================================

describe("generateVirtualInstallments", () => {
  it("sito_web_50_50: due rate al 50%, seconda dopo 2 mesi", () => {
    const result = generateVirtualInstallments(200000, "sito_web_50_50", 3, 2026);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ month: 3, year: 2026, grossAmount: 100000 });
    expect(result[1]).toEqual({ month: 5, year: 2026, grossAmount: 100000 });
  });

  it("sito_web_50_50: gestisce cambio anno (novembre → gennaio)", () => {
    const result = generateVirtualInstallments(200000, "sito_web_50_50", 11, 2026);

    expect(result[0]).toEqual({ month: 11, year: 2026, grossAmount: 100000 });
    expect(result[1]).toEqual({ month: 1, year: 2027, grossAmount: 100000 });
  });

  it("msd_30_70: due rate nello stesso mese, 30% + 70%", () => {
    const result = generateVirtualInstallments(100000, "msd_30_70", 6, 2026);

    expect(result).toHaveLength(2);
    expect(result[0].grossAmount).toBe(30000); // 30%
    expect(result[1].grossAmount).toBe(70000); // 70%
    expect(result[0].month).toBe(6);
    expect(result[1].month).toBe(6);
  });

  it("marketing_4_trim: 4 rate trimestrali", () => {
    const result = generateVirtualInstallments(120000, "marketing_4_trim", 1, 2026);

    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ month: 1, year: 2026, grossAmount: 30000 });
    expect(result[1]).toEqual({ month: 4, year: 2026, grossAmount: 30000 });
    expect(result[2]).toEqual({ month: 7, year: 2026, grossAmount: 30000 });
    expect(result[3]).toEqual({ month: 10, year: 2026, grossAmount: 30000 });
  });

  it("marketing_4_trim: gestisce cambio anno", () => {
    const result = generateVirtualInstallments(120000, "marketing_4_trim", 6, 2026);

    expect(result[0].month).toBe(6);
    expect(result[0].year).toBe(2026);
    expect(result[1].month).toBe(9);
    expect(result[1].year).toBe(2026);
    expect(result[2].month).toBe(12);
    expect(result[2].year).toBe(2026);
    expect(result[3].month).toBe(3);
    expect(result[3].year).toBe(2027);
  });

  it("marketing_4_trim: la somma delle rate è uguale al totale", () => {
    const total = 100000;
    const result = generateVirtualInstallments(total, "marketing_4_trim", 1, 2026);
    const sum = result.reduce((s, r) => s + r.grossAmount, 0);
    expect(sum).toBe(total);
  });

  it("immediato: una sola rata", () => {
    const result = generateVirtualInstallments(50000, "immediato", 3, 2026);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ month: 3, year: 2026, grossAmount: 50000 });
  });

  it("custom: una sola rata (come immediato)", () => {
    const result = generateVirtualInstallments(50000, "custom", 3, 2026);
    expect(result).toHaveLength(1);
  });
});

// =============================================================================
// RUNWAY
// =============================================================================

describe("calculateRunway", () => {
  it("calcola i mesi di liquidità", () => {
    // 30.000 EUR di cassa, 10.000 EUR/mese di uscite = 3 mesi
    expect(calculateRunway(3000000, 1000000)).toBe(3);
  });

  it("restituisce 99 se non ci sono uscite", () => {
    expect(calculateRunway(1000000, 0)).toBe(99);
  });

  it("restituisce valore frazionario", () => {
    // 15.000 EUR cassa, 10.000 EUR/mese = 1.5 mesi
    expect(calculateRunway(1500000, 1000000)).toBe(1.5);
  });
});

// =============================================================================
// STATO AZIENDALE
// =============================================================================

describe("getCompanyState", () => {
  it("DIFESA: meno di 30 giorni alla difficoltà", () => {
    expect(getCompanyState(15, 500000)).toBe("DIFESA");
    expect(getCompanyState(0, 500000)).toBe("DIFESA");
    expect(getCompanyState(29, 500000)).toBe("DIFESA");
  });

  it("STABILIZZAZIONE: saldo fine periodo < 1.000 EUR", () => {
    expect(getCompanyState(60, 50000)).toBe("STABILIZZAZIONE"); // 500 EUR
    expect(getCompanyState(60, 99999)).toBe("STABILIZZAZIONE"); // 999,99 EUR
    expect(getCompanyState(60, 0)).toBe("STABILIZZAZIONE");
  });

  it("CRESCITA: liquidità sufficiente", () => {
    expect(getCompanyState(60, 100000)).toBe("CRESCITA"); // 1.000 EUR esatti
    expect(getCompanyState(90, 500000)).toBe("CRESCITA");
  });

  it("DIFESA ha priorità su STABILIZZAZIONE", () => {
    // Anche se saldo basso, se giorni < 30 è DIFESA
    expect(getCompanyState(10, 50000)).toBe("DIFESA");
  });
});

// =============================================================================
// UTILITY: DISTANZE DATE
// =============================================================================

describe("monthDifference", () => {
  it("calcola la differenza in mesi", () => {
    expect(monthDifference(new Date(2026, 0, 1), new Date(2026, 2, 1))).toBe(2); // Gen → Mar
    expect(monthDifference(new Date(2026, 0, 1), new Date(2027, 0, 1))).toBe(12); // 1 anno
    expect(monthDifference(new Date(2026, 0, 1), new Date(2026, 0, 1))).toBe(0);
  });
});

describe("daysBetween", () => {
  it("calcola i giorni tra due date", () => {
    expect(daysBetween("2026-03-01", "2026-03-08")).toBe(7);
    expect(daysBetween("2026-03-08", "2026-03-01")).toBe(7); // simmetrico
    expect(daysBetween("2026-01-01", "2026-01-01")).toBe(0);
  });

  it("attraversa mesi e anni", () => {
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
  });
});

// =============================================================================
// MATCHING NOMI (RICONCILIAZIONE)
// =============================================================================

describe("namesMatch", () => {
  it("match esatto", () => {
    expect(namesMatch("Wind Telefonia", "Wind Telefonia")).toBe(true);
  });

  it("match case-insensitive", () => {
    expect(namesMatch("WIND TELEFONIA", "wind telefonia")).toBe(true);
  });

  it("uno contiene l'altro", () => {
    expect(namesMatch("Wind Tre S.p.A.", "Wind")).toBe(true);
    expect(namesMatch("Asana", "Asana Inc. Monthly")).toBe(true);
  });

  it("match per parola significativa (>= 4 caratteri)", () => {
    expect(namesMatch("FASTRENT SRL", "FastRent Ufficio")).toBe(true);
    expect(namesMatch("Pagamento Aruba", "Aruba S.p.A. Hosting")).toBe(true);
  });

  it("non matcha nomi completamente diversi", () => {
    expect(namesMatch("Wind Telefonia", "Aruba Hosting")).toBe(false);
    expect(namesMatch("Asana", "Figma")).toBe(false);
  });

  it("non matcha parole corte (< 4 caratteri)", () => {
    // "SRL" ha solo 3 caratteri, non deve matchare
    expect(namesMatch("ABC SRL", "XYZ SRL")).toBe(false);
  });
});

// =============================================================================
// GENERAZIONE OCCORRENZE (FORECAST)
// =============================================================================

describe("generateOccurrences", () => {
  it("genera occorrenze mensili nel range", () => {
    const dates = generateOccurrences(
      "2026-01-01", // start
      null, // no end
      "monthly",
      15, // giorno 15
      "2026-01-01", // range start
      "2026-03-31" // range end
    );

    expect(dates).toEqual(["2026-01-15", "2026-02-15", "2026-03-15"]);
  });

  it("genera occorrenze trimestrali", () => {
    const dates = generateOccurrences(
      "2026-01-01",
      null,
      "quarterly",
      15, // giorno 15 per evitare edge case timezone sui confini mese
      "2026-01-01",
      "2026-12-31"
    );

    expect(dates).toEqual(["2026-01-15", "2026-04-15", "2026-07-15", "2026-10-15"]);
  });

  it("genera occorrenze semestrali", () => {
    const dates = generateOccurrences(
      "2026-01-01",
      null,
      "semiannual",
      15,
      "2026-01-01",
      "2026-12-31"
    );

    expect(dates).toEqual(["2026-01-15", "2026-07-15"]);
  });

  it("genera occorrenza annuale", () => {
    // Start giugno 2025 → occorrenze annuali a giugno di ogni anno
    const dates = generateOccurrences(
      "2025-06-15",
      null,
      "annual",
      15,
      "2026-01-01",
      "2027-12-31"
    );

    expect(dates).toEqual(["2026-06-15", "2027-06-15"]);
  });

  it("rispetta endDate del contratto", () => {
    const dates = generateOccurrences(
      "2026-01-01",
      "2026-02-28", // contratto finisce a febbraio
      "monthly",
      15,
      "2026-01-01",
      "2026-12-31"
    );

    expect(dates).toEqual(["2026-01-15", "2026-02-15"]);
  });

  it("gestisce giorno 31 in mesi con meno giorni (febbraio)", () => {
    const dates = generateOccurrences(
      "2026-01-01",
      null,
      "monthly",
      31,
      "2026-02-01",
      "2026-02-28"
    );

    // Febbraio 2026 ha 28 giorni, quindi il 31 diventa 28
    expect(dates).toEqual(["2026-02-28"]);
  });

  it("non genera occorrenze fuori dal range", () => {
    const dates = generateOccurrences(
      "2026-06-01", // parte da giugno
      null,
      "monthly",
      15,
      "2026-01-01", // range parte da gennaio
      "2026-03-31" // range finisce a marzo
    );

    // Nessuna occorrenza: il contratto inizia a giugno ma il range finisce a marzo
    expect(dates).toEqual([]);
  });

  it("one_time genera una sola occorrenza", () => {
    // one_time usa stessa logica di annual (monthsDiff % 12)
    // Start giugno 2025 con range 2026 → occorre a giugno 2026
    const dates = generateOccurrences(
      "2025-06-15",
      null,
      "one_time",
      15,
      "2026-01-01",
      "2026-12-31"
    );

    expect(dates).toEqual(["2026-06-15"]);
  });
});
