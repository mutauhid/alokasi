import {
  exportTransactionsCsv,
  type ReportQuery,
} from "@/modules/reports/service";
import { toDatabaseDate } from "@/modules/finance/domain";
import { requireWorkspaceAccess } from "@/modules/workspaces/service";
import { getVerifiedIdentity } from "@/server/auth/identity";

function localToday(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET(request: Request) {
  const identity = await getVerifiedIdentity();
  if (!identity?.emailVerified) {
    return new Response("Autentikasi diperlukan.", {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId");
  if (!workspaceId) {
    return new Response("Ruang wajib dipilih.", { status: 400 });
  }
  let context;
  try {
    context = await requireWorkspaceAccess(identity, workspaceId, [
      "owner",
      "editor",
    ]);
  } catch {
    return new Response("Akses ekspor ditolak.", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const query: ReportQuery = {
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    accountId: url.searchParams.get("accountId") ?? undefined,
    categoryId: url.searchParams.get("categoryId") ?? undefined,
    query: url.searchParams.get("query") ?? undefined,
  };
  const today = localToday(context.timezone);
  const csv = await exportTransactionsCsv(
    context.workspaceId,
    toDatabaseDate(today),
    query,
  );
  if (csv === null) {
    return new Response("Filter laporan tidak valid.", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return new Response(csv, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="alokasi-transaksi-${today}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
