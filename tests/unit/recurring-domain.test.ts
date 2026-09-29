import { describe, expect, it } from "vitest";
import {
  createRecurringTemplateInput,
  nextMonthlyOccurrence,
  occurrenceOnOrAfter,
} from "@/modules/recurring/domain";

describe("recurring transaction domain", () => {
  it("normalizes a monthly template and preserves integer rupiah", () => {
    const parsed = createRecurringTemplateInput.parse({
      name: "  Sewa   rumah ",
      type: "expense",
      amount: "2500000",
      accountId: "11111111-1111-4111-8111-111111111111",
      categoryId: "22222222-2222-4222-8222-222222222222",
      note: "  Transfer bulanan  ",
      recurrenceDay: "25",
    });
    expect(parsed).toMatchObject({
      name: "Sewa rumah",
      amount: 2_500_000n,
      note: "Transfer bulanan",
      recurrenceDay: 25,
    });
  });

  it("rejects transfer, decimal amounts, and days outside a month", () => {
    const base = {
      name: "Tagihan",
      type: "expense",
      amount: "100000",
      accountId: "11111111-1111-4111-8111-111111111111",
      categoryId: "22222222-2222-4222-8222-222222222222",
      note: "",
      recurrenceDay: "1",
    };
    expect(
      createRecurringTemplateInput.safeParse({ ...base, type: "transfer" })
        .success,
    ).toBe(false);
    expect(
      createRecurringTemplateInput.safeParse({ ...base, amount: "1.5" })
        .success,
    ).toBe(false);
    expect(
      createRecurringTemplateInput.safeParse({ ...base, recurrenceDay: "32" })
        .success,
    ).toBe(false);
  });

  it("clamps day 31 without drifting after February", () => {
    const january = new Date("2027-01-31T00:00:00.000Z");
    const february = nextMonthlyOccurrence(january, 31);
    const march = nextMonthlyOccurrence(february, 31);
    expect(february.toISOString().slice(0, 10)).toBe("2027-02-28");
    expect(march.toISOString().slice(0, 10)).toBe("2027-03-31");
  });

  it("chooses this month or next month from the current date", () => {
    expect(
      occurrenceOnOrAfter(new Date("2026-09-20T00:00:00.000Z"), 25)
        .toISOString()
        .slice(0, 10),
    ).toBe("2026-09-25");
    expect(
      occurrenceOnOrAfter(new Date("2026-09-26T00:00:00.000Z"), 25)
        .toISOString()
        .slice(0, 10),
    ).toBe("2026-10-25");
  });
});
