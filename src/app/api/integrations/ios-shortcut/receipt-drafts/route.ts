import { NextResponse } from "next/server";
import { toDatabaseDate } from "@/modules/finance/domain";
import { createLocalReceiptDraftInput } from "@/modules/receipts/domain";
import { parseLocalReceiptOcr } from "@/modules/receipts/local-ocr";
import { createShortcutReceiptDraft } from "@/modules/receipts/service";
import {
  detectShortcutReceiptImageType,
  SHORTCUT_RECEIPT_IMAGE_MAX_BYTES,
  SHORTCUT_RECEIPT_REQUEST_MAX_BYTES,
  shortcutReceiptRequest,
} from "@/modules/shortcut-integration/domain";
import {
  authenticateShortcutToken,
  markShortcutUsed,
  ShortcutIntegrationError,
} from "@/modules/shortcut-integration/service";
import { appOrigin } from "@/server/auth/http";

export const runtime = "nodejs";

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
}

function localToday(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "size" in value &&
    "type" in value
  );
}

async function parseRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const text = form.get("text");
    const image = form.get("image");
    const parsed = shortcutReceiptRequest.safeParse({ text });
    if (!parsed.success || !isUploadedFile(image)) return null;
    if (image.size < 1 || image.size > SHORTCUT_RECEIPT_IMAGE_MAX_BYTES) {
      return null;
    }
    const bytes = new Uint8Array(await image.arrayBuffer());
    const mimeType = detectShortcutReceiptImageType(bytes, image.type);
    if (!mimeType) return null;
    return {
      text: parsed.data.text,
      evidenceImage: {
        bytes,
        mimeType,
      },
    };
  }

  if (contentType.includes("application/json")) {
    const parsed = shortcutReceiptRequest.safeParse(await request.json());
    return parsed.success ? { text: parsed.data.text } : null;
  }
  return null;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (
    Number.isFinite(contentLength) &&
    contentLength > SHORTCUT_RECEIPT_REQUEST_MAX_BYTES
  ) {
    return json(
      { ok: false, error: "Payload terlalu besar. Gambar maksimal 4 MB." },
      413,
    );
  }

  try {
    const membership = await authenticateShortcutToken(bearerToken(request));
    const payload = await parseRequest(request);
    if (!payload) {
      return json(
        {
          ok: false,
          error:
            "Kirim Form berisi text dan image JPEG, PNG, atau WebP maksimal 4 MB.",
        },
        400,
      );
    }

    // Apple Shortcuts does not expose a numeric OCR confidence. Zero keeps
    // every derived field visibly in the "needs review" state.
    const extracted = parseLocalReceiptOcr(payload.text, 0);
    const input = createLocalReceiptDraftInput.safeParse({
      amount: extracted.amount,
      transactionDate: extracted.transactionDate,
      merchant: extracted.merchant,
      note: extracted.note,
      institution: extracted.institution,
      evidenceKind: extracted.evidenceKind,
      paymentRail: extracted.paymentRail,
      ocrConfidence: extracted.confidence.ocr,
      amountConfidence: extracted.confidence.amount ?? "",
      dateConfidence: extracted.confidence.date ?? "",
      merchantConfidence: extracted.confidence.merchant ?? "",
      institutionConfidence: extracted.confidence.institution ?? "",
    });
    if (!input.success) {
      return json({ ok: false, error: "Hasil OCR tidak dapat diproses." }, 422);
    }

    const result = await createShortcutReceiptDraft(
      {
        workspaceId: membership.workspaceId,
        actorId: membership.userId,
        role: membership.role,
        today: toDatabaseDate(localToday(membership.workspace.timezone)),
      },
      input.data,
      {
        accountId: membership.shortcutDefaultAccountId!,
        categoryId: membership.shortcutDefaultCategoryId!,
        tokenHash: membership.shortcutTokenHash!,
      },
      payload.evidenceImage,
    );
    await markShortcutUsed(membership.id, membership.shortcutTokenHash!);

    const reviewUrl = new URL("/transactions", appOrigin());
    reviewUrl.searchParams.set("workspaceId", membership.workspaceId);
    reviewUrl.searchParams.set("source", "ios-shortcut");
    reviewUrl.hash = "scan-struk";
    return json(
      {
        ok: true,
        message: result.reused
          ? "Masih ada draf yang perlu diperiksa."
          : "Draf siap diperiksa di Alokasi.",
        reused: result.reused,
        draftId: result.draft.id,
        amount: result.draft.extractedAmount?.toString() ?? "",
        merchant: result.draft.extractedMerchant ?? "",
        transactionDate:
          result.draft.extractedTransactionDate?.toISOString().slice(0, 10) ??
          "",
        reviewUrl: reviewUrl.toString(),
      },
      result.reused ? 200 : 201,
    );
  } catch (error) {
    if (error instanceof ShortcutIntegrationError) {
      return json(
        {
          ok: false,
          error:
            error.code === "SHORTCUT_TOKEN_EXPIRED"
              ? "Token kedaluwarsa. Buat token baru di Pengaturan Alokasi."
              : "Token tidak valid atau akses sudah dicabut.",
        },
        401,
      );
    }
    return json(
      { ok: false, error: "Draf belum dapat dibuat. Coba kembali." },
      422,
    );
  }
}
