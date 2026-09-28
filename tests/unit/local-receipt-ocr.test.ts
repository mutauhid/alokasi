import { describe, expect, it } from "vitest";
import { parseLocalReceiptOcr } from "@/modules/receipts/local-ocr";

describe("local receipt OCR parser", () => {
  it("prioritizes transfer total and detects the source bank application", () => {
    const result = parseLocalReceiptOcr(
      `
      livin' by mandiri
      Transfer Berhasil!
      25 Sep 2026 · 23:37:46 WIB
      Penerima
      MUHAMMAD TAUFIK HIDAYAT
      Bank Central Asia · 6282762413
      Detail Transaksi
      Nominal Transfer Rp 500.000
      Metode Transfer BI Fast
      Biaya Transaksi Rp 2.500
      Total Transaksi Rp 502.500
      Rekening Sumber
      Bank Mandiri
      `,
      88,
    );
    expect(result).toMatchObject({
      amount: "502500",
      transactionDate: "2026-09-25",
      merchant: "MUHAMMAD TAUFIK HIDAYAT",
      institution: "Bank Mandiri",
      evidenceKind: "transfer",
      paymentRail: "BI-FAST",
    });
    expect(result.confidence.amount).toBeGreaterThanOrEqual(85);
  });

  it("detects QRIS and its wallet or bank brand", () => {
    const result = parseLocalReceiptOcr(
      `
      BCA mobile
      Pembayaran QRIS Berhasil
      Nama Merchant: KOPI PAGI
      Total Bayar Rp 47.500
      25/09/2026 08:32
      `,
      82,
    );
    expect(result).toMatchObject({
      amount: "47500",
      transactionDate: "2026-09-25",
      merchant: "KOPI PAGI",
      institution: "BCA",
      evidenceKind: "qris",
      paymentRail: "QRIS",
    });
  });

  it("parses BCA decimal formatting and does not confuse pemindahan dana with DANA", () => {
    const result = parseLocalReceiptOcr(
      `
      BCA
      Transfer Berhasil
      26 Sep 2026
      IDR 25,000.00
      Nama Penerima
      MUHAMMAD TAUFIK HIDAYAT
      Bank Tujuan BANK MANDIRI
      Nominal IDR 25,000.00
      Biaya IDR 2,500.00
      Layanan Transfer BI FAST
      Tujuan Transaksi Pemindahan Dana
      Jenis Transaksi Transfer ke Bank Mandiri
      `,
      86,
    );
    expect(result).toMatchObject({
      amount: "25000",
      transactionDate: "2026-09-26",
      merchant: "MUHAMMAD TAUFIK HIDAYAT",
      institution: "BCA",
      evidenceKind: "transfer",
      paymentRail: "BI-FAST",
    });
    expect(result.note).toContain("BCA");
    expect(result.note).not.toContain("DANA");
  });

  it.each([
    ["Total Bayar Rp 25.000", "25000"],
    ["Total Bayar Rp 25,000", "25000"],
    ["Total Bayar IDR 25,000.00", "25000"],
    ["Total Bayar IDR 25.000,00", "25000"],
  ])("normalizes rupiah format in %s", (line, expected) => {
    expect(parseLocalReceiptOcr(line, 90).amount).toBe(expected);
  });

  it("still recognizes DANA when it appears as a standalone wallet brand", () => {
    const result = parseLocalReceiptOcr(
      "DANA\nPembayaran QRIS\nTotal Bayar Rp 25.000",
      85,
    );
    expect(result).toMatchObject({
      amount: "25000",
      institution: "DANA",
      evidenceKind: "qris",
    });
  });

  it("uses BCA issuer identity when Mandiri destination is split across lines", () => {
    const result = parseLocalReceiptOcr(
      `
      Transfer Berhasil
      IDR 25,000.00
      Nama Penerima
      TAUFIK HIDA
      Bank Tujuan
      BANK MANDIRI
      Nominal
      IDR 25,000.00
      Layanan Transfer
      BI FAST
      Jenis Transaksi
      Transfer ke BANK MANDIRI
      PT BANK CENTRAL ASIA TBK
      BCA
      `,
      74,
    );
    expect(result).toMatchObject({
      amount: "25000",
      institution: "BCA",
      evidenceKind: "transfer",
      paymentRail: "BI-FAST",
    });
  });

  it("leaves missing financial fields empty instead of inventing values", () => {
    const result = parseLocalReceiptOcr("gambar tidak terbaca", 14);
    expect(result.amount).toBe("");
    expect(result.transactionDate).toBe("");
    expect(result.merchant).toBe("");
    expect(result.institution).toBe("");
    expect(result.evidenceKind).toBe("unknown");
  });
});
