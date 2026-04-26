import { describe, it, expect } from "vitest";
import { generateOccurrences, addMonths, addDays } from "../subscriptions";

describe("addMonths", () => {
  it("aggiunge mesi semplici", () => {
    expect(addMonths("2026-01-15", 1)).toBe("2026-02-15");
    expect(addMonths("2026-01-15", 3)).toBe("2026-04-15");
    expect(addMonths("2026-01-15", 12)).toBe("2027-01-15");
  });

  it("clamp al 28/29 feb se giorno > 28", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29"); // bisestile
  });

  it("attraversa anno", () => {
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
    expect(addMonths("2026-12-31", 1)).toBe("2027-01-31");
  });
});

describe("addDays", () => {
  it("aggiunge giorni semplici", () => {
    expect(addDays("2026-01-15", 14)).toBe("2026-01-29");
    expect(addDays("2026-04-01", 60)).toBe("2026-05-31");
  });

  it("attraversa mese e anno", () => {
    expect(addDays("2026-01-25", 10)).toBe("2026-02-04");
    expect(addDays("2026-12-25", 10)).toBe("2027-01-04");
  });
});

describe("generateOccurrences (recurring)", () => {
  it("ricorrente mensile su 12 mesi → 12 occorrenze", () => {
    const result = generateOccurrences({
      type: "recurring",
      startDate: "2026-01-15",
      endDate: "2026-12-31",
      amount: 31720,
      intervalMonths: 1,
      label: "SMM Cliente X",
    });
    expect(result).toHaveLength(12);
    expect(result[0].date).toBe("2026-01-15");
    expect(result[11].date).toBe("2026-12-15");
    expect(result[0].amount).toBe(31720);
    expect(result[0].isFinal).toBe(false);
    expect(result[11].isFinal).toBe(true);
  });

  it("ricorrente trimestrale su 12 mesi → 4 occorrenze", () => {
    const result = generateOccurrences({
      type: "recurring",
      startDate: "2026-02-20",
      endDate: "2026-12-31",
      amount: 131760,
      intervalMonths: 3,
    });
    expect(result).toHaveLength(4);
    expect(result.map((o) => o.date)).toEqual([
      "2026-02-20",
      "2026-05-20",
      "2026-08-20",
      "2026-11-20",
    ]);
  });

  it("ricorrente annuale su 5 anni → 5 occorrenze", () => {
    const result = generateOccurrences({
      type: "recurring",
      startDate: "2026-05-01",
      endDate: "2030-12-31",
      amount: 38430,
      intervalMonths: 12,
    });
    expect(result).toHaveLength(5);
    expect(result.map((o) => o.date)).toEqual([
      "2026-05-01",
      "2027-05-01",
      "2028-05-01",
      "2029-05-01",
      "2030-05-01",
    ]);
  });

  it("senza endDate → solo prima occorrenza (safety)", () => {
    const result = generateOccurrences({
      type: "recurring",
      startDate: "2026-01-15",
      endDate: null,
      amount: 10000,
      intervalMonths: 1,
    });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-01-15");
  });

  it("intervallo custom (5 mesi) funziona", () => {
    const result = generateOccurrences({
      type: "recurring",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      amount: 10000,
      intervalMonths: 5,
    });
    expect(result).toHaveLength(3); // gen, giu, nov
    expect(result.map((o) => o.date)).toEqual(["2026-01-01", "2026-06-01", "2026-11-01"]);
  });
});

describe("generateOccurrences (installments)", () => {
  it("MSD pacchetto 30/70 a 14gg", () => {
    const result = generateOccurrences({
      type: "installments",
      startDate: "2026-04-01",
      endDate: null,
      amount: 244000, // 2440€ totale
      firstPct: 30,
      offsetDays: 14,
      label: "MSD Cliente Y",
    });
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-04-01");
    expect(result[0].amount).toBe(73200); // 30% di 2440€
    expect(result[0].isFinal).toBe(false);
    expect(result[1].date).toBe("2026-04-15"); // +14gg
    expect(result[1].amount).toBe(170800); // 70% di 2440€ = 244000-73200
    expect(result[1].isFinal).toBe(true);
  });

  it("Sito Web 50/50 a 60gg", () => {
    const result = generateOccurrences({
      type: "installments",
      startDate: "2026-03-15",
      endDate: null,
      amount: 366000, // 3660€ totale
      firstPct: 50,
      offsetDays: 60,
    });
    expect(result).toHaveLength(2);
    expect(result[0].amount).toBe(183000);
    expect(result[1].amount).toBe(183000);
    expect(result[1].date).toBe("2026-05-14");
  });

  it("100/0 con offset 0 = una tantum (acconto pieno + saldo zero)", () => {
    const result = generateOccurrences({
      type: "installments",
      startDate: "2026-01-15",
      endDate: null,
      amount: 50000,
      firstPct: 100,
      offsetDays: 0,
    });
    expect(result).toHaveLength(2); // anche se la seconda è 0
    expect(result[0].amount).toBe(50000);
    expect(result[1].amount).toBe(0);
  });

  it("totale 0 → nessuna occorrenza (evita movimenti a zero nel ledger)", () => {
    const result = generateOccurrences({
      type: "installments",
      startDate: "2026-01-15",
      endDate: null,
      amount: 0,
      firstPct: 50,
      offsetDays: 60,
    });
    expect(result).toHaveLength(0);
  });

  it("la somma di acconto+saldo equivale al totale (senza arrotondamenti)", () => {
    const total = 244000;
    const result = generateOccurrences({
      type: "installments",
      startDate: "2026-04-01",
      endDate: null,
      amount: total,
      firstPct: 30,
      offsetDays: 14,
    });
    expect(result[0].amount + result[1].amount).toBe(total);
  });

  it("description include label e schema", () => {
    const result = generateOccurrences({
      type: "installments",
      startDate: "2026-04-01",
      endDate: null,
      amount: 100000,
      firstPct: 30,
      offsetDays: 14,
      label: "MSD Mario Rossi",
    });
    expect(result[0].description).toContain("MSD Mario Rossi");
    expect(result[0].description).toContain("acconto");
    expect(result[1].description).toContain("saldo");
  });
});
