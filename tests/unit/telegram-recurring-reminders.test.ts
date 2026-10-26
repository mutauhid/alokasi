import { describe, expect, it } from "vitest";
import {
  localCalendarDate,
  recurringReminderMessage,
} from "../../src/modules/telegram-integration/recurring-reminder-domain";

describe("Telegram recurring reminders", () => {
  it("derives the workspace calendar date instead of the server date", () => {
    expect(
      localCalendarDate(new Date("2026-10-25T18:00:00.000Z"), "Asia/Jakarta"),
    ).toEqual(new Date("2026-10-26T00:00:00.000Z"));
  });

  it("states that a due reminder has not changed the balance", () => {
    const message = recurringReminderMessage({
      workspaceName: "Ruang pribadi",
      name: "Internet rumah",
      type: "expense",
      amount: 450_000n,
      dueDate: new Date("2026-10-26T00:00:00.000Z"),
      accountName: "Mandiri",
      categoryName: "Tagihan",
    });
    expect(message).toContain("Nominal: Rp450.000");
    expect(message).toContain("Belum dicatat ke saldo");
  });
});
