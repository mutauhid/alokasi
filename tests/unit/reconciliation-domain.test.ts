import { describe, expect, it } from "vitest";
import {
  calculateAccountBalances,
  createReconciliationInput,
  reconciliationDifference,
} from "@/modules/finance/domain";

describe("balance reconciliation domain", () => {
  it("accepts signed rupiah balances and normalizes optional notes", () => {
    const parsed = createReconciliationInput.parse({
      accountId: "7a6ee33d-8ab3-41d3-822e-835d3289fedc",
      actualBalance: "-50000",
      reconciliationDate: "2026-10-06",
      resolution: "adjusted",
      note: "  Biaya yang tidak diketahui  ",
      idempotencyKey: "reconcile-1",
    });

    expect(parsed.actualBalance).toBe(-50_000n);
    expect(parsed.note).toBe("Biaya yang tidak diketahui");
  });

  it.each(["9223372036854775808", "-9223372036854775809", "1.5", "Rp 10.000"])(
    "rejects invalid or out-of-range actual balance %s",
    (actualBalance) => {
      expect(
        createReconciliationInput.safeParse({
          accountId: "7a6ee33d-8ab3-41d3-822e-835d3289fedc",
          actualBalance,
          reconciliationDate: "2026-10-06",
          resolution: "matched",
          note: "",
          idempotencyKey: "reconcile-1",
        }).success,
      ).toBe(false);
    },
  );

  it.each([
    { recorded: 1_400_000n, actual: 1_350_000n, expected: -50_000n },
    { recorded: 1_400_000n, actual: 1_450_000n, expected: 50_000n },
    { recorded: 1_400_000n, actual: 1_400_000n, expected: 0n },
  ])(
    "calculates difference $expected from actual $actual minus recorded $recorded",
    ({ recorded, actual, expected }) => {
      expect(reconciliationDifference(recorded, actual)).toBe(expected);
    },
  );

  it("rejects a difference outside BIGINT", () => {
    expect(() =>
      reconciliationDifference(-9223372036854775808n, 9223372036854775807n),
    ).toThrow(RangeError);
  });

  it("applies adjustments to balance without creating cash-flow transactions", () => {
    const balances = calculateAccountBalances(
      [{ id: "bank", openingBalance: 1_000_000n }],
      [
        {
          type: "income",
          amount: 500_000n,
          accountId: "bank",
          destinationAccountId: null,
        },
        {
          type: "expense",
          amount: 100_000n,
          accountId: "bank",
          destinationAccountId: null,
        },
      ],
      [{ accountId: "bank", amount: -50_000n }],
    );

    expect(balances.get("bank")).toBe(1_350_000n);
  });
});
