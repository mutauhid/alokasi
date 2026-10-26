import { describe, expect, it } from "vitest";
import {
  isQuietTime,
  nextAllowedPushTime,
  parseClockMinutes,
  privacySafeContent,
  safeLocalNotificationUrl,
} from "../../src/modules/web-push/domain";

describe("Web Push domain", () => {
  it("parses clock values and handles quiet hours across midnight", () => {
    expect(parseClockMinutes("22:00")).toBe(1320);
    expect(parseClockMinutes("07:00")).toBe(420);
    expect(parseClockMinutes("25:00")).toBeNull();
    expect(
      isQuietTime(
        new Date("2026-10-26T16:00:00.000Z"),
        "Asia/Jakarta",
        1320,
        420,
      ),
    ).toBe(true);
    expect(
      nextAllowedPushTime(
        new Date("2026-10-26T16:00:30.000Z"),
        "Asia/Jakarta",
        1320,
        420,
      ).toISOString(),
    ).toBe("2026-10-27T00:00:00.000Z");
  });

  it("removes financial detail when lock-screen privacy is enabled", () => {
    expect(
      privacySafeContent({
        hideSensitiveContent: true,
        title: "Saldo Mandiri menipis",
        body: "Saldo Rp100.000",
      }),
    ).toEqual({
      title: "Pembaruan Alokasi",
      body: "Ada informasi keuangan baru. Buka Alokasi untuk melihat detail.",
    });
  });

  it("allows only local notification targets", () => {
    expect(safeLocalNotificationUrl("/budgets?workspaceId=abc")).toBe(
      "/budgets?workspaceId=abc",
    );
    expect(safeLocalNotificationUrl("https://attacker.test")).toBe(
      "/dashboard",
    );
    expect(safeLocalNotificationUrl("//attacker.test")).toBe("/dashboard");
  });
});
