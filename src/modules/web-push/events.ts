import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { calculateAccountBalances } from "@/modules/finance/domain";
import { budgetAlertThreshold } from "@/modules/telegram-integration/budget-alert-domain";
import { getDatabase } from "@/server/db/client";
import { queueWebPush, safelyDeliverWebPush } from "./service";
import { debtBalanceAdjustments } from "@/modules/debts/domain";

type TransactionEvent = {
  id: string;
  type: "income" | "expense" | "transfer";
  title: string;
  amount: bigint;
  categoryId: string | null;
  transactionDate: Date;
  version: number;
};

function rupiah(value: bigint) {
  return `Rp${new Intl.NumberFormat("id-ID").format(value)}`;
}

export async function queueBudgetWebPush(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  transaction: Pick<
    TransactionEvent,
    "type" | "categoryId" | "transactionDate"
  >,
) {
  if (transaction.type !== "expense" || !transaction.categoryId) return;
  const budget = await tx.budget.findFirst({
    where: {
      workspaceId,
      categoryId: transaction.categoryId,
      categoryType: "expense",
      period: {
        startDate: { lte: transaction.transactionDate },
        endDateExclusive: { gt: transaction.transactionDate },
      },
    },
    select: {
      id: true,
      limitAmount: true,
      category: { select: { name: true } },
      period: { select: { startDate: true, endDateExclusive: true } },
    },
  });
  if (!budget) return;
  const total = await tx.transaction.aggregate({
    where: {
      workspaceId,
      type: "expense",
      categoryId: transaction.categoryId,
      deletedAt: null,
      transactionDate: {
        gte: budget.period.startDate,
        lt: budget.period.endDateExclusive,
      },
    },
    _sum: { amount: true },
  });
  const actual = total._sum.amount ?? 0n;
  const threshold = budgetAlertThreshold(actual, budget.limitAmount);
  if (!threshold) return;
  const recipients = await tx.webPushPreference.findMany({
    where: {
      workspaceId,
      budgetAlertsEnabled: true,
      membership: { status: "active" },
    },
    select: { userId: true },
  });
  for (const recipient of recipients) {
    await queueWebPush(tx, {
      workspaceId,
      userId: recipient.userId,
      type: "budget_alert",
      dedupeKey: `budget:${budget.id}:${threshold}`,
      tag: `budget-${budget.id}`,
      title: threshold === 100 ? "Budget telah habis" : "Budget hampir habis",
      body: `${budget.category.name}: ${rupiah(actual)} dari ${rupiah(budget.limitAmount)} (${threshold}%).`,
      url: `/budgets?workspaceId=${encodeURIComponent(workspaceId)}`,
    });
  }
}

export async function queueSharedActivityWebPush(
  tx: Prisma.TransactionClient,
  input: {
    workspaceId: string;
    actorId: string;
    action: "created" | "updated" | "deleted";
    transaction: TransactionEvent;
  },
) {
  const workspace = await tx.workspace.findUnique({
    where: { id: input.workspaceId },
    select: { type: true },
  });
  if (workspace?.type !== "shared") return;
  const [actor, recipients] = await Promise.all([
    tx.user.findUnique({
      where: { id: input.actorId },
      select: { displayName: true, email: true },
    }),
    tx.webPushPreference.findMany({
      where: {
        workspaceId: input.workspaceId,
        userId: { not: input.actorId },
        sharedActivityEnabled: true,
        membership: { status: "active" },
      },
      select: { userId: true },
    }),
  ]);
  const actorName =
    actor?.displayName || actor?.email?.split("@")[0] || "Anggota";
  const verb =
    input.action === "created"
      ? "menambahkan"
      : input.action === "updated"
        ? "mengubah"
        : "menghapus";
  for (const recipient of recipients) {
    await queueWebPush(tx, {
      workspaceId: input.workspaceId,
      userId: recipient.userId,
      type: "shared_activity",
      dedupeKey: `transaction:${input.transaction.id}:${input.action}:${input.transaction.version}`,
      tag: `transaction-${input.transaction.id}`,
      title: "Aktivitas ruang bersama",
      body: `${actorName} ${verb} transaksi “${input.transaction.title}” senilai ${rupiah(input.transaction.amount)}.`,
      url: `/transactions?workspaceId=${encodeURIComponent(input.workspaceId)}`,
    });
  }
}

