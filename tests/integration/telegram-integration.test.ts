import { randomUUID } from "node:crypto";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { getDatabase } from "../../src/server/db/client";
import { deleteWorkspaceData } from "../../src/modules/workspaces/delete-data";
import { createTransaction } from "../../src/modules/transactions/service";
import { PotentialDuplicateTransactionError } from "../../src/modules/transactions/duplicates";
import {
  configureTelegram,
  connectTelegram,
  correctTelegramDraft,
  createTelegramDraft,
  confirmTelegramDraft,
  findTelegramConnection,
  getTelegramSettings,
  getTelegramDraft,
  revokeTelegram,
  updateTelegramBudgetAlerts,
  updateTelegramRecurringReminders,
  updateTelegramWeeklySummary,
} from "../../src/modules/telegram-integration/service";
import { runTelegramRecurringReminders } from "../../src/modules/telegram-integration/recurring-reminders";
import { runTelegramWeeklySummaries } from "../../src/modules/telegram-integration/weekly-summary";
import {
  createPersonalCategoryRule,
  deletePersonalCategoryRule,
  listPersonalCategoryRules,
} from "../../src/modules/category-rules/service";

vi.mock("server-only", () => ({}));

let db: ReturnType<typeof getDatabase>;
let ownerId: string;
let workspaceId: string;
let mandiriId: string;
let bcaId: string;
let categoryId: string;
let incomeCategoryId: string;
let transportCategoryId: string;

beforeAll(() => {
  if (!process.env.TEST_DATABASE_URL)
    throw new Error(
      "TEST_DATABASE_URL wajib menunjuk PostgreSQL khusus test yang sudah dimigrasi.",
    );
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  db = getDatabase();
});

beforeEach(async () => {
  ownerId = randomUUID();
  await db.user.create({
    data: {
      id: ownerId,
      authSubject: randomUUID(),
      email: `telegram-${ownerId}@example.invalid`,
    },
  });
  const workspace = await db.workspace.create({
    data: {
      name: "Telegram test",
      type: "shared",
      timezone: "Asia/Jakarta",
      memberships: {
        create: { userId: ownerId, role: "owner", status: "active" },
      },
    },
  });
  workspaceId = workspace.id;
  const [mandiri, bca, category, incomeCategory, transportCategory] =
    await Promise.all([
      db.financialAccount.create({
        data: {
          workspaceId,
          name: "Mandiri",
          type: "bank",
          openingBalance: 0n,
          openingDate: new Date("2020-01-01T00:00:00.000Z"),
        },
      }),
      db.financialAccount.create({
        data: {
          workspaceId,
          name: "BCA",
          type: "bank",
          openingBalance: 0n,
          openingDate: new Date("2020-01-01T00:00:00.000Z"),
        },
      }),
      db.category.create({
        data: {
          workspaceId,
          name: "Belanja",
          nameKey: "belanja",
          type: "expense",
        },
      }),
      db.category.create({
        data: {
          workspaceId,
          name: "Gaji",
          nameKey: "gaji",
          type: "income",
        },
      }),
      db.category.create({
        data: {
          workspaceId,
          name: "Transportasi",
          nameKey: "transportasi",
          type: "expense",
        },
      }),
    ]);
  mandiriId = mandiri.id;
  bcaId = bca.id;
  categoryId = category.id;
  incomeCategoryId = incomeCategory.id;
  transportCategoryId = transportCategory.id;
});

afterEach(async () => {
  vi.restoreAllMocks();
  if (workspaceId)
    await db.$transaction((tx) => deleteWorkspaceData(tx, workspaceId));
  if (ownerId) await db.user.delete({ where: { id: ownerId } });
});

