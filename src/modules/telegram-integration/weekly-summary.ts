import "server-only";

import { getDatabase } from "@/server/db/client";
import { sendTelegramMessage } from "./bot-api";
import {
  previousCompletedWeek,
  weeklySummaryMessage,
} from "./weekly-summary-domain";

export async function runTelegramWeeklySummaries(now = new Date()) {
  const db = getDatabase();
  const connections = await db.telegramConnection.findMany({
    where: {
      weeklySummaryEnabled: true,
      telegramChatId: { not: null },
      membership: {
        status: "active",
        role: { in: ["owner", "editor"] },
        user: { disabledAt: null },
      },
    },
    select: {
      id: true,
      workspaceId: true,
      telegramChatId: true,
      workspace: { select: { name: true, timezone: true } },
    },
  });
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const connection of connections) {
    const range = previousCompletedWeek(now, connection.workspace.timezone);
    if (!range) {
      skipped += 1;
      continue;
    }
    const claimed = await db.telegramConnection.updateMany({
      where: {
        id: connection.id,
        weeklySummaryEnabled: true,
        OR: [
          { weeklySummaryClaimedWeek: null },
          { weeklySummaryClaimedWeek: { not: range.start } },
        ],
      },
      data: { weeklySummaryClaimedWeek: range.start },
    });
    if (claimed.count !== 1 || !connection.telegramChatId) {
      skipped += 1;
      continue;
    }
    try {
      const transactions = await db.transaction.findMany({
        where: {
          workspaceId: connection.workspaceId,
          deletedAt: null,
          transactionDate: { gte: range.start, lt: range.endExclusive },
        },
        select: {
          type: true,
          amount: true,
          category: { select: { name: true } },
        },
      });
      let income = 0n;
      let expense = 0n;
      const categories = new Map<string, bigint>();
      for (const transaction of transactions) {
        if (transaction.type === "income") income += transaction.amount;
        if (transaction.type === "expense") {
          expense += transaction.amount;
          const name = transaction.category?.name ?? "Tanpa kategori";
          categories.set(
            name,
            (categories.get(name) ?? 0n) + transaction.amount,
          );
        }
      }
      const topCategory = [...categories.entries()]
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) =>
          a.amount === b.amount ? 0 : a.amount > b.amount ? -1 : 1,
        )[0];
      await sendTelegramMessage(
        connection.telegramChatId,
        weeklySummaryMessage({
          workspaceName: connection.workspace.name,
          range,
          income,
          expense,
          transactionCount: transactions.length,
          topCategory,
        }),
      );
      await db.telegramConnection.update({
        where: { id: connection.id },
        data: { weeklySummarySentAt: new Date() },
      });
      sent += 1;
    } catch {
      failed += 1;
    }
  }
  return { candidates: connections.length, sent, failed, skipped };
}