export async function refreshLowBalanceWebPush(workspaceId: string) {
  const db = getDatabase();
  const [
    accounts,
    transactions,
    reconciliations,
    debtRecords,
    debtPayments,
    preferences,
  ] = await Promise.all([
    db.financialAccount.findMany({
      where: { workspaceId, archivedAt: null },
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
    db.balanceReconciliation.findMany({
      where: { workspaceId, adjustmentAmount: { not: 0n } },
      select: { accountId: true, adjustmentAmount: true },
    }),
    db.debtRecord.findMany({
      where: { workspaceId, origin: "current", accountId: { not: null } },
      select: {
        kind: true,
        origin: true,
        principalAmount: true,
        accountId: true,
      },
    }),
    db.debtPayment.findMany({
      where: { workspaceId },
      select: {
        amount: true,
        accountId: true,
        debtRecord: { select: { kind: true } },
      },
    }),
    db.webPushPreference.findMany({
      where: {
        workspaceId,
        lowBalanceEnabled: true,
        lowBalanceThreshold: { not: null },
        membership: { status: "active" },
      },
      select: { userId: true, lowBalanceThreshold: true },
    }),
  ]);
  if (preferences.length === 0 || accounts.length === 0) return;
  const balances = calculateAccountBalances(accounts, transactions, [
    ...reconciliations.map((item) => ({
      accountId: item.accountId,
      amount: item.adjustmentAmount,
    })),
    ...debtBalanceAdjustments(
      debtRecords,
      debtPayments.map((payment) => ({
        kind: payment.debtRecord.kind,
        amount: payment.amount,
        accountId: payment.accountId,
      })),
    ),
  ]);
  await db.$transaction(async (tx) => {
    for (const preference of preferences) {
      const threshold = preference.lowBalanceThreshold;
      if (!threshold) continue;
      for (const account of accounts) {
        const balance = balances.get(account.id) ?? account.openingBalance;
        const isBelow = balance < threshold;
        const state = await tx.webPushLowBalanceState.findUnique({
          where: {
            workspaceId_userId_accountId: {
              workspaceId,
              userId: preference.userId,
              accountId: account.id,
            },
          },
        });
        if (isBelow && !state?.isBelow) {
          const transition = new Date();
          await queueWebPush(tx, {
            workspaceId,
            userId: preference.userId,
            type: "low_balance",
            dedupeKey: `low-balance:${account.id}:${transition.toISOString()}`,
            tag: `low-balance-${account.id}`,
            title: `Saldo ${account.name} menipis`,
            body: `Saldo tercatat ${rupiah(balance)}, di bawah batas ${rupiah(threshold)}.`,
            url: `/accounts?workspaceId=${encodeURIComponent(workspaceId)}`,
            now: transition,
          });
          await tx.webPushLowBalanceState.upsert({
            where: {
              workspaceId_userId_accountId: {
                workspaceId,
                userId: preference.userId,
                accountId: account.id,
              },
            },
            create: {
              workspaceId,
              userId: preference.userId,
              accountId: account.id,
              isBelow: true,
              lastNotifiedAt: transition,
            },
            update: { isBelow: true, lastNotifiedAt: transition },
          });
        } else if (!isBelow && state?.isBelow) {
          await tx.webPushLowBalanceState.update({
            where: { id: state.id },
            data: { isBelow: false },
          });
        } else if (!state) {
          await tx.webPushLowBalanceState.create({
            data: {
              workspaceId,
              userId: preference.userId,
              accountId: account.id,
              isBelow,
            },
          });
        }
      }
    }
  });
}

export async function safelyRefreshAndDeliverWebPush(workspaceId: string) {
  try {
    await refreshLowBalanceWebPush(workspaceId);
    await safelyDeliverWebPush({ workspaceId });
  } catch {
    // Notification bookkeeping must never change a completed financial result.
  }
}
