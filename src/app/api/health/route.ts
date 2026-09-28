import { inspectRuntimeEnvironment } from "@/server/config/environment";
import { getDatabase } from "@/server/db/client";
import { reportServerFailure } from "@/server/observability/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

export async function GET() {
  const configuration = inspectRuntimeEnvironment();
  if (!configuration.ready) {
    return Response.json(
      {
        status: "unavailable",
        checks: { configuration: "failed", database: "skipped" },
      },
      { status: 503, headers: responseHeaders },
    );
  }

  try {
    await getDatabase().$queryRaw`SELECT 1`;
    return Response.json(
      { status: "ok", checks: { configuration: "ok", database: "ok" } },
      { status: 200, headers: responseHeaders },
    );
  } catch (error) {
    reportServerFailure("health.database_unavailable", error);
    return Response.json(
      {
        status: "unavailable",
        checks: { configuration: "ok", database: "failed" },
      },
      { status: 503, headers: responseHeaders },
    );
  }
}
