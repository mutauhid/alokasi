import { afterEach, describe, expect, it, vi } from "vitest";
import { inspectRuntimeEnvironment } from "../../src/server/config/environment";
import { reportServerFailure } from "../../src/server/observability/logger";

afterEach(() => vi.restoreAllMocks());

const validEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  SUPABASE_SECRET_KEY: "sb_secret_example",
  DATABASE_URL:
    "postgresql://alokasi_runtime:encoded-password@db.example.test/postgres",
  APP_URL: "https://staging.alokasi.example",
};

describe("staging runtime environment", () => {
  it("accepts a complete HTTPS deployment configuration", () => {
    expect(inspectRuntimeEnvironment(validEnvironment)).toEqual({
      ready: true,
      missing: [],
      invalid: [],
    });
  });

  it("reports names only for missing or invalid configuration", () => {
    const result = inspectRuntimeEnvironment({
      ...validEnvironment,
      NEXT_PUBLIC_SUPABASE_URL: "http://remote.example.test/path",
      DATABASE_URL: "https://secret@example.test",
      APP_URL: "https://staging.alokasi.example/callback",
      SUPABASE_SECRET_KEY: "",
    });
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual(["SUPABASE_SECRET_KEY"]);
    expect(result.invalid).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "APP_URL",
      "DATABASE_URL",
    ]);
    expect(JSON.stringify(result)).not.toContain("encoded-password");
  });

  it("allows HTTP only for a loopback development origin", () => {
    const result = inspectRuntimeEnvironment({
      ...validEnvironment,
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      DATABASE_URL: "postgresql://localhost/alokasi",
      APP_URL: "http://localhost:3000",
    });
    expect(result.ready).toBe(true);
  });
});

describe("server logging boundary", () => {
  it("logs structured diagnostics without messages or sensitive context", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const error = Object.assign(new Error("password=very-secret"), {
      code: "P1001",
    });

    reportServerFailure("health.database_unavailable", error, {
      workspaceId: "workspace-safe-id",
      email: "user@example.test",
      token: "secret-token",
    });

    const output = String(consoleError.mock.calls[0]?.[0]);
    expect(output).toContain('"event":"health.database_unavailable"');
    expect(output).toContain('"code":"P1001"');
    expect(output).toContain("workspace-safe-id");
    expect(output).not.toContain("very-secret");
    expect(output).not.toContain("user@example.test");
    expect(output).not.toContain("secret-token");
  });
});
