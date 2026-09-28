import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";
import { databaseConnectionUrl } from "./src/server/db/connection";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

let migrationUrl = "";
if (process.env.DIRECT_URL) {
  try {
    migrationUrl = databaseConnectionUrl(process.env.DIRECT_URL);
  } catch {
    throw new Error("Format DIRECT_URL tidak valid; periksa .env.local.");
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // No fallback to the runtime role. Generate/validate work without credentials;
  // commands requiring a connection fail when DIRECT_URL is absent.
  datasource: { url: migrationUrl },
});
