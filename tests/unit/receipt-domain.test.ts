import { describe, expect, it } from "vitest";
import {
  createLocalReceiptDraftInput,
  receiptTransactionNote,
  submitReceiptDraftInput,
} from "@/modules/receipts/domain";
import { simulatedReceiptExtraction } from "@/modules/receipts/fixture-adapter";

const uuid = "987c445c-9f1c-4d06-8ee5-1a763cc9ee42";

describe("receipt draft domain", () => {
  it("parses corrected integer-rupiah fields", () => {
    const result = submitReceiptDraftInput.parse({
      draftId: uuid,
      version: "1",
      amount: "120000",
      transactionDate: "2026-09-24",
      merchant: "  Toko   Baru ",
      note: " kebutuhan ",
      accountId: uuid,
      categoryId: uuid,
    });
    expect(result.amount).toBe(120000n);
    expect(result.merchant).toBe("Toko Baru");
    expect(result.transactionDate.toISOString()).toContain("2026-09-24");
  });

  it.each(["0", "-1", "1.5", "9223372036854775808"])(
    "rejects invalid amount %s",
    (amount) => {
      expect(
        submitReceiptDraftInput.safeParse({
          draftId: uuid,
          version: 1,
          amount,
          transactionDate: "2026-09-24",
          merchant: "",
          note: "",
          accountId: uuid,
          categoryId: uuid,
        }).success,
      ).toBe(false);
    },
  );

  it("builds a bounded transaction note without duplicate text", () => {
    expect(receiptTransactionNote("Toko", "Toko")).toBe("Toko");
    expect(receiptTransactionNote("Toko", "Belanja")).toBe("Toko · Belanja");
    expect(receiptTransactionNote(null, null)).toBeNull();
  });

  it("returns deterministic fixture data without consuming image content", () => {
    const today = new Date("2026-09-25T00:00:00.000Z");
    expect(simulatedReceiptExtraction(today)).toMatchObject({
      sourceKind: "fixture",
      extractedAmount: 125000n,
      extractedTransactionDate: today,
      extractedMerchant: "Toko contoh",
    });
  });

  it("validates normalized local OCR fields without accepting raw text", () => {
    const parsed = createLocalReceiptDraftInput.parse({
      amount: "502500",
      transactionDate: "2026-09-25",
      merchant: "Penerima",
      note: "Transfer via Bank Mandiri",
      institution: "Bank Mandiri",
      evidenceKind: "transfer",
      paymentRail: "BI-FAST",
      ocrConfidence: "88",
      amountConfidence: "92",
      dateConfidence: "84",
      merchantConfidence: "77",
      institutionConfidence: "93",
    });
    expect(parsed.amount).toBe(502500n);
    expect(parsed.institution).toBe("Bank Mandiri");
    expect("rawText" in parsed).toBe(false);
  });
});
