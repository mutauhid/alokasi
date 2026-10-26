import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/modules/telegram-integration/weekly-summary", () => ({
  runTelegramWeeklySummaries: vi.fn(),
}));

describe("Telegram weekly summary cron boundary", () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it("rejects requests when the cron secret is not configured", async () => {
    delete process.env.CRON_SECRET;
    const { GET } =
      await import("../../src/app/api/cron/telegram-weekly-summary/route");
    expect(
      (await GET(new Request("https://example.test/api/cron"))).status,
    ).toBe(503);
  });

  it("rejects an invalid bearer secret", async () => {
    process.env.CRON_SECRET = "secret-for-test";
    const { GET } =
      await import("../../src/app/api/cron/telegram-weekly-summary/route");
    expect(
      (
        await GET(
          new Request("https://example.test/api/cron", {
            headers: { authorization: "Bearer wrong-secret" },
          }),
        )
      ).status,
    ).toBe(401);
  });
});
