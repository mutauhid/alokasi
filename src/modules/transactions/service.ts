import "server-only";

import { createHash } from "node:crypto";
import { getDatabase } from "@/server/db/client";
import { FinanceDomainError } from "@/modules/finance/errors";

type TransactionType = "income" | "expense" | "transfer";
export type TransactionContext = {
  workspaceId: string;
  actorId: string;
  role?: "owner" | "editor" | "viewer";
  today: Date;
};
export type TransactionInput = {
  type: TransactionType;
  title: string;
  amount: bigint;
  transactionDate: Date;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  note: string | null;
};

function requestHash(input: TransactionInput) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        type: input.type,
        title: input.title,
        amount: input.amount.toString(),
        transactionDate: input.transactionDate.toISOString().slice(0, 10),
        accountId: input.accountId,
        destinationAccountId: input.destinationAccountId,
        categoryId: input.categoryId,
        note: input.note,
      }),
    )
    .digest("hex");
}

async function validateReferences(
  tx: Parameters<
    Parameters<ReturnType<typeof getDatabase>["$transaction"]>[0]
  >[0],
  context: TransactionContext,
  input: TransactionInput,
) {
  if (input.transactionDate > context.today)
    throw new FinanceDomainError("TRANSACTION_FUTURE_DATE");
  if (input.type === "transfer") {
    if (
      !input.destinationAccountId ||
      input.destinationAccountId === input.accountId ||
      input.categoryId
    ) {
      throw new FinanceDomainError("TRANSACTION_INVALID_SHAPE");
    }
  } else if (!input.categoryId || input.destinationAccountId) {
    throw new FinanceDomainError("TRANSACTION_INVALID_SHAPE");
  }

  const accountIds = [input.accountId, input.destinationAccountId].filter(
    (value): value is string => Boolean(value),
  );
  const accounts = await tx.financialAccount.findMany({
    where: {
      workspaceId: context.workspaceId,
      id: { in: accountIds },
      archivedAt: null,
    },
  });
  if (accounts.length !== accountIds.length)
    throw new FinanceDomainError("TRANSACTION_ACCOUNT_INVALID");
  if (accounts.some((account) => input.transactionDate < account.openingDate)) {
    throw new FinanceDomainError("TRANSACTION_BEFORE_ACCOUNT");
  }

  if (input.categoryId) {
    const category = await tx.category.findFirst({
      where: {
        id: input.categoryId,
        workspaceId: context.workspaceId,
        type: input.type,
        archivedAt: null,
      },
    });
    if (!category) throw new FinanceDomainError("TRANSACTION_CATEGORY_INVALID");
  }
}

export async function createTransactionInTransaction(
  tx: Parameters<
    Parameters<ReturnType<typeof getDatabase>["$transaction"]>[0]
  >[0],
  context: TransactionContext,
  input: TransactionInput & {
    idempotencyKey: string;
    recurringTemplateId?: string;
    recurringDueDate?: Date;
  },
) {
  await validateReferences(tx, context, input);
  const transaction = await tx.transaction.create({
    data: {
      workspaceId: context.workspaceId,
      createdBy: context.actorId,
      updatedBy: context.actorId,
      type: input.type,
      title: input.title,
      amount: input.amount,
      transactionDate: input.transactionDate,
      accountId: input.accountId,
      destinationAccountId: input.destinationAccountId,
      categoryId: input.categoryId,
      note: input.note,
      idempotencyKey: input.idempotencyKey,
      requestHash: requestHash(input),
      recurringTemplateId: input.recurringTemplateId,
      recurringDueDate: input.recurringDueDate,
    },
  });
  await tx.auditEvent.create({
    data: {
      workspaceId: context.workspaceId,
      actorId: context.actorId,
      entityType: "transaction",
      entityId: transaction.id,
      action: "created",
      changedFields: [
        "type",
        "title",
        "amount",
        "transaction_date",
        "account_id",
        "destination_account_id",
        "category_id",
        "note",
      ],
    },
  });
  return transaction;
}

