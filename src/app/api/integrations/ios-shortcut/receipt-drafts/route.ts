import { NextResponse } from "next/server";
import { toDatabaseDate } from "@/modules/finance/domain";
import { createLocalReceiptDraftInput } from "@/modules/receipts/domain";
import { parseLocalReceiptOcr } from "@/modules/receipts/local-ocr";
import { createShortcutReceiptDraft } from "@/modules/receipts/service";
import { shortcutReceiptRequest } from "@/modules/shortcut-integration/domain";
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

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 100_000) {
    return json({ ok: false, error: "Teks OCR terlalu besar." }, 413);
  }

  try {
    const membership = await authenticateShortcutToken(bearerToken(request));
    const body: unknown = await request.json();
    const parsedRequest = shortcutReceiptRequest.safeParse(body);
    if (!parsedRequest.success) {
      return json(
        { ok: false, error: "Kirim JSON dengan field text hasil OCR." },
        400,
      );
    }

    // Apple Shortcuts does not expose a numeric OCR confidence. Zero keeps
    // every derived field visibly in the "needs review" state.
    const extracted = parseLocalReceiptOcr(parsedRequest.data.text, 0);
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
