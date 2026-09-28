import { exportWorkspaceJson } from "@/modules/reports/service";
import { requireWorkspaceAccess } from "@/modules/workspaces/service";
import { getVerifiedIdentity } from "@/server/auth/identity";

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
    return new Response("Ruang wajib dipilih.", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
  let context;
  try {
    context = await requireWorkspaceAccess(identity, workspaceId, ["owner"]);
  } catch {
    return new Response("Hanya Owner yang dapat mengekspor seluruh ruang.", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const exportedAt = new Date();
  const document = await exportWorkspaceJson(context.workspaceId, exportedAt);
  if (!document) {
    return new Response("Ruang tidak ditemukan.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const date = exportedAt.toISOString().slice(0, 10);
  return new Response(document, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="alokasi-ruang-${date}.json"`,
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
