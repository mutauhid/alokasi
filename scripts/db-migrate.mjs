import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import nextEnv from "@next/env";

const testTarget = process.argv.includes("--test");
if (testTarget) {
  if (!process.env.TEST_DATABASE_URL && existsSync(".env.test.local")) {
    process.loadEnvFile(".env.test.local");
  }
  if (!process.env.TEST_DATABASE_URL) {
    console.error(
      "TEST_DATABASE_URL belum diatur pada environment atau .env.test.local. Ikuti docs/DATABASE_SETUP.md.",
    );
    process.exit(1);
  }
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;
} else {
  nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
}
if (!process.env.DIRECT_URL) {
  console.error("DIRECT_URL belum diatur. Ikuti docs/DATABASE_SETUP.md.");
  process.exit(1);
}
const command = process.argv.includes("--status") ? "status" : "deploy";
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", command],
  {
    encoding: "utf8",
    timeout: 120000,
    windowsHide: true,
  },
);
if (result.status !== 0) {
  const diagnostic = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const code = diagnostic.match(/\bP\d{4}\b/)?.[0] ?? "MIGRATION_FAILED";
  console.error(
    `Prisma migrate ${command} gagal (${code}); detail koneksi disembunyikan. Periksa koneksi dan riwayat migrasi sebelum mencoba lagi.`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Prisma migrate ${command} berhasil. Target: ${testTarget ? "test" : "development"}; schema: app.`,
  );
}
