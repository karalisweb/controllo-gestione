import { describe, it, expect } from "vitest";
import {
  centsToEuros,
  eurosToCents,
  formatCurrency,
  formatAmount,
  parseItalianCurrency,
} from "../currency";

describe("centsToEuros", () => {
  it("converte centesimi in euro", () => {
    expect(centsToEuros(10000)).toBe(100);
    expect(centsToEuros(150)).toBe(1.5);
    expect(centsToEuros(1)).toBe(0.01);
    expect(centsToEuros(0)).toBe(0);
  });

  it("gestisce valori negativi", () => {
    expect(centsToEuros(-5000)).toBe(-50);
  });
});

describe("eurosToCents", () => {
  it("converte euro in centesimi", () => {
    expect(eurosToCents(100)).toBe(10000);
    expect(eurosToCents(1.5)).toBe(150);
    expect(eurosToCents(0.01)).toBe(1);
    expect(eurosToCents(0)).toBe(0);
  });

  it("arrotonda correttamente floating point", () => {
    // 19.99 * 100 = 1998.9999... in floating point
    expect(eurosToCents(19.99)).toBe(1999);
    expect(eurosToCents(0.1 + 0.2)).toBe(30); // 0.30000000000000004
  });

  it("gestisce valori negativi", () => {
    expect(eurosToCents(-50)).toBe(-5000);
  });
});

describe("formatCurrency", () => {
  it("formatta in formato italiano con simbolo euro", () => {
    expect(formatCurrency(1000000)).toBe("10.000,00 €");
    expect(formatCurrency(150000)).toBe("1.500,00 €");
    expect(formatCurrency(100)).toBe("1,00 €");
    expect(formatCurrency(50)).toBe("0,50 €");
    expect(formatCurrency(1)).toBe("0,01 €");
  });

  it("formatta zero", () => {
    expect(formatCurrency(0)).toBe("0,00 €");
  });

  it("formatta importi negativi", () => {
    expect(formatCurrency(-150000)).toBe("-1.500,00 €");
  });

  it("formatta importi grandi", () => {
    expect(formatCurrency(10000000)).toBe("100.000,00 €");
    expect(formatCurrency(100000000)).toBe("1.000.000,00 €");
  });
});

describe("formatAmount", () => {
  it("formatta senza simbolo euro", () => {
    expect(formatAmount(1000000)).toBe("10.000,00");
    expect(formatAmount(150000)).toBe("1.500,00");
    expect(formatAmount(100)).toBe("1,00");
  });
});

describe("parseItalianCurrency", () => {
  it("parsa formato italiano con punto migliaia e virgola decimali", () => {
    expect(parseItalianCurrency("1.500,00")).toBe(150000);
    expect(parseItalianCurrency("10.000,00")).toBe(1000000);
    expect(parseItalianCurrency("100,50")).toBe(10050);
  });

  it("parsa con simbolo euro", () => {
    expect(parseItalianCurrency("1.500,00 €")).toBe(150000);
    expect(parseItalianCurrency("€ 100,00")).toBe(10000);
  });

  it("parsa importi senza decimali", () => {
    expect(parseItalianCurrency("1.500")).toBe(150000);
  });

  it("gestisce stringa vuota o invalida", () => {
    expect(parseItalianCurrency("")).toBe(0);
    expect(parseItalianCurrency("abc")).toBe(0);
  });
});
