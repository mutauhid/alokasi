import "server-only";

import { FinanceDomainError } from "@/modules/finance/errors";
import { simulatedReceiptExtraction } from "@/modules/receipts/fixture-adapter";
import {
  createTransactionInTransaction,
  type TransactionContext,
} from "@/modules/transactions/service";
import { getDatabase } from "@/server/db/client";
import {
  receiptTransactionNote,
  type CreateLocalReceiptDraftInput,
  type SubmitReceiptDraftInput,
} from "@/modules/receipts/domain";

type ReceiptContext = TransactionContext & {
  role: "owner" | "editor" | "viewer";
};

function requireEditor(context: ReceiptContext) {
  if (context.role === "viewer") {
    throw new FinanceDomainError("RECEIPT_ACCESS_DENIED");
  }
}

function isUniqueConflict(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002",
  );
}

export async function createSimulatedReceiptDraft(context: ReceiptContext) {
  requireEditor(context);
  const db = getDatabase();
  const [existing, category] = await Promise.all([
    db.receiptDraft.findFirst({
      where: {
        workspaceId: context.workspaceId,
        createdBy: context.actorId,
        status: "needs_review",
      },
      orderBy: { createdAt: "desc" },
    }),
    db.category.findFirst({
      where: {
        workspaceId: context.workspaceId,
        type: "expense",
        archivedAt: null,
      },
      orderBy: [{ nameKey: "asc" }, { id: "asc" }],
    }),
  ]);
  // The prototype has no stored file, so reuse the one resumable draft instead
  // of accumulating drafts the user cannot reopen after a page reload.
  if (existing) return existing;
  if (!category) throw new FinanceDomainError("RECEIPT_CATEGORY_REQUIRED");

  return db.receiptDraft.create({
    data: {
      workspaceId: context.workspaceId,
      createdBy: context.actorId,
      ...simulatedReceiptExtraction(context.today),
      suggestedCategoryId: category.id,
    },
  });
}

export async function createLocalReceiptDraft(
  context: ReceiptContext,
  input: CreateLocalReceiptDraftInput,
) {
  requireEditor(context);
  const db = getDatabase();
  return db.$transaction(async (tx) => {
    const category = await tx.category.findFirst({
      where: {
        workspaceId: context.workspaceId,
        type: "expense",
        archivedAt: null,
      },
      orderBy: [{ nameKey: "asc" }, { id: "asc" }],
    });
    if (!category) throw new FinanceDomainError("RECEIPT_CATEGORY_REQUIRED");

    const existing = await tx.receiptDraft.findFirst({
      where: {
        workspaceId: context.workspaceId,
        createdBy: context.actorId,
        status: "needs_review",
      },
      orderBy: { createdAt: "desc" },
    });
    const data = {
      sourceKind: "local_ocr",
      extractedAmount: input.amount,
      extractedTransactionDate: input.transactionDate,
      extractedMerchant: input.merchant,
      extractedNote: input.note,
      detectedInstitution: input.institution,
      evidenceKind: input.evidenceKind,
      paymentRail: input.paymentRail,
      ocrConfidence: input.ocrConfidence,
      institutionConfidence: input.institutionConfidence,
      suggestedCategoryId: category.id,
      amountConfidence: input.amountConfidence,
      dateConfidence: input.dateConfidence,
      merchantConfidence: input.merchantConfidence,
      categoryConfidence: null,
    } as const;
    if (existing) {
      return tx.receiptDraft.update({
        where: { id: existing.id },
        data: { ...data, version: { increment: 1 } },
      });
    }
    return tx.receiptDraft.create({
      data: {
        workspaceId: context.workspaceId,
        createdBy: context.actorId,
        ...data,
      },
    });
  });
}

export async function cancelReceiptDraft(
  context: ReceiptContext,
  input: { draftId: string; version: number },
) {
  requireEditor(context);
  const result = await getDatabase().receiptDraft.updateMany({
    where: {
      id: input.draftId,
      workspaceId: context.workspaceId,
      createdBy: context.actorId,
      status: "needs_review",
      version: input.version,
    },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
      version: { increment: 1 },
    },
  });
  if (result.count !== 1) throw new FinanceDomainError("RECEIPT_CONFLICT");
}

export async function submitReceiptDraft(
  context: ReceiptContext,
  input: SubmitReceiptDraftInput,
) {
  requireEditor(context);
  const db = getDatabase();
  const submit = async () =>
    db.$transaction(async (tx) => {
      const activeMembership = await tx.membership.findFirst({
        where: {
          workspaceId: context.workspaceId,
          userId: context.actorId,
          status: "active",
          role: { in: ["owner", "editor"] },
        },
        select: { id: true },
      });
      if (!activeMembership)
        throw new FinanceDomainError("RECEIPT_ACCESS_DENIED");

      // Serialize submit/cancel races for this private draft. Values remain
      // parameterized by Prisma's tagged-template query.
      await tx.$queryRaw`
        SELECT id
        FROM app.receipt_drafts
        WHERE id = ${input.draftId}::uuid
          AND workspace_id = ${context.workspaceId}::uuid
          AND created_by = ${context.actorId}::uuid
        FOR UPDATE
      `;

      const draft = await tx.receiptDraft.findFirst({
        where: {
          id: input.draftId,
          workspaceId: context.workspaceId,
          createdBy: context.actorId,
        },
      });
      if (!draft) throw new FinanceDomainError("RECEIPT_CONFLICT");
      if (draft.status === "submitted" && draft.submittedTransactionId) {
        const existing = await tx.transaction.findUnique({
          where: {
            workspaceId_id: {
              workspaceId: context.workspaceId,
              id: draft.submittedTransactionId,
            },
          },
        });
        if (existing) return existing;
      }
      if (draft.status !== "needs_review" || draft.version !== input.version) {
        throw new FinanceDomainError("RECEIPT_CONFLICT");
      }

      const transaction = await createTransactionInTransaction(tx, context, {
        type: "expense",
        amount: input.amount,
        transactionDate: input.transactionDate,
        accountId: input.accountId,
        destinationAccountId: null,
        categoryId: input.categoryId,
        note: receiptTransactionNote(input.merchant, input.note),
        idempotencyKey: `receipt-draft:${draft.id}`,
      });
      const updated = await tx.receiptDraft.updateMany({
        where: {
          id: draft.id,
          workspaceId: context.workspaceId,
          createdBy: context.actorId,
          status: "needs_review",
          version: input.version,
        },
        data: {
          status: "submitted",
          correctedAmount: input.amount,
          correctedTransactionDate: input.transactionDate,
          correctedMerchant: input.merchant,
          correctedNote: input.note,
          selectedAccountId: input.accountId,
          selectedCategoryId: input.categoryId,
          submittedTransactionId: transaction.id,
          submittedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new FinanceDomainError("RECEIPT_CONFLICT");
      return transaction;
    });

  try {
    return await submit();
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const raced = await db.receiptDraft.findFirst({
      where: {
        id: input.draftId,
        workspaceId: context.workspaceId,
        createdBy: context.actorId,
        status: "submitted",
      },
      include: { submittedTransaction: true },
    });
    if (!raced?.submittedTransaction)
      throw new FinanceDomainError("RECEIPT_CONFLICT");
    return raced.submittedTransaction;
  }
}
