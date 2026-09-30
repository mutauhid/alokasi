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
  const [accounts, transactions] = await Promise.all([
    db.financialAccount.findMany({
      where: { workspaceId },
      orderBy: [{ archivedAt: "asc" }, { createdAt: "asc" }],
    }),
    db.transaction.findMany({
      where: { workspaceId, deletedAt: null },
      select: {
        type: true,
        amount: true,
        accountId: true,
        destinationAccountId: true,
      },
    }),
  ]);
  const balances = calculateAccountBalances(accounts, transactions);
  return accounts.map((account) => ({
    ...account,
    balance: balances.get(account.id) ?? account.openingBalance,
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
    const transactions = await tx.transaction.findMany({
      where: { workspaceId: context.workspaceId, deletedAt: null },
      select: {
        type: true,
        amount: true,
        accountId: true,
        destinationAccountId: true,
      },
    });
    const balance = calculateAccountBalances([account], transactions).get(
      account.id,
    );
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
