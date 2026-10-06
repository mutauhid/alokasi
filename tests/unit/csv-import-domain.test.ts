import { describe, expect, it } from "vitest";
import {
  CsvImportParseError,
  hasDistinctCsvMapping,
  importDuplicateKey,
  mapCsvImportRows,
  parseCsvDocument,
  type CsvPreviewPayload,
} from "../../src/modules/imports/domain";

const accountId = "11111111-1111-4111-8111-111111111111";
const incomeCategoryId = "22222222-2222-4222-8222-222222222222";
const expenseCategoryId = "33333333-3333-4333-8333-333333333333";

describe("CSV import domain", () => {
  it("parses semicolon CSV, quoted delimiters, and escaped quotes", () => {
    const result = parseCsvDocument(
      '\uFEFFTanggal;Deskripsi;Nominal\r\n01/10/2026;"Makan; siang";-25.000\r\n02/10/2026;"Bonus ""Q3""";100000\r\n',
    );

    expect(result.delimiter).toBe(";");
    expect(result.headers).toEqual(["Tanggal", "Deskripsi", "Nominal"]);
    expect(result.rows).toEqual([
      ["01/10/2026", "Makan; siang", "-25.000"],
      ["02/10/2026", 'Bonus "Q3"', "100000"],
    ]);
  });

  it("maps signed IDR amounts and reports invalid rows without losing valid rows", () => {
    const payload: CsvPreviewPayload = {
      fileName: "mutasi.csv",
      accountId,
      incomeCategoryId,
      expenseCategoryId,
      rows: [
        ["01/10/2026", "Makan siang", "-25.000", "kantor"],
        ["2026-10-02", "Bonus", "Rp 1.500.000,00", ""],
        ["31/02/2026", "Tanggal salah", "1000", ""],
      ],
      mapping: {
        amountMode: "signed",
        dateColumn: 0,
        titleColumn: 1,
        amountColumn: 2,
        noteColumn: 3,
        positiveType: "income",
      },
    };

    expect(hasDistinctCsvMapping(payload)).toBe(true);
    const result = mapCsvImportRows(payload);
    expect(result.candidates).toMatchObject([
      {
        rowNumber: 2,
        type: "expense",
        title: "Makan siang",
        amount: 25_000n,
        categoryId: expenseCategoryId,
        note: "kantor",
      },
      {
        rowNumber: 3,
        type: "income",
        title: "Bonus",
        amount: 1_500_000n,
        categoryId: incomeCategoryId,
        note: null,
      },
    ]);
    expect(result.issues).toEqual([
      { rowNumber: 4, message: "tanggal tidak dikenali" },
    ]);
  });

  it("maps separate income and expense columns and rejects ambiguous rows", () => {
    const result = mapCsvImportRows({
      fileName: "bank.csv",
      accountId,
      incomeCategoryId,
      expenseCategoryId,
      rows: [
        ["2026-10-01", "Gaji", "5000000", ""],
        ["2026-10-02", "Belanja", "", "250000"],
        ["2026-10-03", "Ambigu", "100", "200"],
      ],
      mapping: {
        amountMode: "separate",
        dateColumn: 0,
        titleColumn: 1,
        noteColumn: -1,
        incomeColumn: 2,
        expenseColumn: 3,
      },
    });

    expect(result.candidates.map((row) => row.type)).toEqual([
      "income",
      "expense",
    ]);
    expect(result.issues[0]).toMatchObject({
      rowNumber: 4,
      message: "nominal tidak valid",
    });
  });

  it("normalizes titles in duplicate fingerprints", () => {
    const base = {
      type: "expense" as const,
      amount: 25_000n,
      transactionDate: new Date("2026-10-01T00:00:00.000Z"),
    };
    expect(importDuplicateKey({ ...base, title: " Makan   Siang " })).toBe(
      importDuplicateKey({ ...base, title: "makan siang" }),
    );
  });

  it("rejects files over the row limit", () => {
    const csv = ["date,title,amount"]
      .concat(Array.from({ length: 301 }, () => "2026-10-01,A,1"))
      .join("\n");
    try {
      parseCsvDocument(csv);
      throw new Error("Expected CSV row limit error");
    } catch (error) {
      expect(error).toBeInstanceOf(CsvImportParseError);
      expect(error).toMatchObject({ code: "CSV_TOO_MANY_ROWS" });
    }
  });
});