export function listTransactions(workspaceId: string) {
  return getDatabase().transaction.findMany({
    where: { workspaceId, deletedAt: null },
    include: {
      account: { select: { name: true } },
      destinationAccount: { select: { name: true } },
      category: { select: { name: true, archivedAt: true } },
      creator: {
        select: { user: { select: { displayName: true, email: true } } },
      },
    },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
}

export async function createTransaction(
  context: TransactionContext,
  input: TransactionInput & { idempotencyKey: string },
) {
  if (context.role && !["owner", "editor"].includes(context.role)) {
    throw new FinanceDomainError("TRANSACTION_ACCESS_DENIED");
  }
  const db = getDatabase();
  const hash = requestHash(input);
  try {
    return await db.$transaction((tx) =>
      createTransactionInTransaction(tx, context, input),
    );
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
    const raced = await db.transaction.findUnique({
      where: {
        workspaceId_createdBy_idempotencyKey: {
          workspaceId: context.workspaceId,
          createdBy: context.actorId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (!raced || raced.requestHash !== hash) {
      throw new FinanceDomainError("TRANSACTION_IDEMPOTENCY_CONFLICT");
    }
    return raced;
  }
}

export async function updateTransaction(
  context: TransactionContext,
  input: TransactionInput & { id: string; version: number },
) {
  if (context.role === "viewer")
    throw new FinanceDomainError("TRANSACTION_ACCESS_DENIED");
  const db = getDatabase();
  return db.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({
      where: {
        id: input.id,
        workspaceId: context.workspaceId,
        ...(context.role === "editor" ? { createdBy: context.actorId } : {}),
        version: input.version,
        deletedAt: null,
      },
    });
    if (!existing) throw new FinanceDomainError("TRANSACTION_CONFLICT");
    await validateReferences(tx, context, input);
    const updated = await tx.transaction.updateMany({
      where: {
        id: input.id,
        workspaceId: context.workspaceId,
        version: input.version,
        deletedAt: null,
      },
      data: {
        type: input.type,
        title: input.title,
        amount: input.amount,
        transactionDate: input.transactionDate,
        accountId: input.accountId,
        destinationAccountId: input.destinationAccountId,
        categoryId: input.categoryId,
        note: input.note,
        requestHash: requestHash(input),
        updatedBy: context.actorId,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1)
      throw new FinanceDomainError("TRANSACTION_CONFLICT");
    await tx.auditEvent.create({
      data: {
        workspaceId: context.workspaceId,
        actorId: context.actorId,
        entityType: "transaction",
        entityId: input.id,
        action: "updated",
        changedFields: [
          "type",
          "title",
          "amount",
          "transaction_date",
          "account_id",
          "destination_account_id",
          "category_id",
          "note",
          "version",
        ],
      },
    });
  });
}

export async function deleteTransaction(
  context: Pick<TransactionContext, "workspaceId" | "actorId" | "role">,
  input: { id: string; version: number },
) {
  if (context.role === "viewer")
    throw new FinanceDomainError("TRANSACTION_ACCESS_DENIED");
  return getDatabase().$transaction(async (tx) => {
    const deleted = await tx.transaction.updateMany({
      where: {
        id: input.id,
        workspaceId: context.workspaceId,
        ...(context.role === "editor" ? { createdBy: context.actorId } : {}),
        version: input.version,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        updatedBy: context.actorId,
        version: { increment: 1 },
      },
    });
    if (deleted.count !== 1)
      throw new FinanceDomainError("TRANSACTION_CONFLICT");
    await tx.auditEvent.create({
      data: {
        workspaceId: context.workspaceId,
        actorId: context.actorId,
        entityType: "transaction",
        entityId: input.id,
        action: "deleted",
        changedFields: ["deleted_at", "version"],
      },
    });
  });
}
