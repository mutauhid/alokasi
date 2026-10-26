import "server-only";

import { getDatabase } from "@/server/db/client";
import { sendTelegramMessage } from "./bot-api";
import {
  localCalendarDate,
  recurringReminderMessage,
} from "./recurring-reminder-domain";

export async function runTelegramRecurringReminders(now = new Date()) {
  const db = getDatabase();
  const connections = await db.telegramConnection.findMany({
    where: {
      recurringRemindersEnabled: true,
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
      userId: true,
      telegramChatId: true,
      membership: { select: { role: true } },
      workspace: { select: { name: true, timezone: true } },
    },
  });
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const connection of connections) {
    const today = localCalendarDate(now, connection.workspace.timezone);
    const templates = await db.recurringTransactionTemplate.findMany({
      where: {
        workspaceId: connection.workspaceId,
        archivedAt: null,
        nextDueDate: { lte: today },
        ...(connection.membership.role === "editor"
          ? { createdBy: connection.userId }
          : {}),
      },
      select: {
        id: true,
        name: true,
        type: true,
        amount: true,
        nextDueDate: true,
        account: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: [{ nextDueDate: "asc" }, { createdAt: "asc" }],
    });
    for (const template of templates) {
      const claim = await db.telegramRecurringReminder.createMany({
        data: {
          workspaceId: connection.workspaceId,
          connectionId: connection.id,
          templateId: template.id,
          dueDate: template.nextDueDate,
          status: "sending",
          attemptedAt: now,
        },
        skipDuplicates: true,
      });
      if (claim.count !== 1 || !connection.telegramChatId) {
        skipped += 1;
        continue;
      }
      try {
        await sendTelegramMessage(
          connection.telegramChatId,
          recurringReminderMessage({
            workspaceName: connection.workspace.name,
            name: template.name,
            type: template.type as "income" | "expense",
            amount: template.amount,
            dueDate: template.nextDueDate,
            accountName: template.account.name,
            categoryName: template.category.name,
          }),
        );
        await db.telegramRecurringReminder.update({
          where: {
            connectionId_templateId_dueDate: {
              connectionId: connection.id,
              templateId: template.id,
              dueDate: template.nextDueDate,
            },
          },
          data: { status: "sent", sentAt: new Date() },
        });
        sent += 1;
      } catch {
        await db.telegramRecurringReminder.updateMany({
          where: {
            connectionId: connection.id,
            templateId: template.id,
            dueDate: template.nextDueDate,
          },
          data: { status: "failed" },
        });
        failed += 1;
      }
    }
  }
  return { connections: connections.length, sent, failed, skipped };
}
