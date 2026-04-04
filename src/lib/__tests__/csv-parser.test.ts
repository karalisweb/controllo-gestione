import { describe, it, expect } from "vitest";
import { parseQontoCSV } from "../csv-parser";

const VALID_HEADER = "Data di valuta (UTC);Controparte;Importo totale (IVA incl.)";

describe("parseQontoCSV", () => {
  it("parsa un CSV valido con header e una riga", () => {
    const csv = `${VALID_HEADER}\n09-03-2026 11:20:30;Mario Rossi SRL;1.500,00`;
    const result = parseQontoCSV(csv);

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);

    const row = result.rows[0];
    expect(row.date).toBe("2026-03-09");
    expect(row.counterparty).toBe("Mario Rossi SRL");
    expect(row.amount).toBe(150000); // 1.500,00 EUR = 150.000 centesimi
    expect(row.isTransfer).toBe(false);
  });

  it("parsa importi negativi (uscite)", () => {
    const csv = `${VALID_HEADER}\n09-03-2026 11:20:30;Fornitore ABC;-188,40`;
    const result = parseQontoCSV(csv);

    expect(result.rows[0].amount).toBe(-18840);
  });

  it("identifica trasferimenti interni", () => {
    const csv = `${VALID_HEADER}\n09-03-2026 11:20:30;Conto Principale;500,00`;
    const result = parseQontoCSV(csv);

    expect(result.rows[0].isTransfer).toBe(true);
  });

  it("identifica trasferimento conto IVA", () => {
    const csv = `${VALID_HEADER}\n09-03-2026 11:20:30;Conto IVA e Risparmio;-200,00`;
    const result = parseQontoCSV(csv);

    expect(result.rows[0].isTransfer).toBe(true);
  });

  it("identifica trasferimento Karalisweb", () => {
    const csv = `${VALID_HEADER}\n09-03-2026 11:20:30;Karalisweb di Daniela Spiggia;-300,00`;
    const result = parseQontoCSV(csv);

    expect(result.rows[0].isTransfer).toBe(true);
  });

  it("genera externalId univoco", () => {
    const csv = [
      VALID_HEADER,
      "09-03-2026 11:20:30;Mario Rossi;100,00",
      "09-03-2026 14:30:00;Mario Rossi;100,00",
    ].join("\n");

    const result = parseQontoCSV(csv);

    expect(result.rows).toHaveLength(2);
    // Stesso importo, stessa controparte, stesso giorno ma orario diverso → ID diversi
    expect(result.rows[0].externalId).not.toBe(result.rows[1].externalId);
  });

  it("gestisce CSV con \\r\\n (Windows)", () => {
    const csv = `${VALID_HEADER}\r\n09-03-2026 11:20:30;Test;100,00\r\n`;
    const result = parseQontoCSV(csv);

    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it("restituisce errore per CSV vuoto", () => {
    const result = parseQontoCSV("");
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toContain("File CSV vuoto");
  });

  it("restituisce errore per header non valido", () => {
    const csv = "Colonna1;Colonna2;Colonna3\n1;2;3";
    const result = parseQontoCSV(csv);

    expect(result.rows).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Header CSV non riconosciuto");
  });

  it("segnala righe con formato non valido", () => {
    const csv = `${VALID_HEADER}\nriga-invalida`;
    const result = parseQontoCSV(csv);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Riga 2");
  });

  it("parsa CSV con più righe miste", () => {
    const csv = [
      VALID_HEADER,
      "01-03-2026 09:00:00;Cliente A;2.000,00",
      "05-03-2026 10:30:00;Fornitore B;-500,50",
      "10-03-2026 15:00:00;Conto Principale;-1.000,00",
    ].join("\n");

    const result = parseQontoCSV(csv);

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(3);

    // Verifica ordine e valori
    expect(result.rows[0].date).toBe("2026-03-01");
    expect(result.rows[0].amount).toBe(200000);
    expect(result.rows[0].isTransfer).toBe(false);

    expect(result.rows[1].date).toBe("2026-03-05");
    expect(result.rows[1].amount).toBe(-50050);
    expect(result.rows[1].isTransfer).toBe(false);

    expect(result.rows[2].date).toBe("2026-03-10");
    expect(result.rows[2].amount).toBe(-100000);
    expect(result.rows[2].isTransfer).toBe(true);
  });

  it("converte correttamente le date dal formato Qonto", () => {
    const csv = `${VALID_HEADER}\n25-12-2026 08:00:00;Test;10,00`;
    const result = parseQontoCSV(csv);

    expect(result.rows[0].date).toBe("2026-12-25");
    expect(result.rows[0].rawDate).toBe("25-12-2026 08:00:00");
  });

  it("ignora righe vuote nel CSV", () => {
    const csv = `${VALID_HEADER}\n\n09-03-2026 11:20:30;Test;100,00\n\n`;
    const result = parseQontoCSV(csv);

    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });
});
