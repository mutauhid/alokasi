import { describe, expect, it } from "vitest";
import {
  buildTransactionSuggestions,
  transactionTitleKey,
} from "../../src/modules/transactions/suggestions";

describe("transaction suggestions", () => {
  it("normalizes titles and ranks frequent combinations before recent ones", () => {
    const activeCategory = { name: "Makan", archivedAt: null };
    const suggestions = buildTransactionSuggestions([
      {
        title: "Makan   Siang",
        type: "expense",
        categoryId: "food",
        category: activeCategory,
        transactionDate: new Date("2026-09-01T00:00:00.000Z"),
      },
      {
        title: "makan siang",
        type: "expense",
        categoryId: "food",
        category: activeCategory,
        transactionDate: new Date("2026-09-20T00:00:00.000Z"),
      },
      {
        title: "Kopi",
        type: "expense",
        categoryId: "food",
        category: activeCategory,
        transactionDate: new Date("2026-09-29T00:00:00.000Z"),
      },
    ]);

    expect(transactionTitleKey("  MAKAN   Siang ")).toBe("makan siang");
    expect(suggestions).toEqual([
      expect.objectContaining({
        title: "makan siang",
        categoryId: "food",
        categoryName: "Makan",
        usageCount: 2,
      }),
      expect.objectContaining({ title: "Kopi", usageCount: 1 }),
    ]);
  });

  it("excludes archived categories and keeps transfer suggestions title-only", () => {
    const suggestions = buildTransactionSuggestions([
      {
        title: "Belanja lama",
        type: "expense",
        categoryId: "archived",
        category: { name: "Arsip", archivedAt: new Date() },
        transactionDate: new Date("2026-09-29T00:00:00.000Z"),
      },
      {
        title: "Pindah ke tabungan",
        type: "transfer",
        categoryId: null,
        category: null,
        transactionDate: new Date("2026-09-29T00:00:00.000Z"),
      },
    ]);

    expect(suggestions).toEqual([
      expect.objectContaining({
        title: "Pindah ke tabungan",
        type: "transfer",
        categoryId: null,
        categoryName: null,
      }),
    ]);
  });
});
