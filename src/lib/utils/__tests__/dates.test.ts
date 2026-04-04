import { describe, it, expect } from "vitest";
import {
  getMonthName,
  getMonthShortName,
  formatDate,
  formatDateShort,
  getMonthYear,
  getFirstDayOfMonth,
  getLastDayOfMonth,
} from "../dates";

describe("getMonthName", () => {
  it("restituisce il nome completo del mese in italiano", () => {
    expect(getMonthName(1)).toBe("Gennaio");
    expect(getMonthName(6)).toBe("Giugno");
    expect(getMonthName(12)).toBe("Dicembre");
  });

  it("restituisce stringa vuota per mesi fuori range", () => {
    expect(getMonthName(0)).toBe("");
    expect(getMonthName(13)).toBe("");
  });
});

describe("getMonthShortName", () => {
  it("restituisce il nome abbreviato del mese", () => {
    expect(getMonthShortName(1)).toBe("Gen");
    expect(getMonthShortName(3)).toBe("Mar");
    expect(getMonthShortName(12)).toBe("Dic");
  });
});

describe("formatDate", () => {
  it("formatta una data YYYY-MM-DD in formato italiano DD/MM/YYYY", () => {
    const result = formatDate("2026-03-15");
    expect(result).toBe("15/03/2026");
  });

  it("formatta il primo giorno dell'anno", () => {
    const result = formatDate("2026-01-01");
    expect(result).toBe("01/01/2026");
  });
});

describe("formatDateShort", () => {
  it("formatta in formato breve: giorno + mese abbreviato", () => {
    expect(formatDateShort("2026-03-15")).toBe("15 Mar");
    expect(formatDateShort("2026-01-01")).toBe("1 Gen");
    expect(formatDateShort("2026-12-25")).toBe("25 Dic");
  });
});

describe("getMonthYear", () => {
  it("estrae mese e anno da una data", () => {
    const result = getMonthYear("2026-03-15");
    expect(result.month).toBe(3);
    expect(result.year).toBe(2026);
  });

  it("gestisce dicembre", () => {
    const result = getMonthYear("2026-12-31");
    expect(result.month).toBe(12);
    expect(result.year).toBe(2026);
  });
});

describe("getFirstDayOfMonth", () => {
  it("genera la data del primo giorno del mese", () => {
    expect(getFirstDayOfMonth(1, 2026)).toBe("2026-01-01");
    expect(getFirstDayOfMonth(3, 2026)).toBe("2026-03-01");
    expect(getFirstDayOfMonth(12, 2026)).toBe("2026-12-01");
  });
});

describe("getLastDayOfMonth", () => {
  it("genera la data dell'ultimo giorno del mese", () => {
    expect(getLastDayOfMonth(1, 2026)).toBe("2026-01-31");
    expect(getLastDayOfMonth(3, 2026)).toBe("2026-03-31");
    expect(getLastDayOfMonth(4, 2026)).toBe("2026-04-30");
  });

  it("gestisce febbraio (anno non bisestile)", () => {
    expect(getLastDayOfMonth(2, 2026)).toBe("2026-02-28");
  });

  it("gestisce febbraio bisestile", () => {
    expect(getLastDayOfMonth(2, 2028)).toBe("2028-02-29");
  });
});
