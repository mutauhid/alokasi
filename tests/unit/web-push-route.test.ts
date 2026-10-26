import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/modules/web-push/scheduled", () => ({
  runScheduledWebPush: vi.fn().mockResolvedValue({ queued: 0, sent: 0 }),
}));

describe("Web Push cron boundary", () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it("rejects requests when the cron secret is absent", async () => {
    delete process.env.CRON_SECRET;
    const { GET } =
      await import("../../src/app/api/cron/web-push-notifications/route");
    expect(
      (await GET(new Request("https://example.test/api/cron"))).status,
    ).toBe(503);
  });

  it("rejects an invalid bearer secret", async () => {
    process.env.CRON_SECRET = "secret-for-test";
    const { GET } =
      await import("../../src/app/api/cron/web-push-notifications/route");
    expect(
      (
        await GET(
          new Request("https://example.test/api/cron", {
            headers: { authorization: "Bearer wrong" },
          }),
        )
      ).status,
    ).toBe(401);
  });
});
