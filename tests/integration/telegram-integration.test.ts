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
  const [mandiri, bca, category] = await Promise.all([
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
  ]);
  mandiriId = mandiri.id;
  bcaId = bca.id;
  categoryId = category.id;
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
});
