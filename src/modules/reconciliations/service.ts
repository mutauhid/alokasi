import "server-only";

import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import {
  calculateAccountBalances,
  reconciliationDifference,
  type BalanceTransaction,
} from "@/modules/finance/domain";
import { FinanceDomainError } from "@/modules/finance/errors";
import { getDatabase } from "@/server/db/client";

type ReconciliationContext = {
  workspaceId: string;
  actorId: string;
  role: "owner" | "editor" | "viewer";
  today: Date;
};

export type ReconciliationInput = {
  accountId: string;
  actualBalance: bigint;
  reconciliationDate: Date;
  resolution: "matched" | "adjusted";
  note: string | null;
  idempotencyKey: string;
};

function requestHash(input: ReconciliationInput) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        accountId: input.accountId,
        actualBalance: input.actualBalance.toString(),
        reconciliationDate: input.reconciliationDate.toISOString().slice(0, 10),
        resolution: input.resolution,
        note: input.note,
      }),
    )
    .digest("hex");
}

async function balanceAtDate(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  account: { id: string; openingBalance: bigint },
  reconciliationDate: Date,
) {
  const [transactions, adjustments] = await Promise.all([
    tx.transaction.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        transactionDate: { lte: reconciliationDate },
        OR: [{ accountId: account.id }, { destinationAccountId: account.id }],
      },
      select: {
        type: true,
        amount: true,
        accountId: true,
        destinationAccountId: true,
      },
    }),
    tx.balanceReconciliation.findMany({
      where: {
        workspaceId,
        accountId: account.id,
        reconciliationDate: { lte: reconciliationDate },
        adjustmentAmount: { not: 0n },
      },
      select: { accountId: true, adjustmentAmount: true },
    }),
  ]);
  return (
    calculateAccountBalances(
      [account],
      transactions as BalanceTransaction[],
      adjustments.map((item) => ({
        accountId: item.accountId,
        amount: item.adjustmentAmount,
      })),
    ).get(account.id) ?? account.openingBalance
  );
}

export async function createBalanceReconciliation(
  context: ReconciliationContext,
  input: ReconciliationInput,
) {
  if (!["owner", "editor"].includes(context.role)) {
    throw new FinanceDomainError("RECONCILIATION_ACCESS_DENIED");
  }
  if (input.reconciliationDate > context.today) {
    throw new FinanceDomainError("RECONCILIATION_FUTURE_DATE");
  }
  const hash = requestHash(input);
  return getDatabase().$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id FROM app.financial_accounts
      WHERE workspace_id = ${context.workspaceId}::uuid
        AND id = ${input.accountId}::uuid
      FOR UPDATE
    `;
    const account = await tx.financialAccount.findFirst({
      where: {
        id: input.accountId,
        workspaceId: context.workspaceId,
        archivedAt: null,
      },
      select: { id: true, openingBalance: true, openingDate: true },
    });
    if (!account) {
      throw new FinanceDomainError("RECONCILIATION_ACCOUNT_INVALID");
    }
    if (input.reconciliationDate < account.openingDate) {
      throw new FinanceDomainError("RECONCILIATION_BEFORE_ACCOUNT");
    }

    const existing = await tx.balanceReconciliation.findUnique({
      where: {
        workspaceId_createdBy_idempotencyKey: {
          workspaceId: context.workspaceId,
          createdBy: context.actorId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (existing) {
      if (existing.requestHash !== hash) {
        throw new FinanceDomainError("RECONCILIATION_IDEMPOTENCY_CONFLICT");
      }
      return existing;
    }

    const recordedBalance = await balanceAtDate(
      tx,
      context.workspaceId,
      account,
      input.reconciliationDate,
    );
    let difference: bigint;
    try {
      difference = reconciliationDifference(
        recordedBalance,
        input.actualBalance,
      );
    } catch {
      throw new FinanceDomainError("RECONCILIATION_AMOUNT_RANGE");
    }
    if (input.resolution === "matched" && difference !== 0n) {
      throw new FinanceDomainError("RECONCILIATION_DIFFERENCE");
    }
    if (input.resolution === "adjusted" && difference === 0n) {
      throw new FinanceDomainError("RECONCILIATION_ALREADY_MATCHES");
    }

    const reconciliation = await tx.balanceReconciliation.create({
      data: {
        workspaceId: context.workspaceId,
        accountId: account.id,
        createdBy: context.actorId,
        reconciliationDate: input.reconciliationDate,
        recordedBalance,
        actualBalance: input.actualBalance,
        difference,
        adjustmentAmount: input.resolution === "adjusted" ? difference : 0n,
        resolution: input.resolution,
        note: input.note,
        idempotencyKey: input.idempotencyKey,
        requestHash: hash,
      },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: context.workspaceId,
        actorId: context.actorId,
        entityType: "balance_reconciliation",
        entityId: reconciliation.id,
        action: input.resolution === "adjusted" ? "adjusted" : "matched",
        changedFields: [
          "account_id",
          "reconciliation_date",
          "recorded_balance",
          "actual_balance",
          "difference",
          "adjustment_amount",
          "resolution",
        ],
      },
    });
    return reconciliation;
  });
}

export async function getAccountReconciliationOverview(
  workspaceId: string,
  accountId: string,
  reconciliationDate: Date,
) {
  const db = getDatabase();
  const account = await db.financialAccount.findFirst({
    where: { id: accountId, workspaceId },
    select: {
      id: true,
      name: true,
      openingBalance: true,
      openingDate: true,
      archivedAt: true,
    },
  });
  if (!account) return null;

  const history = await db.balanceReconciliation.findMany({
    where: { workspaceId, accountId },
    include: {
      creator: {
        select: { user: { select: { displayName: true, email: true } } },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 20,
  });
  const latestDate = history.reduce<Date | null>(
    (latest, item) =>
      !latest || item.reconciliationDate > latest
        ? item.reconciliationDate
        : latest,
    null,
  );
  const transactionChanges = latestDate
    ? await db.transaction.findMany({
        where: {
          workspaceId,
          transactionDate: { lte: latestDate },
          OR: [{ accountId }, { destinationAccountId: accountId }],
        },
        select: {
          transactionDate: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : [];

  const recordedBalance =
    reconciliationDate >= account.openingDate
      ? await db.$transaction((tx) =>
          balanceAtDate(tx, workspaceId, account, reconciliationDate),
        )
      : null;
  return {
    account,
    reconciliationDate,
    recordedBalance,
    history: history.map((item) => ({
      ...item,
      needsReview:
        transactionChanges.some(
          (transaction) =>
            transaction.transactionDate <= item.reconciliationDate &&
            (transaction.createdAt > item.createdAt ||
              transaction.updatedAt > item.createdAt),
        ) ||
        history.some(
          (other) =>
            other.id !== item.id &&
            other.createdAt > item.createdAt &&
            other.reconciliationDate <= item.reconciliationDate &&
            other.adjustmentAmount !== 0n,
        ),
    })),
  };
}