describe("Telegram expense integration", () => {
  it("uses only the current member personal category rule", async () => {
    const access = { workspaceId, actorId: ownerId, role: "owner" as const };
    const rule = await createPersonalCategoryRule(access, {
      keyword: "kopi spesial",
      categoryId: transportCategoryId,
    });
    await expect(
      createPersonalCategoryRule(access, {
        keyword: "  KOPI   SPESIAL ",
        categoryId,
      }),
    ).rejects.toThrow("DUPLICATE");
    const code = await configureTelegram(
      access,
      mandiriId,
      categoryId,
      incomeCategoryId,
    );
    await connectTelegram(code, "3030303030", "3030303030");
    const connection = await findTelegramConnection("3030303030", "3030303030");
    if (!connection) throw new Error("Connection missing");
    const result = await createTelegramDraft(
      connection,
      303,
      "beli kopi spesial 25rb",
    );
    expect(result.draft.categoryId).toBe(transportCategoryId);
    expect(await listPersonalCategoryRules(access)).toHaveLength(1);
    await deletePersonalCategoryRule(access, rule.id);
    expect(await listPersonalCategoryRules(access)).toEqual([]);
  });

  it("sends each opted-in recurring due occurrence only once", async () => {
    await expect(
      updateTelegramRecurringReminders(
        { workspaceId, actorId: ownerId, role: "owner" },
        true,
      ),
    ).rejects.toThrow("Hubungkan Telegram");
    const code = await configureTelegram(
      { workspaceId, actorId: ownerId, role: "owner" },
      mandiriId,
      categoryId,
      incomeCategoryId,
    );
    await connectTelegram(code, "2020202020", "2020202020");
    await updateTelegramRecurringReminders(
      { workspaceId, actorId: ownerId, role: "owner" },
      true,
    );
    const template = await db.recurringTransactionTemplate.create({
      data: {
        workspaceId,
        createdBy: ownerId,
        name: "Internet rumah",
        type: "expense",
        amount: 450_000n,
        accountId: mandiriId,
        categoryId,
        recurrenceDay: 26,
        nextDueDate: new Date("2026-10-26T00:00:00.000Z"),
      },
    });
    const originalToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    const send = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(Response.json({ ok: true, result: { message_id: 1 } })),
      );
    try {
      expect(
        await runTelegramRecurringReminders(
          new Date("2026-10-26T01:00:00.000Z"),
        ),
      ).toMatchObject({ sent: 1, failed: 0 });
      expect(
        await runTelegramRecurringReminders(
          new Date("2026-10-26T02:00:00.000Z"),
        ),
      ).toMatchObject({ sent: 0, skipped: 1 });
      expect(send).toHaveBeenCalledTimes(1);
      expect(await db.transaction.count({ where: { workspaceId } })).toBe(0);
      expect(
        await db.telegramRecurringReminder.findUniqueOrThrow({
          where: {
            connectionId_templateId_dueDate: {
              connectionId: (
                await db.telegramConnection.findUniqueOrThrow({
                  where: {
                    workspaceId_userId: { workspaceId, userId: ownerId },
                  },
                })
              ).id,
              templateId: template.id,
              dueDate: template.nextDueDate,
            },
          },
          select: { status: true },
        }),
      ).toEqual({ status: "sent" });
    } finally {
      if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
      else process.env.TELEGRAM_BOT_TOKEN = originalToken;
    }
  });

  it("sends one opted-in summary for a completed workspace week", async () => {
    await expect(
      updateTelegramWeeklySummary(
        { workspaceId, actorId: ownerId, role: "owner" },
        true,
      ),
    ).rejects.toThrow("Hubungkan Telegram");
    const code = await configureTelegram(
      { workspaceId, actorId: ownerId, role: "owner" },
      mandiriId,
      categoryId,
      incomeCategoryId,
    );
    await connectTelegram(code, "1010101010", "1010101010");
    await updateTelegramWeeklySummary(
      { workspaceId, actorId: ownerId, role: "owner" },
      true,
    );
    await Promise.all([
      db.transaction.create({
        data: {
          workspaceId,
          createdBy: ownerId,
          updatedBy: ownerId,
          type: "income",
          title: "Gaji",
          amount: 5_000_000n,
          transactionDate: new Date("2026-10-19T00:00:00.000Z"),
          accountId: mandiriId,
          categoryId: incomeCategoryId,
          idempotencyKey: "weekly-income",
          requestHash: "a".repeat(64),
        },
      }),
      db.transaction.create({
        data: {
          workspaceId,
          createdBy: ownerId,
          updatedBy: ownerId,
          type: "expense",
          title: "Bensin",
          amount: 50_000n,
          transactionDate: new Date("2026-10-25T00:00:00.000Z"),
          accountId: mandiriId,
          categoryId: transportCategoryId,
          idempotencyKey: "weekly-expense",
          requestHash: "b".repeat(64),
        },
      }),
    ]);
    const originalToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    const send = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(Response.json({ ok: true, result: { message_id: 1 } })),
      );
    try {
      expect(
        await runTelegramWeeklySummaries(new Date("2026-10-26T01:00:00.000Z")),
      ).toMatchObject({ sent: 1, failed: 0 });
      expect(
        await runTelegramWeeklySummaries(new Date("2026-10-26T02:00:00.000Z")),
      ).toMatchObject({ sent: 0, skipped: 1 });
      expect(send).toHaveBeenCalledTimes(1);
      expect(String(send.mock.calls[0]?.[1]?.body)).toContain(
        "Arus kas bersih: Rp4.950.000",
      );
      expect(
        await db.telegramConnection.findUniqueOrThrow({
          where: {
            workspaceId_userId: { workspaceId, userId: ownerId },
          },
          select: {
            weeklySummaryClaimedWeek: true,
            weeklySummarySentAt: true,
          },
        }),
      ).toMatchObject({
        weeklySummaryClaimedWeek: new Date("2026-10-19T00:00:00.000Z"),
      });
    } finally {
      if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
      else process.env.TELEGRAM_BOT_TOKEN = originalToken;
    }
  });

  it("warns about a recent duplicate and saves after explicit confirmation", async () => {
    const code = await configureTelegram(
      { workspaceId, actorId: ownerId, role: "owner" },
      mandiriId,
      categoryId,
      incomeCategoryId,
    );
    await connectTelegram(code, "6677889900", "6677889900");
    const connection = await findTelegramConnection("6677889900", "6677889900");
    if (!connection) throw new Error("Connection missing");
    const result = await createTelegramDraft(connection, 99, "beli kopi 25rb");
    await createTransaction(
      {
        workspaceId,
        actorId: ownerId,
        role: "owner",
        today: result.draft.transactionDate,
      },
      {
        type: "expense",
        title: result.draft.title,
        amount: result.draft.amount,
        transactionDate: result.draft.transactionDate,
        accountId: result.draft.accountId,
        destinationAccountId: null,
        categoryId: result.draft.categoryId,
        note: null,
        idempotencyKey: "existing-coffee",
      },
    );

    let warning: PotentialDuplicateTransactionError | undefined;
    try {
      await confirmTelegramDraft(connection, result.draft.id);
    } catch (error) {
      if (error instanceof PotentialDuplicateTransactionError) warning = error;
      else throw error;
    }
    expect(warning?.code).toBe("TRANSACTION_POSSIBLE_DUPLICATE");
    expect(warning?.candidate).toMatchObject({
      title: "beli kopi",
      amount: 25_000n,
      accountName: "Mandiri",
    });
    expect(
      await confirmTelegramDraft(
        connection,
        result.draft.id,
        warning?.confirmation,
      ),
    ).toBe("created");
    const sameTitleDifferentAmount = await createTelegramDraft(
      connection,
      100,
      "beli kopi 30rb",
    );
    expect(
      await confirmTelegramDraft(connection, sameTitleDifferentAmount.draft.id),
    ).toBe("created");
    expect(await db.transaction.count({ where: { workspaceId } })).toBe(3);
  });

  it("enables budget alerts only after the private bot connection is linked", async () => {
    await expect(
      updateTelegramBudgetAlerts(
        { workspaceId, actorId: ownerId, role: "owner" },
        true,
      ),
    ).rejects.toThrow("Hubungkan Telegram");
    const code = await configureTelegram(
      { workspaceId, actorId: ownerId, role: "owner" },
      mandiriId,
      categoryId,
      incomeCategoryId,
    );
    await connectTelegram(code, "1122334455", "1122334455");
    await updateTelegramBudgetAlerts(
      { workspaceId, actorId: ownerId, role: "owner" },
      true,
    );
    expect(
      await getTelegramSettings({
        workspaceId,
        actorId: ownerId,
        role: "owner",
      }),
    ).toMatchObject({ configured: true, budgetAlertsEnabled: true });
  });

  it("sends each crossed budget threshold only once", async () => {
    const code = await configureTelegram(
      { workspaceId, actorId: ownerId, role: "owner" },
      mandiriId,
      categoryId,
      incomeCategoryId,
    );
    await connectTelegram(code, "5566778899", "5566778899");
    await updateTelegramBudgetAlerts(
      { workspaceId, actorId: ownerId, role: "owner" },
      true,
    );
    const cycle = await db.cycleSetting.create({
      data: {
        workspaceId,
        startDay: 1,
        effectiveDate: new Date("2026-01-01T00:00:00.000Z"),
        version: 1,
      },
    });
    const period = await db.budgetPeriod.create({
      data: {
        workspaceId,
        startDate: new Date("2026-10-01T00:00:00.000Z"),
        endDateExclusive: new Date("2026-11-01T00:00:00.000Z"),
        cycleSettingVersion: cycle.version,
      },
    });
    await db.budget.create({
      data: {
        workspaceId,
        categoryId,
        categoryType: "expense",
        periodId: period.id,
        limitAmount: 100_000n,
      },
    });
    const originalToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    const send = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(Response.json({ ok: true, result: { message_id: 1 } })),
      );
    try {
      for (const [amount, key] of [
        [80_000n, "alert-80"],
        [1_000n, "still-80"],
        [19_000n, "alert-100"],
        [1_000n, "still-100"],
      ] as const) {
        await createTransaction(
          {
            workspaceId,
            actorId: ownerId,
            role: "owner",
            today: new Date("2026-10-31T00:00:00.000Z"),
          },
          {
            type: "expense",
            title: key,
            amount,
            transactionDate: new Date("2026-10-18T00:00:00.000Z"),
            accountId: mandiriId,
            destinationAccountId: null,
            categoryId,
            note: null,
            idempotencyKey: key,
          },
        );
      }
      expect(send).toHaveBeenCalledTimes(2);
      expect(
        await db.telegramBudgetAlert.findMany({
          where: { workspaceId },
          orderBy: { threshold: "asc" },
          select: { threshold: true, status: true },
        }),
      ).toEqual([
        { threshold: 80, status: "sent" },
        { threshold: 100, status: "sent" },
      ]);
    } finally {
      if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
      else process.env.TELEGRAM_BOT_TOKEN = originalToken;
    }
  });

  it("links one user, corrects a draft, and records only once after confirmation", async () => {
    const code = await configureTelegram(
      { workspaceId, actorId: ownerId, role: "owner" },
      mandiriId,
      categoryId,
      incomeCategoryId,
    );
    const stored = await db.telegramConnection.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId, userId: ownerId } },
    });
    expect(stored.linkCodeHash).not.toContain(code);
    expect(await connectTelegram(code, "123456789", "123456789")).toBe(true);
    expect(await connectTelegram(code, "123456789", "123456789")).toBe(false);
    const connection = await findTelegramConnection("123456789", "123456789");
    expect(connection).not.toBeNull();
    if (!connection) throw new Error("Connection missing");

    const first = await createTelegramDraft(
      connection,
      10,
      "beli kopi 25rb bca",
    );
    const retry = await createTelegramDraft(
      connection,
      10,
      "beli kopi 25rb bca",
    );
    expect(first.created).toBe(true);
    expect(retry.created).toBe(false);
    expect(first.draft.id).toBe(retry.draft.id);
    expect(first.draft.accountId).toBe(bcaId);
    expect(await db.transaction.count({ where: { workspaceId } })).toBe(0);

    await correctTelegramDraft(connection, first.draft.id, "nominal: 30rb");
    const corrected = await getTelegramDraft(connection.id, first.draft.id);
    expect(corrected?.amount).toBe(30000n);
    expect(await confirmTelegramDraft(connection, first.draft.id)).toBe(
      "created",
    );
    expect(await confirmTelegramDraft(connection, first.draft.id)).toBe(
      "already",
    );
    const transactions = await db.transaction.findMany({
      where: { workspaceId },
    });
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      type: "expense",
      title: "beli kopi",
      amount: 30000n,
      accountId: bcaId,
      categoryId,
    });
  });

  it("uses the default account and prevents a revoked connection from posting", async () => {
    const code = await configureTelegram(
      { workspaceId, actorId: ownerId, role: "owner" },
      mandiriId,
      categoryId,
      incomeCategoryId,
    );
    await connectTelegram(code, "987654321", "987654321");
    const connection = await findTelegramConnection("987654321", "987654321");
    if (!connection) throw new Error("Connection missing");
    const result = await createTelegramDraft(connection, 11, "beli kopi 25rb");
    expect(result.draft.accountId).toBe(mandiriId);
    await revokeTelegram({ workspaceId, actorId: ownerId, role: "owner" });
    expect(await findTelegramConnection("987654321", "987654321")).toBeNull();
    expect(await db.transaction.count({ where: { workspaceId } })).toBe(0);
  });

  it("records an income draft with jt shorthand and the income default category", async () => {
    const code = await configureTelegram(
      { workspaceId, actorId: ownerId, role: "owner" },
      mandiriId,
      categoryId,
      incomeCategoryId,
    );
    await connectTelegram(code, "246813579", "246813579");
    const connection = await findTelegramConnection("246813579", "246813579");
    if (!connection) throw new Error("Connection missing");

    const result = await createTelegramDraft(
      connection,
      12,
      "pemasukan: gaji 5jt bca",
    );
    expect(result.draft).toMatchObject({
      type: "income",
      title: "gaji",
      amount: 5_000_000n,
      accountId: bcaId,
      categoryId: incomeCategoryId,
    });
    expect(await confirmTelegramDraft(connection, result.draft.id)).toBe(
      "created",
    );
    const transaction = await db.transaction.findFirstOrThrow({
      where: { workspaceId },
    });
    expect(transaction).toMatchObject({
      type: "income",
      title: "gaji",
      amount: 5_000_000n,
      accountId: bcaId,
      categoryId: incomeCategoryId,
    });
  });

  it("suggests an expense category from keywords and then learns from history", async () => {
    const code = await configureTelegram(
      { workspaceId, actorId: ownerId, role: "owner" },
      mandiriId,
      categoryId,
      incomeCategoryId,
    );
    await connectTelegram(code, "135792468", "135792468");
    const connection = await findTelegramConnection("135792468", "135792468");
    if (!connection) throw new Error("Connection missing");

    const keywordDraft = await createTelegramDraft(
      connection,
      13,
      "beli bensin motor 40rb",
    );
    expect(keywordDraft.draft.categoryId).toBe(transportCategoryId);

    await db.transaction.create({
      data: {
        workspaceId,
        createdBy: ownerId,
        updatedBy: ownerId,
        type: "expense",
        title: "beli bensin motor",
        amount: 40_000n,
        transactionDate: new Date("2026-10-18T00:00:00.000Z"),
        accountId: mandiriId,
        categoryId,
        idempotencyKey: `history:${randomUUID()}`,
        requestHash: "a".repeat(64),
      },
    });
    const learnedDraft = await createTelegramDraft(
      connection,
      14,
      "beli bensin motor 45rb",
    );
    expect(learnedDraft.draft.categoryId).toBe(categoryId);
  });
});
