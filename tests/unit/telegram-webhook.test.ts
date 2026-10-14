import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../src/app/api/integrations/telegram/webhook/route";

vi.mock("server-only", () => ({}));

const originalToken = process.env.TELEGRAM_BOT_TOKEN;
const originalSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

beforeEach(() => {
  process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";
  process.env.TELEGRAM_WEBHOOK_SECRET = "test-webhook-secret";
});

afterEach(() => {
  if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
  else process.env.TELEGRAM_BOT_TOKEN = originalToken;
  if (originalSecret === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET;
  else process.env.TELEGRAM_WEBHOOK_SECRET = originalSecret;
});

describe("Telegram webhook boundary", () => {
  it("rejects requests without the configured secret", async () => {
    const response = await POST(
      new Request("https://example.invalid/api/integrations/telegram/webhook", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects oversized bodies before parsing updates", async () => {
    const response = await POST(
      new Request("https://example.invalid/api/integrations/telegram/webhook", {
        method: "POST",
        headers: { "x-telegram-bot-api-secret-token": "test-webhook-secret" },
        body: "x".repeat(32769),
      }),
    );
    expect(response.status).toBe(413);
  });
});
