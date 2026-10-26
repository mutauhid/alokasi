import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getDatabase } from "@/server/db/client";
import { createTransactionInTransaction } from "@/modules/transactions/service";
import { deliverPendingBudgetAlerts } from "./budget-alerts";
import { parseTelegramTransactionMessage } from "./parser";
import { suggestTelegramExpenseCategory } from "./category-suggestion";

type Access = {
  workspaceId: string;
  actorId: string;
  role: "owner" | "editor" | "viewer";
};
const linkLifetimeMs = 15 * 60 * 1000;
const draftLifetimeMs = 24 * 60 * 60 * 1000;

export class TelegramInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramInputError";
  }
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function requireWriter(role: Access["role"]) {
  if (role === "viewer")
    throw new TelegramInputError("Akun ini tidak dapat mencatat transaksi.");
}

function dateInTimezone(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return new Date(`${value.year}-${value.month}-${value.day}T00:00:00.000Z`);
}

export async function getTelegramSettings(access: Access) {
  const connection = await getDatabase().telegramConnection.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: access.workspaceId,
        userId: access.actorId,
      },
    },
  });
  if (!connection) return { configured: false as const };
  const [account, category, incomeCategory] = await Promise.all([
    getDatabase().financialAccount.findFirst({
      where: {
        id: connection.defaultAccountId,
        workspaceId: access.workspaceId,
      },
      select: { name: true },
    }),
    getDatabase().category.findFirst({
      where: {
        id: connection.defaultCategoryId,
        workspaceId: access.workspaceId,
      },
      select: { name: true },
    }),
    connection.defaultIncomeCategoryId
      ? getDatabase().category.findFirst({
          where: {
            id: connection.defaultIncomeCategoryId,
            workspaceId: access.workspaceId,
          },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);
  return {
    configured: true as const,
    linked: Boolean(connection.telegramUserId),
    accountId: connection.defaultAccountId,
    categoryId: connection.defaultCategoryId,
    accountName: account?.name ?? "Tidak tersedia",
    categoryName: category?.name ?? "Tidak tersedia",
    incomeCategoryId: connection.defaultIncomeCategoryId ?? undefined,
    incomeCategoryName: incomeCategory?.name ?? undefined,
    linkExpiresAt: connection.linkExpiresAt,
    budgetAlertsEnabled: connection.budgetAlertsEnabled,
    weeklySummaryEnabled: connection.weeklySummaryEnabled,
  };
}

export async function updateTelegramWeeklySummary(
  access: Access,
  enabled: boolean,
) {
  requireWriter(access.role);
  const db = getDatabase();
  await db.$transaction(async (tx) => {
    const connection = await tx.telegramConnection.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: access.workspaceId,
          userId: access.actorId,
        },
      },
      select: { id: true, telegramChatId: true },
    });
    if (!connection?.telegramChatId)
      throw new TelegramInputError(
        "Hubungkan Telegram sebelum mengaktifkan ringkasan mingguan.",
      );
    await tx.telegramConnection.update({
      where: { id: connection.id },
      data: { weeklySummaryEnabled: enabled },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: access.workspaceId,
        actorId: access.actorId,
        entityType: "telegram",
        entityId: connection.id,
        action: "weekly_summary_updated",
        changedFields: ["weekly_summary_enabled"],
      },
    });
  });
}

export async function updateTelegramBudgetAlerts(
  access: Access,
  enabled: boolean,
) {
  requireWriter(access.role);
  const db = getDatabase();
  await db.$transaction(async (tx) => {
    const connection = await tx.telegramConnection.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: access.workspaceId,
          userId: access.actorId,
        },
      },
      select: { id: true, telegramChatId: true },
    });
    if (!connection?.telegramChatId)
      throw new TelegramInputError(
        "Hubungkan Telegram sebelum mengaktifkan notifikasi budget.",
      );
    await tx.telegramConnection.update({
      where: { id: connection.id },
      data: { budgetAlertsEnabled: enabled },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: access.workspaceId,
        actorId: access.actorId,
        entityType: "telegram",
        entityId: connection.id,
        action: "budget_alerts_updated",
        changedFields: ["budget_alerts_enabled"],
      },
    });
  });
}

