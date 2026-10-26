import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/server/db/client";
import { sendTelegramMessage } from "./bot-api";
import {
  budgetAlertMessage,
  budgetAlertThreshold,
} from "./budget-alert-domain";

type CreatedTransaction = {
  type: "income" | "expense" | "transfer";
  categoryId: string | null;
  transactionDate: Date;
};

export async function queueBudgetAlertForTransaction(
  tx: Prisma.TransactionClient,
  context: { workspaceId: string; actorId: string },
  transaction: CreatedTransaction,
) {
  if (transaction.type !== "expense" || !transaction.categoryId) return;
  const connection = await tx.telegramConnection.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: context.workspaceId,
        userId: context.actorId,
      },
    },
    select: {
      id: true,
      budgetAlertsEnabled: true,
      telegramChatId: true,
    },
  });
  if (!connection?.budgetAlertsEnabled || !connection.telegramChatId) return;

  const budget = await tx.budget.findFirst({
    where: {
      workspaceId: context.workspaceId,
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
      period: { select: { startDate: true, endDateExclusive: true } },
    },
  });
  if (!budget) return;

  const total = await tx.transaction.aggregate({
    where: {
      workspaceId: context.workspaceId,
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
  const actualAmount = total._sum.amount ?? 0n;
  const threshold = budgetAlertThreshold(actualAmount, budget.limitAmount);
  if (!threshold) return;

  await tx.telegramBudgetAlert.createMany({
    data: [
      {
        workspaceId: context.workspaceId,
        connectionId: connection.id,
        budgetId: budget.id,
        threshold,
        actualAmount,
        limitAmount: budget.limitAmount,
      },
    ],
    skipDuplicates: true,
  });
}

export async function deliverPendingBudgetAlerts(input: {
  workspaceId: string;
  userId: string;
}) {
  const db = getDatabase();
  try {
    const pending = await db.telegramBudgetAlert.findMany({
      where: {
        workspaceId: input.workspaceId,
        status: "pending",
        connection: {
          userId: input.userId,
          budgetAlertsEnabled: true,
          telegramChatId: { not: null },
        },
      },
      select: { id: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 4,
    });
    for (const item of pending) {
      const claimed = await db.telegramBudgetAlert.updateMany({
        where: { id: item.id, status: "pending" },
        data: { status: "sending", attemptedAt: new Date() },
      });
      if (claimed.count !== 1) continue;
      const alert = await db.telegramBudgetAlert.findUnique({
        where: { id: item.id },
        include: {
          connection: { select: { telegramChatId: true } },
          budget: {
            select: {
              category: { select: { name: true } },
              period: {
                select: { startDate: true, endDateExclusive: true },
              },
            },
          },
        },
      });
      if (!alert?.connection.telegramChatId) {
        await db.telegramBudgetAlert.update({
          where: { id: item.id },
          data: { status: "failed" },
        });
        continue;
      }
      try {
        await sendTelegramMessage(
          alert.connection.telegramChatId,
          budgetAlertMessage({
            categoryName: alert.budget.category.name,
            threshold: alert.threshold as 80 | 100,
            actualAmount: alert.actualAmount,
            limitAmount: alert.limitAmount,
            startDate: alert.budget.period.startDate,
            endDateExclusive: alert.budget.period.endDateExclusive,
          }),
        );
        await db.telegramBudgetAlert.update({
          where: { id: item.id },
          data: { status: "sent", sentAt: new Date() },
        });
      } catch {
        await db.telegramBudgetAlert.update({
          where: { id: item.id },
          data: { status: "failed" },
        });
      }
    }
  } catch {
    // A Telegram or alert-storage failure must never undo a valid transaction.
  }
}
