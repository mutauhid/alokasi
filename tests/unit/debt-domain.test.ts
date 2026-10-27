import { describe, expect, it } from "vitest";
import {
  createDebtRecordInput,
  debtBalanceAdjustments,
  debtOutstanding,
  debtReminderPhase,
  debtStatus,
} from "@/modules/debts/domain";

describe("debt domain", () => {
  it("requires an account only for a newly recorded balance movement", () => {
    const base = {
      kind: "debt",
      counterparty: "Budi",
      title: "Pinjaman",
      principalAmount: "250000",
      startDate: "2026-10-20",
      dueDate: "2026-11-20",
      note: "",
      idempotencyKey: "debt-1",
    };
    expect(
      createDebtRecordInput.safeParse({
        ...base,
        origin: "current",
        accountId: "",
      }).success,
    ).toBe(false);
    expect(
      createDebtRecordInput.safeParse({
        ...base,
        origin: "historical",
        accountId: "",
      }).success,
    ).toBe(true);
  });

  it("derives unpaid, partial, overdue, and settled states", () => {
    const today = new Date("2026-10-27T00:00:00.000Z");
    expect(
      debtStatus({
        principalAmount: 100n,
        paidAmount: 0n,
        dueDate: null,
        today,
      }),
    ).toBe("unpaid");
    expect(
      debtStatus({
        principalAmount: 100n,
        paidAmount: 20n,
        dueDate: new Date("2026-11-01T00:00:00.000Z"),
        today,
      }),
    ).toBe("partial");
    expect(
      debtStatus({
        principalAmount: 100n,
        paidAmount: 20n,
        dueDate: new Date("2026-10-26T00:00:00.000Z"),
        today,
      }),
    ).toBe("overdue");
    expect(
      debtStatus({
        principalAmount: 100n,
        paidAmount: 100n,
        dueDate: new Date("2026-10-26T00:00:00.000Z"),
        today,
      }),
    ).toBe("settled");
    expect(debtOutstanding(100n, 20n)).toBe(80n);
  });

  it("applies signed balance movements without turning them into cash flow", () => {
    expect(
      debtBalanceAdjustments(
        [
          {
            kind: "debt",
            origin: "current",
            principalAmount: 100_000n,
            accountId: "mandiri",
          },
          {
            kind: "receivable",
            origin: "current",
            principalAmount: 40_000n,
            accountId: "bca",
          },
          {
            kind: "debt",
            origin: "historical",
            principalAmount: 500_000n,
            accountId: null,
          },
        ],
        [
          { kind: "debt", amount: 25_000n, accountId: "mandiri" },
          { kind: "receivable", amount: 10_000n, accountId: "bca" },
        ],
      ),
    ).toEqual([
      { accountId: "mandiri", amount: 100_000n },
      { accountId: "bca", amount: -40_000n },
      { accountId: "mandiri", amount: -25_000n },
      { accountId: "bca", amount: 10_000n },
    ]);
  });

  it("reminds only on D-3 and the due date while an amount remains", () => {
    const today = new Date("2026-10-27T00:00:00.000Z");
    expect(
      debtReminderPhase(new Date("2026-10-30T00:00:00.000Z"), today, 100n),
    ).toBe("d-3");
    expect(
      debtReminderPhase(new Date("2026-10-27T00:00:00.000Z"), today, 100n),
    ).toBe("due");
    expect(
      debtReminderPhase(new Date("2026-10-30T00:00:00.000Z"), today, 0n),
    ).toBeNull();
    expect(
      debtReminderPhase(new Date("2026-10-29T00:00:00.000Z"), today, 100n),
    ).toBeNull();
  });
});
