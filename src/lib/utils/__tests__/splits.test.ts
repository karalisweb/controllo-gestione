import { describe, it, expect } from "vitest";
import {
  calculateSplit,
  calculateSplitFromEuros,
  verifySplit,
  DEFAULT_SPLIT_CONFIG,
  type SplitConfig,
} from "../splits";

describe("calculateSplit (default config)", () => {
  it("calcola la ripartizione corretta per 1.220 EUR lordi (122000 centesimi)", () => {
    // 1.220 EUR lordi → 1.000 EUR netti (÷1.22)
    const result = calculateSplit(122000);

    expect(result.grossAmount).toBe(122000);
    expect(result.netAmount).toBe(100000); // 1.000 EUR
    expect(result.danielaAmount).toBe(10000); // 10% di 1.000 = 100 EUR
    expect(result.alessioAmount).toBe(20000); // 20% di 1.000 = 200 EUR
    expect(result.agencyAmount).toBe(70000); // 70% di 1.000 = 700 EUR
    expect(result.vatAmount).toBe(22000); // 22% di 1.000 = 220 EUR
  });

  it("calcola la ripartizione per un incasso tipico (500 EUR lordi)", () => {
    const result = calculateSplit(50000); // 500 EUR

    // Netto = 50000 / 1.22 = 40984 centesimi (409,84 EUR)
    expect(result.netAmount).toBe(40984);
    expect(result.danielaAmount).toBe(4098); // 10%
    expect(result.alessioAmount).toBe(8197); // 20%
    // Agency = netto - daniela - alessio = 40984 - 4098 - 8197 = 28689
    expect(result.agencyAmount).toBe(28689);
    expect(result.vatAmount).toBe(9016); // 22% (40984 * 0.22 = 9016.48, arrotondato a 9016)
  });

  it("gestisce importo zero", () => {
    const result = calculateSplit(0);
    expect(result.grossAmount).toBe(0);
    expect(result.netAmount).toBe(0);
    expect(result.danielaAmount).toBe(0);
    expect(result.alessioAmount).toBe(0);
    expect(result.agencyAmount).toBe(0);
    expect(result.vatAmount).toBe(0);
  });

  it("agency = netto - daniela - alessio (coerenza esatta sul netto)", () => {
    const result = calculateSplit(122000);
    const sumPartners = result.danielaAmount + result.alessioAmount + result.agencyAmount;
    expect(sumPartners).toBe(result.netAmount);
  });

  it("mantiene coerenza per importi non rotondi", () => {
    const result = calculateSplit(33333); // 333,33 EUR
    const sumPartners = result.danielaAmount + result.alessioAmount + result.agencyAmount;
    // Con la nuova formula (agency = netto - soci) la coerenza è esatta sul netto
    expect(sumPartners).toBe(result.netAmount);
  });
});

describe("calculateSplit (custom config)", () => {
  it("rispetta config personalizzata: IVA 10, Alessio 30, Daniela 15", () => {
    const config: SplitConfig = { vatPct: 10, alessioPct: 30, danielaPct: 15 };
    const result = calculateSplit(11000, config); // lordo 110, IVA 10% → netto 100

    expect(result.netAmount).toBe(10000); // 100 EUR
    expect(result.vatAmount).toBe(1000); // 10% di 100
    expect(result.alessioAmount).toBe(3000); // 30% di 100
    expect(result.danielaAmount).toBe(1500); // 15% di 100
    expect(result.agencyAmount).toBe(5500); // 100 - 30 - 15 = 55
  });

  it("config con IVA 0 lascia netto = lordo", () => {
    const config: SplitConfig = { vatPct: 0, alessioPct: 20, danielaPct: 10 };
    const result = calculateSplit(10000, config);

    expect(result.netAmount).toBe(10000);
    expect(result.vatAmount).toBe(0);
    expect(result.alessioAmount).toBe(2000);
    expect(result.danielaAmount).toBe(1000);
    expect(result.agencyAmount).toBe(7000);
  });

  it("config con quote soci a zero lascia tutto in agenzia", () => {
    const config: SplitConfig = { vatPct: 22, alessioPct: 0, danielaPct: 0 };
    const result = calculateSplit(122000, config);

    expect(result.netAmount).toBe(100000);
    expect(result.vatAmount).toBe(22000);
    expect(result.alessioAmount).toBe(0);
    expect(result.danielaAmount).toBe(0);
    expect(result.agencyAmount).toBe(100000);
  });

  it("DEFAULT_SPLIT_CONFIG produce lo stesso risultato del default implicito", () => {
    const explicit = calculateSplit(50000, DEFAULT_SPLIT_CONFIG);
    const implicit = calculateSplit(50000);
    expect(explicit).toEqual(implicit);
  });
});

describe("calculateSplitFromEuros", () => {
  it("converte da euro e calcola lo split", () => {
    const result = calculateSplitFromEuros(1220);
    expect(result.grossAmount).toBe(122000);
    expect(result.netAmount).toBe(100000);
  });

  it("usa config personalizzata anche da euro", () => {
    const config: SplitConfig = { vatPct: 0, alessioPct: 50, danielaPct: 0 };
    const result = calculateSplitFromEuros(100, config);
    expect(result.netAmount).toBe(10000);
    expect(result.alessioAmount).toBe(5000);
    expect(result.agencyAmount).toBe(5000);
  });
});

describe("verifySplit", () => {
  it("verifica uno split corretto", () => {
    const split = calculateSplit(122000);
    expect(verifySplit(split)).toBe(true);
  });

  it("verifica uno split con arrotondamenti", () => {
    const split = calculateSplit(33333);
    expect(verifySplit(split)).toBe(true);
  });

  it("rileva uno split errato", () => {
    expect(
      verifySplit({
        grossAmount: 100000,
        netAmount: 81967,
        danielaAmount: 8197,
        alessioAmount: 16393,
        agencyAmount: 57377,
        vatAmount: 18033,
      })
    ).toBe(true); // somma = 100000 ≈ grossAmount

    expect(
      verifySplit({
        grossAmount: 100000,
        netAmount: 81967,
        danielaAmount: 0,
        alessioAmount: 0,
        agencyAmount: 0,
        vatAmount: 0,
      })
    ).toBe(false); // somma = 0 ≠ 100000
  });
});
