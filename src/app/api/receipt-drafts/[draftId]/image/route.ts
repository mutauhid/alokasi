import { getReceiptDraftEvidence } from "@/modules/receipts/service";
import { requireWorkspaceAccess } from "@/modules/workspaces/service";
import { getVerifiedIdentity } from "@/server/auth/identity";

export const runtime = "nodejs";

function response(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const identity = await getVerifiedIdentity();
  if (!identity?.emailVerified) return response("Autentikasi diperlukan.", 401);

  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return response("Ruang wajib dipilih.", 400);

  try {
    const context = await requireWorkspaceAccess(identity, workspaceId, [
      "owner",
      "editor",
    ]);
    const { draftId } = await params;
    const evidence = await getReceiptDraftEvidence(context, draftId);
    if (!evidence?.evidenceImage || !evidence.evidenceImageMime) {
      return response("Gambar draf tidak ditemukan.", 404);
    }
    const bytes = new Uint8Array(evidence.evidenceImage).buffer;
    return new Response(bytes, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": 'inline; filename="bukti-pembayaran"',
        "Content-Length": String(evidence.evidenceImage.byteLength),
        "Content-Type": evidence.evidenceImageMime,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return response("Akses gambar draf ditolak.", 403);
  }
}
