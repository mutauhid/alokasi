import { describe, expect, it } from "vitest";
import {
  PotentialDuplicateTransactionError,
  duplicateWarning,
} from "../../src/modules/transactions/duplicates";

const candidate = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Beli kopi",
  amount: 25_000n,
  transactionDate: new Date("2026-10-26T00:00:00.000Z"),
  createdAt: new Date("2026-10-26T03:00:00.000Z"),
  accountName: "Mandiri",
};

const input = {
  type: "expense" as const,
  title: "Beli kopi",
  amount: 25_000n,
  transactionDate: new Date("2026-10-26T00:00:00.000Z"),
  accountId: "22222222-2222-4222-8222-222222222222",
  destinationAccountId: null,
  categoryId: "33333333-3333-4333-8333-333333333333",
  idempotencyKey: "request-1",
};

describe("potential duplicate transaction", () => {
  it("binds the confirmation to financial fields, not title casing", () => {
    const first = new PotentialDuplicateTransactionError(candidate, input);
    const same = new PotentialDuplicateTransactionError(candidate, {
      ...input,
      title: "beli kopi",
    });
    const changed = new PotentialDuplicateTransactionError(candidate, {
      ...input,
      amount: 30_000n,
    });

    expect(first.confirmation).toMatch(/^[0-9a-f]{16}$/u);
    expect(same.confirmation).toBe(first.confirmation);
    expect(changed.confirmation).not.toBe(first.confirmation);
  });

  it("serializes bigint and dates for Server Action state", () => {
    expect(
      duplicateWarning(
        new PotentialDuplicateTransactionError(candidate, input),
      ),
    ).toMatchObject({
      title: "Beli kopi",
      amount: "25000",
      transactionDate: "2026-10-26",
      createdAt: "2026-10-26T03:00:00.000Z",
      accountName: "Mandiri",
    });
  });
});
