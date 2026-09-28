import { describe, expect, it } from "vitest";
import { buildCashFlowTrend } from "@/modules/dashboard/domain";

const periods = [
  {
    id: "august",
    startDate: new Date("2026-08-25T00:00:00.000Z"),
    endDateExclusive: new Date("2026-09-25T00:00:00.000Z"),
    isTransition: false,
  },
  {
    id: "september",
    startDate: new Date("2026-09-25T00:00:00.000Z"),
    endDateExclusive: new Date("2026-10-25T00:00:00.000Z"),
    isTransition: false,
  },
];

describe("dashboard cash-flow trend", () => {
  it("uses explicit period boundaries and excludes transfers", () => {
    const result = buildCashFlowTrend(
      periods,
      [
        {
          type: "income",
          amount: 1_000_000n,
          transactionDate: new Date("2026-09-24T00:00:00.000Z"),
        },
        {
          type: "expense",
          amount: 250_000n,
          transactionDate: new Date("2026-09-25T00:00:00.000Z"),
        },
        {
          type: "transfer",
          amount: 500_000n,
          transactionDate: new Date("2026-09-26T00:00:00.000Z"),
        },
      ],
      "september",
    );

    expect(result).toMatchObject([
      { id: "august", income: 1_000_000n, expense: 0n, isActive: false },
      { id: "september", income: 0n, expense: 250_000n, isActive: true },
    ]);
  });

  it("returns empty totals for periods without transactions", () => {
    expect(buildCashFlowTrend(periods, [], "september")).toMatchObject([
      { income: 0n, expense: 0n },
      { income: 0n, expense: 0n },
    ]);
  });
});
