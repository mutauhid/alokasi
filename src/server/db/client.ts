import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { databaseConnectionUrl } from "./connection";

const globalDatabase = globalThis as unknown as {
  alokasiPrisma?: PrismaClient;
};

// Lazy: static builds and the stage-1 preview need no database credentials.
// Import only from authenticated, workspace-scoped server services.
export function getDatabase(): PrismaClient {
  if (globalDatabase.alokasiPrisma) return globalDatabase.alokasiPrisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL belum diatur. Ikuti docs/DATABASE_SETUP.md.");
  }

  const adapter = new PrismaPg(
    {
      connectionString: databaseConnectionUrl(connectionString),
      max: 5,
      connectionTimeoutMillis: 10_000,
    },
    { schema: "app" },
  );
  const client = new PrismaClient({
    adapter,
    errorFormat: "minimal",
    // The remote session pooler can briefly queue a connection under load.
    // Keep query failures strict while allowing interactive transactions to
    // acquire a connection and complete over normal network latency.
    transactionOptions: { maxWait: 15_000, timeout: 30_000 },
  });
  globalDatabase.alokasiPrisma = client;
  return client;
}
