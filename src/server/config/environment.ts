import "server-only";

type RuntimeEnvironment = Record<string, string | undefined>;

export type EnvironmentInspection = {
  ready: boolean;
  missing: string[];
  invalid: string[];
};

function isLoopback(hostname: string) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

function inspectHttpUrl(
  value: string,
  name: string,
  invalid: string[],
  requireOriginOnly: boolean,
) {
  try {
    const parsed = new URL(value);
    const validProtocol =
      parsed.protocol === "https:" ||
      (parsed.protocol === "http:" && isLoopback(parsed.hostname));
    const validShape =
      !requireOriginOnly ||
      (parsed.pathname === "/" && !parsed.search && !parsed.hash);
    if (!validProtocol || !validShape) invalid.push(name);
  } catch {
    invalid.push(name);
  }
}

function inspectDatabaseUrl(value: string, invalid: string[]) {
  try {
    const parsed = new URL(value);
    if (
      !["postgres:", "postgresql:"].includes(parsed.protocol) ||
      !parsed.hostname ||
      (!isLoopback(parsed.hostname) && (!parsed.username || !parsed.password))
    ) {
      invalid.push("DATABASE_URL");
    }
  } catch {
    invalid.push("DATABASE_URL");
  }
}

export function inspectRuntimeEnvironment(
  environment: RuntimeEnvironment = process.env,
): EnvironmentInspection {
  const missing: string[] = [];
  const invalid: string[] = [];

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "DATABASE_URL",
    "APP_URL",
  ] as const;
  for (const name of required) {
    if (!environment[name]?.trim()) missing.push(name);
  }
  if (
    !environment.SUPABASE_SECRET_KEY?.trim() &&
    !environment.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ) {
    missing.push("SUPABASE_SECRET_KEY");
  }

  const authUrl = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (authUrl) {
    inspectHttpUrl(authUrl, "NEXT_PUBLIC_SUPABASE_URL", invalid, true);
  }
  const appUrl = environment.APP_URL?.trim();
  if (appUrl) inspectHttpUrl(appUrl, "APP_URL", invalid, true);
  const databaseUrl = environment.DATABASE_URL?.trim();
  if (databaseUrl) inspectDatabaseUrl(databaseUrl, invalid);

  return {
    ready: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
  };
}
