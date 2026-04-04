import { describe, it, expect } from "vitest";
import { calculateSplit, calculateSplitFromEuros, verifySplit } from "../splits";

describe("calculateSplit", () => {
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
    expect(result.agencyAmount).toBe(28689); // 70%
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

  it("mantiene la coerenza: daniela(10%) + alessio(20%) + agenzia(70%) = netto", () => {
    const result = calculateSplit(122000);
    const sumPartners = result.danielaAmount + result.alessioAmount + result.agencyAmount;
    expect(sumPartners).toBe(result.netAmount);
  });

  it("mantiene coerenza per importi non rotondi", () => {
    // Test con importo che genera arrotondamenti
    const result = calculateSplit(33333); // 333,33 EUR
    const sumPartners = result.danielaAmount + result.alessioAmount + result.agencyAmount;
    // Tolleranza di 1 centesimo per arrotondamenti
    expect(Math.abs(sumPartners - result.netAmount)).toBeLessThanOrEqual(1);
  });
});

describe("calculateSplitFromEuros", () => {
  it("converte da euro e calcola lo split", () => {
    const result = calculateSplitFromEuros(1220);
    expect(result.grossAmount).toBe(122000);
    expect(result.netAmount).toBe(100000);
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
