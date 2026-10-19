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
import {
  configureTelegram,
  connectTelegram,
  correctTelegramDraft,
  createTelegramDraft,
  confirmTelegramDraft,
  findTelegramConnection,
  getTelegramDraft,
  revokeTelegram,
} from "../../src/modules/telegram-integration/service";

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
  if (workspaceId)
    await db.$transaction((tx) => deleteWorkspaceData(tx, workspaceId));
  if (ownerId) await db.user.delete({ where: { id: ownerId } });
});

describe("Telegram expense integration", () => {
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
