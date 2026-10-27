import "server-only";

import { previousCompletedWeek } from "@/modules/telegram-integration/weekly-summary-domain";
import { localCalendarDate } from "@/modules/telegram-integration/recurring-reminder-domain";
import { getDatabase } from "@/server/db/client";
import { queueWebPush, deliverPendingWebPush } from "./service";
import { refreshLowBalanceWebPush } from "./events";
import { debtReminderPhase } from "@/modules/debts/domain";

function rupiah(value: bigint) {
  return `Rp${new Intl.NumberFormat("id-ID").format(value)}`;
}

export async function runScheduledWebPush(now = new Date()) {
  const db = getDatabase();
  const preferences = await db.webPushPreference.findMany({
    where: {
      membership: { status: "active", user: { disabledAt: null } },
    },
    select: {
      workspaceId: true,
      userId: true,
      weeklySummaryEnabled: true,
      recurringRemindersEnabled: true,
      staleDraftsEnabled: true,
      lowBalanceEnabled: true,
      debtDueRemindersEnabled: true,
      membership: { select: { role: true } },
      workspace: { select: { name: true, timezone: true } },
    },
  });
  let queued = 0;
  await db.$transaction(async (tx) => {
    for (const preference of preferences) {
      if (preference.weeklySummaryEnabled) {
        const range = previousCompletedWeek(now, preference.workspace.timezone);
        if (range) {
          const transactions = await tx.transaction.findMany({
            where: {
              workspaceId: preference.workspaceId,
              deletedAt: null,
              transactionDate: { gte: range.start, lt: range.endExclusive },
            },
            select: { type: true, amount: true },
          });
          const income = transactions.reduce(
            (sum, item) => sum + (item.type === "income" ? item.amount : 0n),
            0n,
          );
          const expense = transactions.reduce(
            (sum, item) => sum + (item.type === "expense" ? item.amount : 0n),
            0n,
          );
          queued += await queueWebPush(tx, {
            workspaceId: preference.workspaceId,
            userId: preference.userId,
            type: "weekly_summary",
            dedupeKey: `weekly:${preference.workspaceId}:${range.start.toISOString().slice(0, 10)}`,
            tag: `weekly-${preference.workspaceId}`,
            title: `Ringkasan mingguan ${preference.workspace.name}`,
            body: `${transactions.length} transaksi · pemasukan ${rupiah(income)} · pengeluaran ${rupiah(expense)} · bersih ${rupiah(income - expense)}.`,
            url: `/reports?workspaceId=${encodeURIComponent(preference.workspaceId)}`,
            now,
          });
        }
      }

      if (
        preference.recurringRemindersEnabled &&
        (preference.membership.role === "owner" ||
          preference.membership.role === "editor")
      ) {
        const today = localCalendarDate(now, preference.workspace.timezone);
        const templates = await tx.recurringTransactionTemplate.findMany({
          where: {
            workspaceId: preference.workspaceId,
            archivedAt: null,
            nextDueDate: { lte: today },
            ...(preference.membership.role === "editor"
              ? { createdBy: preference.userId }
              : {}),
          },
          select: { id: true, name: true, amount: true, nextDueDate: true },
        });
        for (const template of templates) {
          queued += await queueWebPush(tx, {
            workspaceId: preference.workspaceId,
            userId: preference.userId,
            type: "recurring_reminder",
            dedupeKey: `recurring:${template.id}:${template.nextDueDate.toISOString().slice(0, 10)}`,
            tag: `recurring-${template.id}`,
            title: "Transaksi berulang jatuh tempo",
            body: `${template.name} · ${rupiah(template.amount)}. Catat atau lewati secara eksplisit.`,
            url: `/transactions/reminders?workspaceId=${encodeURIComponent(preference.workspaceId)}`,
            now,
          });
        }
      }

      if (preference.staleDraftsEnabled) {
        const staleBefore = new Date(now.valueOf() - 24 * 60 * 60 * 1000);
        const [receiptDrafts, telegramDrafts] = await Promise.all([
          tx.receiptDraft.findMany({
            where: {
              workspaceId: preference.workspaceId,
              createdBy: preference.userId,
              status: "needs_review",
              createdAt: { lte: staleBefore },
            },
            select: { id: true, createdAt: true },
          }),
          tx.telegramDraft.findMany({
            where: {
              connection: {
                workspaceId: preference.workspaceId,
                userId: preference.userId,
              },
              status: "pending",
              createdAt: { lte: staleBefore },
              expiresAt: { gt: now },
            },
            select: { id: true, createdAt: true },
          }),
        ]);
        for (const draft of receiptDrafts) {
          queued += await queueWebPush(tx, {
            workspaceId: preference.workspaceId,
            userId: preference.userId,
            type: "stale_draft",
            dedupeKey: `receipt-draft:${draft.id}:24h`,
            tag: `draft-${draft.id}`,
            title: "Draf iPhone belum dikonfirmasi",
            body: "Periksa hasil OCR lalu simpan atau batalkan draf pengeluaran.",
            url: `/transactions?workspaceId=${encodeURIComponent(preference.workspaceId)}`,
            now,
          });
        }
        for (const draft of telegramDrafts) {
          queued += await queueWebPush(tx, {
            workspaceId: preference.workspaceId,
            userId: preference.userId,
            type: "stale_draft",
            dedupeKey: `telegram-draft:${draft.id}:24h`,
            tag: `draft-${draft.id}`,
            title: "Draf Telegram belum dikonfirmasi",
            body: "Buka Telegram untuk menyimpan, mengoreksi, atau membatalkan draf.",
            url: `/settings?workspaceId=${encodeURIComponent(preference.workspaceId)}&view=automation`,
            now,
          });
        }
      }

      if (preference.debtDueRemindersEnabled) {
        const today = localCalendarDate(now, preference.workspace.timezone);
        const inThreeDays = new Date(today.valueOf() + 3 * 86_400_000);
        const records = await tx.debtRecord.findMany({
          where: {
            workspaceId: preference.workspaceId,
            dueDate: { gte: today, lte: inThreeDays },
          },
          select: {
            id: true,
            kind: true,
            counterparty: true,
            title: true,
            principalAmount: true,
            dueDate: true,
            payments: { select: { amount: true } },
          },
        });
        for (const record of records) {
          if (!record.dueDate) continue;
          const paid = record.payments.reduce(
            (sum, payment) => sum + payment.amount,
            0n,
          );
          const outstanding = record.principalAmount - paid;
          const phase = debtReminderPhase(record.dueDate, today, outstanding);
          if (!phase) continue;
          queued += await queueWebPush(tx, {
            workspaceId: preference.workspaceId,
            userId: preference.userId,
            type: "debt_due",
            dedupeKey: `debt:${record.id}:${phase}`,
            tag: `debt-${record.id}`,
            title:
              phase === "due"
                ? `${record.kind === "debt" ? "Utang" : "Piutang"} jatuh tempo hari ini`
                : `${record.kind === "debt" ? "Utang" : "Piutang"} jatuh tempo dalam 3 hari`,
            body: `${record.title} · ${record.counterparty} · sisa ${rupiah(outstanding)}.`,
            url: `/debts?workspaceId=${encodeURIComponent(preference.workspaceId)}`,
            now,
          });
        }
      }
    }
  });

  const lowBalanceWorkspaces = [
    ...new Set(
      preferences
        .filter((preference) => preference.lowBalanceEnabled)
        .map((preference) => preference.workspaceId),
    ),
  ];
  for (const workspaceId of lowBalanceWorkspaces) {
    await refreshLowBalanceWebPush(workspaceId);
  }
  const delivery = await deliverPendingWebPush(100, now);
  return { preferences: preferences.length, queued, ...delivery };
}