export async function configureTelegram(
  access: Access,
  accountId: string,
  categoryId: string,
  incomeCategoryId: string,
) {
  requireWriter(access.role);
  if (!accountId || !categoryId || !incomeCategoryId)
    throw new TelegramInputError(
      "Pilih akun serta kategori pengeluaran dan pemasukan yang aktif.",
    );
  const db = getDatabase();
  const [membership, account, category, incomeCategory] = await Promise.all([
    db.membership.findFirst({
      where: {
        workspaceId: access.workspaceId,
        userId: access.actorId,
        status: "active",
        role: { in: ["owner", "editor"] },
      },
      select: { id: true },
    }),
    db.financialAccount.findFirst({
      where: {
        workspaceId: access.workspaceId,
        id: accountId,
        archivedAt: null,
      },
      select: { id: true },
    }),
    db.category.findFirst({
      where: {
        workspaceId: access.workspaceId,
        id: categoryId,
        type: "expense",
        archivedAt: null,
      },
      select: { id: true },
    }),
    db.category.findFirst({
      where: {
        workspaceId: access.workspaceId,
        id: incomeCategoryId,
        type: "income",
        archivedAt: null,
      },
      select: { id: true },
    }),
  ]);
  if (!membership || !account || !category || !incomeCategory)
    throw new TelegramInputError(
      "Pilih akun serta kategori pengeluaran dan pemasukan yang aktif.",
    );
  const code = randomBytes(24).toString("base64url");
  await db.$transaction(async (tx) => {
    const existing = await tx.telegramConnection.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: access.workspaceId,
          userId: access.actorId,
        },
      },
      select: { id: true },
    });
    if (existing)
      await tx.telegramDraft.deleteMany({
        where: { connectionId: existing.id },
      });
    await tx.telegramConnection.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: access.workspaceId,
          userId: access.actorId,
        },
      },
      create: {
        workspaceId: access.workspaceId,
        userId: access.actorId,
        defaultAccountId: accountId,
        defaultCategoryId: categoryId,
        defaultIncomeCategoryId: incomeCategoryId,
        linkCodeHash: hash(code),
        linkExpiresAt: new Date(Date.now() + linkLifetimeMs),
      },
      update: {
        telegramUserId: null,
        telegramChatId: null,
        linkedAt: null,
        defaultAccountId: accountId,
        defaultCategoryId: categoryId,
        defaultIncomeCategoryId: incomeCategoryId,
        linkCodeHash: hash(code),
        linkExpiresAt: new Date(Date.now() + linkLifetimeMs),
      },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: access.workspaceId,
        actorId: access.actorId,
        entityType: "telegram",
        entityId: membership.id,
        action: "configured",
        changedFields: [
          "default_account_id",
          "default_category_id",
          "default_income_category_id",
        ],
      },
    });
  });
  return code;
}

export async function revokeTelegram(access: Access) {
  requireWriter(access.role);
  await getDatabase().$transaction(async (tx) => {
    const connection = await tx.telegramConnection.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: access.workspaceId,
          userId: access.actorId,
        },
      },
      select: { id: true },
    });
    if (!connection) return;
    await tx.telegramBudgetAlert.deleteMany({
      where: { connectionId: connection.id },
    });
    await tx.telegramDraft.deleteMany({
      where: { connectionId: connection.id },
    });
    await tx.telegramConnection.delete({ where: { id: connection.id } });
    await tx.auditEvent.create({
      data: {
        workspaceId: access.workspaceId,
        actorId: access.actorId,
        entityType: "telegram",
        entityId: connection.id,
        action: "revoked",
        changedFields: ["telegram_user_id"],
      },
    });
  });
}

export async function connectTelegram(
  code: string,
  telegramUserId: string,
  chatId: string,
) {
  if (!/^[A-Za-z0-9_-]{32}$/u.test(code)) return false;
  const db = getDatabase();
  const connection = await db.telegramConnection.findUnique({
    where: { linkCodeHash: hash(code) },
    include: { membership: { include: { user: true } } },
  });
  if (
    !connection ||
    !connection.linkExpiresAt ||
    connection.linkExpiresAt < new Date() ||
    connection.membership.status !== "active" ||
    connection.membership.role === "viewer" ||
    connection.membership.user.disabledAt
  )
    return false;
  try {
    const result = await db.telegramConnection.updateMany({
      where: {
        id: connection.id,
        linkCodeHash: hash(code),
        linkExpiresAt: { gt: new Date() },
      },
      data: {
        telegramUserId,
        telegramChatId: chatId,
        linkedAt: new Date(),
        linkCodeHash: null,
        linkExpiresAt: null,
      },
    });
    return result.count === 1;
  } catch {
    return false;
  }
}

