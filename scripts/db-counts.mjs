import nextEnv from "@next/env";
import pg from "pg";
import { databaseConnectionUrl } from "../src/server/db/connection.ts";

nextEnv.loadEnvConfig(process.cwd(), true);
const value = process.env.DIRECT_URL;
if (!value) process.exit(1);
const client = new pg.Client({
  connectionString: databaseConnectionUrl(value),
  connectionTimeoutMillis: 10000,
});
try {
  await client.connect();
  const names = [
    "users",
    "workspaces",
    "memberships",
    "categories",
    "cycle_settings",
    "budget_periods",
    "financial_accounts",
    "transactions",
    "receipt_drafts",
    "budgets",
    "invitations",
    "audit_events",
  ];
  const counts = {};
  for (const name of names) {
    const { rows } = await client.query(
      `SELECT count(*)::int AS count FROM app.${name}`,
    );
    counts[name] = rows[0].count;
  }
  console.log(JSON.stringify(counts, null, 2));
} catch (error) {
  const code = typeof error?.code === "string" ? error.code : "CHECK_FAILED";
  console.error(`Audit jumlah data gagal (${code}).`);
  process.exitCode = 1;
} finally {
  await client.end();
}
