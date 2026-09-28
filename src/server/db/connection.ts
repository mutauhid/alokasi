// Shared by CLI and runtime. Never prints URLs or reads credential files.
export function databaseConnectionUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error();
  } catch {
    throw new Error("Format koneksi PostgreSQL tidak valid.");
  }
  url.searchParams.set("schema", "app");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    url.searchParams.set("sslmode", "verify-full");
    if (process.env.DATABASE_SSL_ROOT_CERT) {
      url.searchParams.set("sslrootcert", process.env.DATABASE_SSL_ROOT_CERT);
    }
  }
  return url.toString();
}

export function databasePoolSize(
  environment: Record<string, string | undefined> = process.env,
) {
  return environment.VERCEL === "1" ? 1 : 5;
}