export async function findTelegramConnection(
  telegramUserId: string,
  chatId: string,
) {
  return getDatabase().telegramConnection.findFirst({
    where: {
      telegramUserId,
      telegramChatId: chatId,
      linkedAt: { not: null },
      membership: {
        status: "active",
        role: { in: ["owner", "editor"] },
        user: { disabledAt: null },
      },
    },
    include: { workspace: { select: { timezone: true } } },
  });
}

function selectByHint<T extends { id: string; name: string }>(
  items: T[],
  hint: string,
) {
  const target = hint.toLocaleLowerCase("id-ID");
  const matches = items.filter((item) => {
    const name = item.name.toLocaleLowerCase("id-ID");
    return name === target || name.endsWith(` ${target}`);
  });
  if (matches.length !== 1)
    throw new TelegramInputError(
      `"${hint}" tidak cocok dengan tepat satu akun/kategori aktif. Periksa namanya lalu kirim ulang.`,
    );
  return matches[0];
}

export async function createTelegramDraft(
  connection: NonNullable<Awaited<ReturnType<typeof findTelegramConnection>>>,
  messageId: number,
  text: string,
) {
  const parsed = parseTelegramTransactionMessage(text);
  if (!parsed)
    throw new TelegramInputError(
      "Format belum terbaca. Contoh: beli kopi 25rb bca atau pemasukan: gaji 5jt bca",
    );
  const db = getDatabase();
  const existing = await db.telegramDraft.findUnique({
    where: {
      connectionId_sourceMessageId: {
        connectionId: connection.id,
        sourceMessageId: BigInt(messageId),
      },
    },
  });
  if (existing) return { draft: existing, created: false };
  const defaultCategoryId =
    parsed.type === "income"
      ? connection.defaultIncomeCategoryId
      : connection.defaultCategoryId;
  const [accounts, categories, history] = await Promise.all([
    db.financialAccount.findMany({
      where: { workspaceId: connection.workspaceId, archivedAt: null },
      select: { id: true, name: true },
    }),
    db.category.findMany({
      where: {
        workspaceId: connection.workspaceId,
        type: parsed.type,
        archivedAt: null,
      },
      select: { id: true, name: true },
    }),
    parsed.type === "expense"
      ? db.transaction.findMany({
          where: {
            workspaceId: connection.workspaceId,
            type: "expense",
            deletedAt: null,
            categoryId: { not: null },
            category: { archivedAt: null },
          },
          select: {
            title: true,
            categoryId: true,
            transactionDate: true,
          },
          orderBy: [
            { transactionDate: "desc" },
            { createdAt: "desc" },
            { id: "desc" },
          ],
          take: 100,
        })
      : Promise.resolve([]),
  ]);
  const account = parsed.accountHint
    ? selectByHint(accounts, parsed.accountHint)
    : accounts.find((item) => item.id === connection.defaultAccountId);
  if (!account)
    throw new TelegramInputError(
      "Akun default tidak aktif. Atur ulang dari Pengaturan Alokasi.",
    );
  const defaultCategory = categories.find(
    (category) => category.id === defaultCategoryId,
  );
  if (!defaultCategory)
    throw new TelegramInputError(
      `Kategori default ${parsed.type === "income" ? "pemasukan" : "pengeluaran"} belum diatur atau tidak aktif. Atur ulang dari Pengaturan Alokasi.`,
    );
  const category =
    parsed.type === "expense"
      ? (categories.find(
          (item) =>
            item.id ===
            suggestTelegramExpenseCategory({
              title: parsed.title,
              categories,
              history,
              defaultCategoryId: defaultCategory.id,
            }).categoryId,
        ) ?? defaultCategory)
      : defaultCategory;
  try {
    const draft = await db.telegramDraft.create({
      data: {
        connectionId: connection.id,
        sourceMessageId: BigInt(messageId),
        type: parsed.type,
        title: parsed.title,
        amount: parsed.amount,
        accountId: account.id,
        categoryId: category.id,
        transactionDate: dateInTimezone(
          new Date(),
          connection.workspace.timezone,
        ),
        expiresAt: new Date(Date.now() + draftLifetimeMs),
      },
    });
    return { draft, created: true };
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== "P2002"
    )
      throw error;
    const draft = await db.telegramDraft.findUniqueOrThrow({
      where: {
        connectionId_sourceMessageId: {
          connectionId: connection.id,
          sourceMessageId: BigInt(messageId),
        },
      },
    });
    return { draft, created: false };
  }
}

