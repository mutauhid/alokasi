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
import { deleteWorkspaceData } from "../../src/modules/workspaces/delete-data";
import {
  getNotificationInbox,
  markNotificationRead,
} from "../../src/modules/web-push/in-app";
import { queueWebPush } from "../../src/modules/web-push/service";
import { getDatabase } from "../../src/server/db/client";

vi.mock("server-only", () => ({}));

const connectionString = process.env.TEST_DATABASE_URL;
let db: ReturnType<typeof getDatabase>;
let workspaceId: string;
let userId: string;

beforeAll(() => {
  if (!connectionString) {
    throw new Error(
      "TEST_DATABASE_URL wajib menunjuk PostgreSQL khusus test yang sudah dimigrasi.",
    );
  }
  process.env.DATABASE_URL = connectionString;
  db = getDatabase();
});

beforeEach(async () => {
  userId = randomUUID();
  await db.user.create({
    data: {
      id: userId,
      authSubject: randomUUID(),
      email: `${userId}@example.invalid`,
    },
  });
  const workspace = await db.workspace.create({
    data: {
      name: "Notification fixture",
      type: "personal",
      personalOwnerId: userId,
      memberships: {
        create: { userId, role: "owner", status: "active" },
      },
      webPushPreferences: {
        create: { userId, debtDueRemindersEnabled: true },
      },
    },
  });
  workspaceId = workspace.id;
});

afterEach(async () => {
  if (workspaceId) {
    await db.$transaction((tx) => deleteWorkspaceData(tx, workspaceId));
  }
  await db.user.deleteMany({ where: { id: userId } });
});

describe("in-app notification inbox", () => {
  it("stores one user notification without requiring a push subscription", async () => {
    const message = {
      workspaceId,
      userId,
      type: "debt_due" as const,
      dedupeKey: "debt:test:due",
      tag: "debt-test",
      title: "Utang jatuh tempo hari ini",
      body: "Pinjaman · sisa Rp100.000.",
      url: `/debts?workspaceId=${workspaceId}`,
      now: new Date("2026-11-02T02:00:00.000Z"),
    };

    expect(await db.$transaction((tx) => queueWebPush(tx, message))).toBe(0);
    expect(await db.$transaction((tx) => queueWebPush(tx, message))).toBe(0);

    const access = {
      workspaceId,
      actorId: userId,
      role: "owner" as const,
      timezone: "Asia/Jakarta",
      workspaceType: "personal" as const,
    };
    const inbox = await getNotificationInbox(access);
    expect(inbox.unreadCount).toBe(1);
    expect(inbox.items).toEqual([
      expect.objectContaining({
        type: "debt_due",
        title: "Utang jatuh tempo hari ini",
        readAt: null,
      }),
    ]);

    await markNotificationRead(access, inbox.items[0].id);
    expect((await getNotificationInbox(access)).unreadCount).toBe(0);
  });
});
