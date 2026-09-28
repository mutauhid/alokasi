import { afterEach, describe, expect, it, vi } from "vitest";
import {
  databaseConnectionUrl,
  databasePoolSize,
} from "../../src/server/db/connection";
import { signUpErrorKey } from "../../src/server/auth/errors";
import {
  calculateAccountBalances,
  categoryNameKey,
  createAccountInput,
  createCategoryInput,
  createTransactionInput,
} from "../../src/modules/finance/domain";
import {
  forgotPasswordSchema,
  hasValidOrigin,
  safeNextPath,
  signInSchema,
  signUpSchema,
} from "../../src/server/auth/validation";

afterEach(() => vi.unstubAllEnvs());

describe("database connection boundary", () => {
  it("requires verified TLS for remote connections even if URL disables it", () => {
    const url = new URL(
      databaseConnectionUrl(
        "postgresql://user:password@db.example.invalid/postgres?sslmode=no-verify&schema=public",
      ),
    );
    expect(url.searchParams.get("sslmode")).toBe("verify-full");
    expect(url.searchParams.get("schema")).toBe("app");
  });
  it("allows local PostgreSQL without a TLS server", () => {
    const url = new URL(
      databaseConnectionUrl("postgresql://localhost/alokasi_test"),
    );
    expect(url.searchParams.has("sslmode")).toBe(false);
  });
  it("uses the configured project CA", () => {
    vi.stubEnv("DATABASE_SSL_ROOT_CERT", "certs/project.cer");
    const url = new URL(
      databaseConnectionUrl("postgresql://db.example.invalid/postgres"),
    );
    expect(url.searchParams.get("sslrootcert")).toBe("certs/project.cer");
  });
  it("preserves password encoding while changing connection parameters", () => {
    const url = new URL(
      databaseConnectionUrl(
        "postgresql://user:a%40b%23c@db.example.invalid/postgres",
      ),
    );
    expect(decodeURIComponent(url.password)).toBe("a@b#c");
  });
  it("rejects invalid protocols without echoing the input", () => {
    expect(() =>
      databaseConnectionUrl("https://secret@example.invalid"),
    ).toThrow("Format koneksi PostgreSQL tidak valid.");
  });
  it("limits each Vercel instance to one application-side connection", () => {
    expect(databasePoolSize({ VERCEL: "1" })).toBe(1);
    expect(databasePoolSize({})).toBe(5);
  });
});

describe("authentication input boundary", () => {
  it("maps actionable signup failures without exposing provider messages", () => {
    expect(signUpErrorKey({ code: "weak_password", status: 422 })).toBe(
      "weak-password",
    );
    expect(signUpErrorKey({ code: "over_email_send_rate_limit" })).toBe(
      "email-rate-limit",
    );
    expect(signUpErrorKey({ status: 0 })).toBe("unavailable");
    expect(signUpErrorKey({ code: "unknown_provider_detail" })).toBe("signup");
  });
  it("normalizes a valid registration", () => {
    const result = signUpSchema.parse({
      displayName: "  Rani  ",
      email: " RANI@EXAMPLE.COM ",
      password: "rahasia-kuat",
    });
    expect(result).toEqual({
      displayName: "Rani",
      email: "rani@example.com",
      password: "rahasia-kuat",
    });
  });
  it("rejects short passwords and malformed email", () => {
    expect(
      signInSchema.safeParse({ email: "bukan-email", password: "pendek" })
        .success,
    ).toBe(false);
    expect(
      forgotPasswordSchema.safeParse({ email: "bukan-email" }).success,
    ).toBe(false);
  });
  it("does not accept an external redirect target", () => {
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("/reports?period=1")).toBe("/reports?period=1");
  });
  it("requires an exact same-origin POST", () => {
    expect(
      hasValidOrigin(
        new Request("https://alokasi.test/auth/sign-in", {
          headers: { origin: "https://alokasi.test" },
        }),
      ),
    ).toBe(true);
    expect(
      hasValidOrigin(
        new Request("https://alokasi.test/auth/sign-in", {
          headers: { origin: "https://evil.test" },
        }),
      ),
    ).toBe(false);
  });
  it("accepts equivalent loopback hosts only for the configured local app", () => {
    const previous = process.env.APP_URL;
    process.env.APP_URL = "http://localhost:3000";
    try {
      expect(
        hasValidOrigin(
          new Request("http://localhost:3000/auth/sign-in", {
            headers: { origin: "http://127.0.0.1:3000" },
          }),
        ),
      ).toBe(true);
      expect(
        hasValidOrigin(
          new Request("http://localhost:3000/auth/sign-in", {
            headers: { origin: "http://127.0.0.1:3001" },
          }),
        ),
      ).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = previous;
    }
  });
});

describe("account and category domain", () => {
  it("normalizes names and preserves rupiah as bigint", () => {
    const account = createAccountInput.parse({
      name: "  Dompet   utama  ",
      type: "cash",
      openingBalance: "9007199254740993",
      openingDate: "2026-09-23",
    });
    expect(account.name).toBe("Dompet utama");
    expect(account.openingBalance).toBe(9007199254740993n);
    expect(
      createAccountInput.safeParse({
        ...account,
        openingBalance: "1.5",
      }).success,
    ).toBe(false);
  });

  it("normalizes category whitespace and creates a stable comparison key", () => {
    const category = createCategoryInput.parse({
      name: "  Makan   Siang ",
      type: "expense",
    });
    expect(category.name).toBe("Makan Siang");
    expect(categoryNameKey(category.name)).toBe("makan siang");
  });

  it("calculates income, expense, and transfer without changing total transfer funds", () => {
    const balances = calculateAccountBalances(
      [
        { id: "bank", openingBalance: 1_000_000n },
        { id: "cash", openingBalance: 100_000n },
      ],
      [
        {
          type: "income",
          amount: 500_000n,
          accountId: "bank",
          destinationAccountId: null,
        },
        {
          type: "expense",
          amount: 100_000n,
          accountId: "bank",
          destinationAccountId: null,
        },
        {
          type: "transfer",
          amount: 200_000n,
          accountId: "bank",
          destinationAccountId: "cash",
        },
      ],
    );
    expect(balances.get("bank")).toBe(1_200_000n);
    expect(balances.get("cash")).toBe(300_000n);
    expect([...balances.values()].reduce((sum, value) => sum + value, 0n)).toBe(
      1_500_000n,
    );
  });

  it("accepts only positive integer transaction amounts and calendar dates", () => {
    const base = {
      type: "expense",
      amount: "125000",
      transactionDate: "2026-09-23",
      accountId: "11111111-1111-4111-8111-111111111111",
      destinationAccountId: "",
      categoryId: "22222222-2222-4222-8222-222222222222",
      note: "  Makan siang  ",
      idempotencyKey: "retry-key",
    };
    const parsed = createTransactionInput.parse(base);
    expect(parsed.amount).toBe(125000n);
    expect(parsed.note).toBe("Makan siang");
    expect(
      createTransactionInput.safeParse({ ...base, amount: "1.5" }).success,
    ).toBe(false);
    expect(
      createTransactionInput.safeParse({
        ...base,
        transactionDate: "2026-02-31",
      }).success,
    ).toBe(false);
  });
});