export async function getTelegramDraft(connectionId: string, draftId: string) {
  const db = getDatabase();
  const draft = await db.telegramDraft.findFirst({
    where: { id: draftId, connectionId },
    include: { connection: { select: { workspaceId: true } } },
  });
  if (!draft) return null;
  const [account, category] = await Promise.all([
    db.financialAccount.findFirst({
      where: { id: draft.accountId, workspaceId: draft.connection.workspaceId },
      select: { name: true },
    }),
    db.category.findFirst({
      where: {
        id: draft.categoryId,
        workspaceId: draft.connection.workspaceId,
      },
      select: { name: true },
    }),
  ]);
  return {
    ...draft,
    accountName: account?.name ?? "Tidak tersedia",
    categoryName: category?.name ?? "Tidak tersedia",
  };
}

export async function setTelegramEditPrompt(
  connectionId: string,
  draftId: string,
  promptMessageId: number,
) {
  return getDatabase().telegramDraft.updateMany({
    where: {
      id: draftId,
      connectionId,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    data: { editPromptMessageId: BigInt(promptMessageId) },
  });
}

export async function findDraftForReply(
  connectionId: string,
  promptMessageId: number,
) {
  return getDatabase().telegramDraft.findFirst({
    where: {
      connectionId,
      editPromptMessageId: BigInt(promptMessageId),
      status: "pending",
      expiresAt: { gt: new Date() },
    },
  });
}

export async function correctTelegramDraft(
  connection: NonNullable<Awaited<ReturnType<typeof findTelegramConnection>>>,
  draftId: string,
  text: string,
) {
  const db = getDatabase();
  const change = text.trim();
  const lower = change.toLocaleLowerCase("id-ID");
  const draft = await db.telegramDraft.findFirst({
    where: {
      id: draftId,
      connectionId: connection.id,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    select: { type: true },
  });
  if (!draft)
    throw new TelegramInputError(
      "Draf sudah kedaluwarsa atau selesai. Kirim transaksi baru.",
    );
  const data: {
    type?: "income" | "expense";
    title?: string;
    amount?: bigint;
    accountId?: string;
    categoryId?: string;
    note?: string | null;
    editPromptMessageId: null;
  } = { editPromptMessageId: null };
  if (lower.startsWith("judul:")) {
    const title = change.slice(6).trim().replace(/\s+/gu, " ");
    if (!title || title.length > 100)
      throw new TelegramInputError(
        "Judul wajib diisi dan maksimal 100 karakter.",
      );
    data.title = title;
  } else if (lower.startsWith("nominal:")) {
    const parsed = parseTelegramTransactionMessage(
      `x ${change.slice(8).trim()}`,
      draft.type === "income" ? "income" : "expense",
    );
    if (!parsed || parsed.accountHint)
      throw new TelegramInputError("Contoh koreksi nominal: nominal: 25rb");
    data.amount = parsed.amount;
  } else if (lower.startsWith("akun:") || lower.startsWith("kategori:")) {
    const isAccount = lower.startsWith("akun:");
    const hint = change.slice(isAccount ? 5 : 9).trim();
    const items = isAccount
      ? await db.financialAccount.findMany({
          where: { workspaceId: connection.workspaceId, archivedAt: null },
          select: { id: true, name: true },
        })
      : await db.category.findMany({
          where: {
            workspaceId: connection.workspaceId,
            type: draft.type,
            archivedAt: null,
          },
          select: { id: true, name: true },
        });
    const selected = selectByHint(items, hint);
    if (isAccount) data.accountId = selected.id;
    else data.categoryId = selected.id;
  } else if (lower.startsWith("catatan:")) {
    const note = change.slice(8).trim();
    if (note.length > 1000)
      throw new TelegramInputError("Catatan maksimal 1000 karakter.");
    data.note = note || null;
  } else {
    const parsed = parseTelegramTransactionMessage(
      change,
      draft.type === "income" ? "income" : "expense",
    );
    if (!parsed)
      throw new TelegramInputError(
        "Balas dengan satu koreksi, misalnya kategori: Transportasi, atau teks lengkap seperti pemasukan: gaji 5jt bca.",
      );
    if (parsed.type !== draft.type) {
      const defaultCategoryId =
        parsed.type === "income"
          ? connection.defaultIncomeCategoryId
          : connection.defaultCategoryId;
      const category = defaultCategoryId
        ? await db.category.findFirst({
            where: {
              id: defaultCategoryId,
              workspaceId: connection.workspaceId,
              type: parsed.type,
              archivedAt: null,
            },
            select: { id: true },
          })
        : null;
      if (!category)
        throw new TelegramInputError(
          `Kategori default ${parsed.type === "income" ? "pemasukan" : "pengeluaran"} belum diatur atau tidak aktif. Atur ulang dari Pengaturan Alokasi.`,
        );
      data.type = parsed.type;
      data.categoryId = category.id;
    }
    data.title = parsed.title;
    data.amount = parsed.amount;
    if (parsed.accountHint) {
      const accounts = await db.financialAccount.findMany({
        where: { workspaceId: connection.workspaceId, archivedAt: null },
        select: { id: true, name: true },
      });
      data.accountId = selectByHint(accounts, parsed.accountHint).id;
    }
  }
  const updated = await db.telegramDraft.updateMany({
    where: {
      id: draftId,
      connectionId: connection.id,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    data,
  });
  if (!updated.count)
    throw new TelegramInputError(
      "Draf sudah kedaluwarsa atau selesai. Kirim transaksi baru.",
    );
  return getTelegramDraft(connection.id, draftId);
}

export async function cancelTelegramDraft(
  connectionId: string,
  draftId: string,
) {
  return getDatabase().telegramDraft.updateMany({
    where: { id: draftId, connectionId, status: "pending" },
    data: { status: "cancelled", editPromptMessageId: null },
  });
}

export async function confirmTelegramDraft(
  connection: NonNullable<Awaited<ReturnType<typeof findTelegramConnection>>>,
  draftId: string,
  duplicateConfirmation?: string,
) {
  const db = getDatabase();
  const result = await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM app.telegram_drafts WHERE id = ${draftId}::uuid AND connection_id = ${connection.id}::uuid FOR UPDATE`;
      const draft = await tx.telegramDraft.findFirst({
        where: { id: draftId, connectionId: connection.id },
      });
      if (!draft) return "missing" as const;
      if (draft.status === "confirmed") return "already" as const;
      if (draft.status !== "pending" || draft.expiresAt < new Date())
        return "expired" as const;
      const membership = await tx.membership.findFirst({
        where: {
          workspaceId: connection.workspaceId,
          userId: connection.userId,
          status: "active",
          role: { in: ["owner", "editor"] },
          user: { disabledAt: null },
        },
        select: { role: true },
      });
      if (!membership) return "access" as const;
      const currentConnection = await tx.telegramConnection.findFirst({
        where: {
          id: connection.id,
          telegramUserId: connection.telegramUserId,
          telegramChatId: connection.telegramChatId,
        },
        select: { id: true },
      });
      if (!currentConnection) return "access" as const;
      const today = dateInTimezone(new Date(), connection.workspace.timezone);
      const transaction = await createTransactionInTransaction(
        tx,
        {
          workspaceId: connection.workspaceId,
          actorId: connection.userId,
          role: membership.role,
          today,
        },
        {
          type: draft.type,
          title: draft.title,
          amount: draft.amount,
          transactionDate: draft.transactionDate,
          accountId: draft.accountId,
          destinationAccountId: null,
          categoryId: draft.categoryId,
          note: draft.note,
          idempotencyKey: `telegram:${draft.id}`,
          duplicateConfirmation,
        },
      );
      await tx.telegramDraft.update({
        where: { id: draft.id },
        data: {
          status: "confirmed",
          transactionId: transaction.id,
          editPromptMessageId: null,
        },
      });
      return "created" as const;
    },
    { isolationLevel: "Serializable" },
  );
  if (result === "created" || result === "already") {
    await deliverPendingBudgetAlerts({
      workspaceId: connection.workspaceId,
      userId: connection.userId,
    });
  }
  return result;
}
