import { describe, expect, it } from "vitest";
import { suggestTelegramExpenseCategory } from "../../src/modules/telegram-integration/category-suggestion";

const categories = [
  { id: "food", name: "Makan & minum" },
  { id: "transport", name: "Transportasi" },
  { id: "bills", name: "Tagihan" },
  { id: "shopping", name: "Belanja" },
  { id: "health", name: "Kesehatan" },
];

describe("Telegram expense category suggestion", () => {
  it("prefers the longest personal rule over history and built-in keywords", () => {
    expect(
      suggestTelegramExpenseCategory({
        title: "beli kopi susu sebelum kerja",
        categories,
        personalRules: [
          { keywordKey: "kopi", categoryId: "food" },
          { keywordKey: "kopi susu", categoryId: "shopping" },
        ],
        history: [
          {
            title: "beli kopi susu sebelum kerja",
            categoryId: "bills",
            transactionDate: new Date("2026-10-18T00:00:00.000Z"),
          },
        ],
        defaultCategoryId: "transport",
      }),
    ).toEqual({ categoryId: "shopping", source: "personal-rule" });
  });

  it("prefers confirmed history for the same normalized title", () => {
    expect(
      suggestTelegramExpenseCategory({
        title: "  BELI   BENSIN motor ",
        categories,
        history: [
          {
            title: "beli bensin motor",
            categoryId: "shopping",
            transactionDate: new Date("2026-10-18T00:00:00.000Z"),
          },
        ],
        defaultCategoryId: "food",
      }),
    ).toEqual({ categoryId: "shopping", source: "history" });
  });

  it("maps common expense keywords to an active workspace category", () => {
    expect(
      suggestTelegramExpenseCategory({
        title: "isi bensin motor",
        categories,
        history: [],
        defaultCategoryId: "food",
      }),
    ).toEqual({ categoryId: "transport", source: "keyword" });
    expect(
      suggestTelegramExpenseCategory({
        title: "belanja bensin motor",
        categories,
        history: [],
        defaultCategoryId: "food",
      }),
    ).toEqual({ categoryId: "transport", source: "keyword" });
    expect(
      suggestTelegramExpenseCategory({
        title: "bayar listrik PLN",
        categories,
        history: [],
        defaultCategoryId: "food",
      }),
    ).toEqual({ categoryId: "bills", source: "keyword" });
  });

  it("recognizes an active category name written in the title", () => {
    const result = suggestTelegramExpenseCategory({
      title: "kebutuhan hewan peliharaan",
      categories: [...categories, { id: "pets", name: "Hewan peliharaan" }],
      history: [],
      defaultCategoryId: "food",
    });
    expect(result).toEqual({ categoryId: "pets", source: "category-name" });
  });

  it("keeps the default when matches are ambiguous or unavailable", () => {
    expect(
      suggestTelegramExpenseCategory({
        title: "makan sambil isi bensin",
        categories,
        history: [],
        defaultCategoryId: "shopping",
      }),
    ).toEqual({ categoryId: "shopping", source: "default" });
    expect(
      suggestTelegramExpenseCategory({
        title: "isi bensin motor",
        categories: categories.filter((item) => item.id !== "transport"),
        history: [],
        defaultCategoryId: "food",
      }),
    ).toEqual({ categoryId: "food", source: "default" });
  });
});
