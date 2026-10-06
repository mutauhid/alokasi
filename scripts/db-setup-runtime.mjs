import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";
import { databaseConnectionUrl } from "../src/server/db/connection.ts";

nextEnv.loadEnvConfig(process.cwd(), true);
if (!process.env.DIRECT_URL || process.env.NODE_ENV === "production") {
  console.error(
    "Konfigurasi development DIRECT_URL diperlukan; produksi ditolak.",
  );
  process.exit(1);
}
const originalEnv = await readFile(".env.local", "utf8");
const client = new pg.Client({
  connectionString: databaseConnectionUrl(process.env.DIRECT_URL),
  connectionTimeoutMillis: 10000,
});
let committed = false;
try {
  await client.connect();
  await client.query("BEGIN");
  const { rowCount } = await client.query(
    "SELECT 1 FROM pg_roles WHERE rolname='alokasi_runtime'",
  );
  if (rowCount)
    throw Object.assign(new Error(), { code: "ROLE_ALREADY_EXISTS" });
  const password = randomBytes(32).toString("hex");
  // Hex generated locally; no external input is interpolated into role DDL.
  await client.query(
    `CREATE ROLE alokasi_runtime LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`,
  );
  await client.query(`
    GRANT USAGE ON SCHEMA app TO alokasi_runtime;
    GRANT SELECT,INSERT,UPDATE,DELETE ON app.users,app.workspaces,app.memberships,
      app.invitations,app.financial_accounts,app.categories,app.transactions,
      app.cycle_settings,app.budget_periods,app.budgets,app.receipt_drafts,
      app.balance_reconciliations TO alokasi_runtime;
    GRANT SELECT,INSERT ON app.audit_events TO alokasi_runtime;
    GRANT EXECUTE ON FUNCTION app.lock_workspace(),app.check_workspace_owner(),
      app.check_period_contiguity() TO alokasi_runtime;
  `);
  const url = new URL(databaseConnectionUrl(process.env.DIRECT_URL));
  const suffix = url.hostname.endsWith(".pooler.supabase.com")
    ? decodeURIComponent(url.username).slice(
        decodeURIComponent(url.username).indexOf("."),
      )
    : "";
  if (suffix && !suffix.startsWith("."))
    throw Object.assign(new Error(), { code: "INVALID_POOLER_USERNAME" });
  url.username = `alokasi_runtime${suffix}`;
  url.password = password;
  url.searchParams.set("schema", "app");
  const line = `DATABASE_URL="${url.toString()}"`;
  const updatedEnv = /^DATABASE_URL\s*=/m.test(originalEnv)
    ? originalEnv.replace(/^DATABASE_URL\s*=.*$/gm, line)
    : `${originalEnv.trimEnd()}\n${line}\n`;
  // Do not overwrite concurrent edits made in the user's editor.
  if ((await readFile(".env.local", "utf8")) !== originalEnv) {
    throw Object.assign(new Error(), { code: "ENV_CHANGED_RETRY" });
  }
  await client.query("COMMIT");
  committed = true;
  await writeFile(".env.local", updatedEnv, { mode: 0o600 });
  console.log(
    "Role runtime dibuat. DATABASE_URL disimpan di .env.local; credential tidak ditampilkan.",
  );
} catch (error) {
  if (!committed) await client.query("ROLLBACK").catch(() => {});
  const code =
    typeof error?.code === "string" && /^[A-Z0-9_]+$/.test(error.code)
      ? error.code
      : "SETUP_FAILED";
  console.error(
    `Setup runtime gagal (${code}). Role yang sudah ada tidak diubah. ${committed ? "Role baru sudah dibuat, tetapi penyimpanan env gagal; pulihkan melalui admin." : "Tidak ada perubahan role yang di-commit."}`,
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
