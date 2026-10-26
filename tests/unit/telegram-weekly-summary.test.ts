import { describe, expect, it } from "vitest";
import {
  previousCompletedWeek,
  weeklySummaryMessage,
} from "../../src/modules/telegram-integration/weekly-summary-domain";

describe("Telegram weekly summary", () => {
  it("uses the previous completed Monday-Sunday week in workspace time", () => {
    expect(
      previousCompletedWeek(
        new Date("2026-10-26T01:00:00.000Z"),
        "Asia/Jakarta",
      ),
    ).toEqual({
      start: new Date("2026-10-19T00:00:00.000Z"),
      endExclusive: new Date("2026-10-26T00:00:00.000Z"),
    });
    expect(
      previousCompletedWeek(
        new Date("2026-10-25T01:00:00.000Z"),
        "Asia/Jakarta",
      ),
    ).toBeNull();
  });

  it("formats totals, net cash flow, and the largest expense category", () => {
    expect(
      weeklySummaryMessage({
        workspaceName: "Ruang keluarga",
        range: {
          start: new Date("2026-10-19T00:00:00.000Z"),
          endExclusive: new Date("2026-10-26T00:00:00.000Z"),
        },
        income: 5_000_000n,
        expense: 1_250_000n,
        transactionCount: 8,
        topCategory: { name: "Belanja", amount: 700_000n },
      }),
    ).toContain("Arus kas bersih: Rp3.750.000");
    expect(
      weeklySummaryMessage({
        workspaceName: "Ruang keluarga",
        range: {
          start: new Date("2026-10-19T00:00:00.000Z"),
          endExclusive: new Date("2026-10-26T00:00:00.000Z"),
        },
        income: 5_000_000n,
        expense: 1_250_000n,
        transactionCount: 8,
        topCategory: { name: "Belanja", amount: 700_000n },
      }),
    ).toContain("Kategori terbesar: Belanja · Rp700.000");
  });
});
