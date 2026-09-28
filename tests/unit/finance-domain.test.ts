import { describe, expect, it } from "vitest";
import {
  budgetPercent,
  budgetStatus,
  copyBudgetsInput,
  createBudgetInput,
} from "@/modules/finance/domain";

describe("budget domain", () => {
  it.each([
    [800_000n, 1_000_000n, 80n, "Hampir habis"],
    [1_000_000n, 1_000_000n, 100n, "Habis"],
    [1_100_000n, 1_000_000n, 110n, "Terlampaui"],
  ])(
    "classifies %s of %s",
    (actual, limit, expectedPercent, expectedStatus) => {
      expect(budgetPercent(actual, limit)).toBe(expectedPercent);
      expect(budgetStatus(actual, limit)).toBe(expectedStatus);
    },
  );

  it("rejects zero, negative, decimal, and oversized limits", () => {
    const categoryId = "987c445c-9f1c-4d06-8ee5-1a763cc9ee42";
    for (const limitAmount of ["0", "-1", "1.5", "9223372036854775808"]) {
      expect(
        createBudgetInput.safeParse({ categoryId, limitAmount }).success,
      ).toBe(false);
    }
  });

  it("accepts an integer rupiah limit", () => {
    const parsed = createBudgetInput.parse({
      categoryId: "987c445c-9f1c-4d06-8ee5-1a763cc9ee42",
      limitAmount: "1500000",
    });
    expect(parsed.limitAmount).toBe(1_500_000n);
  });

  it("requires unique categories when copying a budget preview", () => {
    const periodId = "f6fc854c-ed59-416d-ac26-f723de7f1324";
    const categoryId = "987c445c-9f1c-4d06-8ee5-1a763cc9ee42";
    expect(
      copyBudgetsInput.safeParse({
        sourcePeriodId: periodId,
        targetPeriodId: "645ee407-c66c-493e-8e63-a6cbb352755f",
        categoryIds: [categoryId, categoryId],
      }).success,
    ).toBe(false);
  });
});
