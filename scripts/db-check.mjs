import nextEnv from "@next/env";
import pg from "pg";
import { databaseConnectionUrl } from "../src/server/db/connection.ts";

const testTarget = process.argv.includes("--test");
if (testTarget) process.loadEnvFile(".env.test.local");
else
  nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const key = testTarget
  ? "TEST_DATABASE_URL"
  : process.argv.includes("--runtime")
    ? "DATABASE_URL"
    : "DIRECT_URL";
const connectionString = process.env[key];
if (!connectionString) {
  console.error(`${key} belum diatur. Lihat docs/DATABASE_SETUP.md.`);
  process.exit(1);
}
const client = new pg.Client({
  connectionString: databaseConnectionUrl(connectionString),
  connectionTimeoutMillis: 10000,
});
try {
  await client.connect();
  const {
    rows: [row],
  } = await client.query(`
    SELECT current_setting('server_version') AS version,
      EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'app') AS app_schema,
      (SELECT count(*)::int FROM information_schema.tables WHERE table_schema = 'app') AS app_tables,
      r.rolsuper AS superuser, r.rolbypassrls AS bypass_rls,
      CASE WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'app')
        THEN has_schema_privilege(current_user, 'app', 'CREATE') ELSE false END AS app_ddl,
      has_schema_privilege(current_user, 'public', 'CREATE') AS public_ddl
    FROM pg_roles r WHERE rolname = current_user
  `);
  console.log(
    JSON.stringify(
      {
        connection: key,
        connectionMode: new URL(connectionString).hostname.endsWith(
          ".pooler.supabase.com",
        )
          ? new URL(connectionString).port === "6543"
            ? "transaction-pooler"
            : "session-pooler"
          : "direct-or-local",
        ...row,
        tls: client.connection.stream.encrypted === true,
        tlsVerified: client.connection.stream.authorized === true,
      },
      null,
      2,
    ),
  );
  if (
    key === "DATABASE_URL" &&
    (row.superuser || row.bypass_rls || row.app_ddl || row.public_ddl)
  ) {
    throw Object.assign(new Error("Runtime role is too privileged"), {
      code: "RUNTIME_ROLE_TOO_PRIVILEGED",
    });
  }
} catch (error) {
  // Driver messages may include hosts, usernames or SQL. Print only safe codes.
  const nestedErrors = Array.isArray(error?.errors) ? error.errors : [];
  const safeCodes = [error, ...nestedErrors]
    .map((candidate) => candidate?.code)
    .filter(
      (candidate, index, values) =>
        typeof candidate === "string" &&
        /^[A-Z0-9_]+$/.test(candidate) &&
        values.indexOf(candidate) === index,
    );
  const code = safeCodes.join(",") || "CONNECTION_FAILED";
  console.error(
    `Pemeriksaan ${key} gagal (${code}). Credential tidak ditampilkan.`,
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
