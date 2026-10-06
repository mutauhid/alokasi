import "server-only";

import { getDatabase } from "@/server/db/client";
import { calculateAccountBalances } from "@/modules/finance/domain";
import { FinanceDomainError } from "@/modules/finance/errors";

type OwnerContext = { workspaceId: string; actorId: string };

export function listActiveAccountOptions(workspaceId: string) {
  return getDatabase().financialAccount.findMany({
    where: { workspaceId, archivedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
}

export async function listAccounts(workspaceId: string) {
  const db = getDatabase();
  const [accounts, transactions, reconciliations] = await Promise.all([
    db.financialAccount.findMany({
      where: { workspaceId },
      orderBy: [{ archivedAt: "asc" }, { createdAt: "asc" }],
    }),
    db.transaction.findMany({
      where: { workspaceId },
      select: {
        type: true,
        amount: true,
        accountId: true,
        destinationAccountId: true,
        transactionDate: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    }),
    db.balanceReconciliation.findMany({
      where: { workspaceId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        accountId: true,
        reconciliationDate: true,
        resolution: true,
        adjustmentAmount: true,
        createdAt: true,
      },
    }),
  ]);
  const balances = calculateAccountBalances(
    accounts,
    transactions.filter((transaction) => !transaction.deletedAt),
    reconciliations.map((item) => ({
      accountId: item.accountId,
      amount: item.adjustmentAmount,
    })),
  );
  const latestByAccount = new Map<
    string,
    (typeof reconciliations)[number] & { needsReview: boolean }
  >();
  for (const reconciliation of reconciliations) {
    if (latestByAccount.has(reconciliation.accountId)) continue;
    latestByAccount.set(reconciliation.accountId, {
      ...reconciliation,
      needsReview:
        transactions.some(
          (transaction) =>
            (transaction.accountId === reconciliation.accountId ||
              transaction.destinationAccountId === reconciliation.accountId) &&
            transaction.transactionDate <= reconciliation.reconciliationDate &&
            (transaction.createdAt > reconciliation.createdAt ||
              transaction.updatedAt > reconciliation.createdAt),
        ) ||
        reconciliations.some(
          (other) =>
            other.id !== reconciliation.id &&
            other.accountId === reconciliation.accountId &&
            other.createdAt > reconciliation.createdAt &&
            other.reconciliationDate <= reconciliation.reconciliationDate &&
            other.adjustmentAmount !== 0n,
        ),
    });
  }
  return accounts.map((account) => ({
    ...account,
    balance: balances.get(account.id) ?? account.openingBalance,
    lastReconciliation: latestByAccount.get(account.id) ?? null,
  }));
}

export async function createAccount(
  context: OwnerContext,
  input: {
    name: string;
    type: "bank" | "cash" | "ewallet";
    openingBalance: bigint;
    openingDate: Date;
  },
) {
  return getDatabase().$transaction(async (tx) => {
    const account = await tx.financialAccount.create({
      data: { workspaceId: context.workspaceId, ...input },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: context.workspaceId,
        actorId: context.actorId,
        entityType: "financial_account",
        entityId: account.id,
        action: "created",
        changedFields: ["name", "type", "opening_balance", "opening_date"],
      },
    });
    return account;
  });
}

export async function renameAccount(
  context: OwnerContext,
  input: { id: string; version: number; name: string },
) {
  return getDatabase().$transaction(async (tx) => {
    const updated = await tx.financialAccount.updateMany({
      where: {
        id: input.id,
        workspaceId: context.workspaceId,
        version: input.version,
        archivedAt: null,
      },
      data: { name: input.name, version: { increment: 1 } },
    });
    if (updated.count !== 1) throw new FinanceDomainError("ACCOUNT_CONFLICT");
    await tx.auditEvent.create({
      data: {
        workspaceId: context.workspaceId,
        actorId: context.actorId,
        entityType: "financial_account",
        entityId: input.id,
        action: "renamed",
        changedFields: ["name", "version"],
      },
    });
  });
}

export async function archiveAccount(
  context: OwnerContext,
  input: { id: string; version: number },
) {
  return getDatabase().$transaction(async (tx) => {
    const account = await tx.financialAccount.findFirst({
      where: {
        id: input.id,
        workspaceId: context.workspaceId,
        version: input.version,
        archivedAt: null,
      },
    });
    if (!account) throw new FinanceDomainError("ACCOUNT_CONFLICT");
    const activeTemplate = await tx.recurringTransactionTemplate.findFirst({
      where: {
        workspaceId: context.workspaceId,
        accountId: account.id,
        archivedAt: null,
      },
      select: { id: true },
    });
    if (activeTemplate) {
      throw new FinanceDomainError("ACCOUNT_RECURRING_ACTIVE");
    }
    const [transactions, adjustments] = await Promise.all([
      tx.transaction.findMany({
        where: { workspaceId: context.workspaceId, deletedAt: null },
        select: {
          type: true,
          amount: true,
          accountId: true,
          destinationAccountId: true,
        },
      }),
      tx.balanceReconciliation.findMany({
        where: {
          workspaceId: context.workspaceId,
          accountId: account.id,
          adjustmentAmount: { not: 0n },
        },
        select: { accountId: true, adjustmentAmount: true },
      }),
    ]);
    const balance = calculateAccountBalances(
      [account],
      transactions,
      adjustments.map((item) => ({
        accountId: item.accountId,
        amount: item.adjustmentAmount,
      })),
    ).get(account.id);
    if (balance !== 0n) throw new FinanceDomainError("ACCOUNT_NOT_ZERO");
    const updated = await tx.financialAccount.updateMany({
      where: {
        id: account.id,
        workspaceId: context.workspaceId,
        version: input.version,
        archivedAt: null,
      },
      data: { archivedAt: new Date(), version: { increment: 1 } },
    });
    if (updated.count !== 1) throw new FinanceDomainError("ACCOUNT_CONFLICT");
    await tx.auditEvent.create({
      data: {
        workspaceId: context.workspaceId,
        actorId: context.actorId,
        entityType: "financial_account",
        entityId: account.id,
        action: "archived",
        changedFields: ["archived_at", "version"],
      },
    });
  });
}
