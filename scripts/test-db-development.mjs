import { spawnSync } from "node:child_process";
import nextEnv from "@next/env";
import pg from "pg";
import { databaseConnectionUrl } from "../src/server/db/connection.ts";

// Opt-in smoke testing for a fresh development project only. The Vitest suite
// rolls every fixture back; this command never migrates, truncates or drops data.
nextEnv.loadEnvConfig(process.cwd(), true);
const connectionString = process.env.DIRECT_URL;
if (!connectionString || process.env.NODE_ENV === "production") {
  console.error("DIRECT_URL development wajib diisi; mode produksi ditolak.");
  process.exit(1);
}
const client = new pg.Client({
  connectionString: databaseConnectionUrl(connectionString),
  connectionTimeoutMillis: 10000,
});
try {
  await client.connect();
  for (const table of [
    "users",
    "workspaces",
    "memberships",
    "invitations",
    "financial_accounts",
    "categories",
    "transactions",
    "receipt_drafts",
    "cycle_settings",
    "budget_periods",
    "budgets",
    "audit_events",
  ]) {
    const { rowCount } = await client.query(
      `SELECT 1 FROM app.${table} LIMIT 1`,
    );
    if (rowCount) throw new Error("DEVELOPMENT_DATABASE_NOT_EMPTY");
  }
} catch {
  console.error(
    "Database development harus dapat diakses, sudah dimigrasi, dan belum berisi data aplikasi. Gunakan database test terpisah jika sudah ada data.",
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
if (!process.exitCode) {
  const result = spawnSync(
    process.execPath,
    ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.config.mts"],
    {
      stdio: "inherit",
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "test",
        TEST_DATABASE_URL: connectionString,
      },
    },
  );
  process.exitCode = result.status ?? 1;
}
