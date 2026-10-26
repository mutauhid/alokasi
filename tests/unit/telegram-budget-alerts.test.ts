import { describe, expect, it } from "vitest";
import {
  budgetAlertMessage,
  budgetAlertThreshold,
} from "../../src/modules/telegram-integration/budget-alert-domain";

describe("Telegram budget alerts", () => {
  it("does not alert below 80 percent", () => {
    expect(budgetAlertThreshold(799_999n, 1_000_000n)).toBeNull();
  });

  it("selects the highest crossed threshold with integer arithmetic", () => {
    expect(budgetAlertThreshold(800_000n, 1_000_000n)).toBe(80);
    expect(budgetAlertThreshold(999_999n, 1_000_000n)).toBe(80);
    expect(budgetAlertThreshold(1_000_000n, 1_000_000n)).toBe(100);
    expect(budgetAlertThreshold(1_250_000n, 1_000_000n)).toBe(100);
  });

  it("formats a useful over-budget message", () => {
    expect(
      budgetAlertMessage({
        categoryName: "Makan & minum",
        threshold: 100,
        actualAmount: 550_000n,
        limitAmount: 500_000n,
        startDate: new Date("2026-10-25T00:00:00.000Z"),
        endDateExclusive: new Date("2026-11-25T00:00:00.000Z"),
      }),
    ).toBe(
      [
        "🚨 Budget Makan & minum sudah mencapai limit.",
        "Terpakai: Rp550.000 dari Rp500.000",
        "Melebihi limit: Rp50.000",
        "Periode: 25 Okt 2026–24 Nov 2026",
      ].join("\n"),
    );
  });
});
