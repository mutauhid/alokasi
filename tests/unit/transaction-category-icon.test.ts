import { describe, expect, it } from "vitest";
import {
  ArrowLeftRight,
  BriefcaseBusiness,
  CarFront,
  HeartPulse,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  Tag,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { categoryIconDetails } from "../../src/components/transaction-category-icon";

describe("ikon kategori transaksi", () => {
  it("membedakan kategori bawaan pada riwayat transaksi dan laporan", () => {
    expect(categoryIconDetails("Makan & minum", "expense").icon).toBe(
      UtensilsCrossed,
    );
    expect(categoryIconDetails("Belanja", "expense").icon).toBe(ShoppingBag);
    expect(categoryIconDetails("Transportasi", "expense").icon).toBe(CarFront);
    expect(categoryIconDetails("Tagihan", "expense").icon).toBe(ReceiptText);
    expect(categoryIconDetails("Kesehatan", "expense").icon).toBe(HeartPulse);
    expect(categoryIconDetails("Gaji", "income").icon).toBe(BriefcaseBusiness);
    expect(categoryIconDetails("Pendapatan lain", "income").icon).toBe(Wallet);
    expect(categoryIconDetails("Refund", "income").icon).toBe(RotateCcw);
  });

  it("memakai ikon umum untuk nama kustom yang belum dikenali dan ikon transfer khusus", () => {
    expect(categoryIconDetails("Hobi lain", "expense").icon).toBe(Tag);
    expect(categoryIconDetails(null, "expense").label).toBe("Tanpa kategori");
    expect(categoryIconDetails(null, "transfer").icon).toBe(ArrowLeftRight);
  });
});
