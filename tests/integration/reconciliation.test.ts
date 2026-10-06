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
import { listAccounts } from "../../src/modules/accounts/service";
import { deleteWorkspaceData } from "../../src/modules/workspaces/delete-data";
import { createBalanceReconciliation } from "../../src/modules/reconciliations/service";
import { exportWorkspaceJson } from "../../src/modules/reports/service";
import { getDatabase } from "../../src/server/db/client";

vi.mock("server-only", () => ({}));

const connectionString = process.env.TEST_DATABASE_URL;
let db: ReturnType<typeof getDatabase>;
let workspaceId: string;
let ownerId: string;
let editorId: string;
let viewerId: string;
let accountId: string;
let incomeCategoryId: string;
let expenseCategoryId: string;

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
  ownerId = randomUUID();
  editorId = randomUUID();
  viewerId = randomUUID();
  await db.user.createMany({
    data: [ownerId, editorId, viewerId].map((id, index) => ({
      id,
      authSubject: randomUUID(),
      email: `reconciliation-${index}-${id}@example.invalid`,
    })),
  });
  const workspace = await db.workspace.create({
    data: {
      name: "Reconciliation fixture",
      type: "shared",
      memberships: {
        create: [
          { userId: ownerId, role: "owner", status: "active" },
          { userId: editorId, role: "editor", status: "active" },
          { userId: viewerId, role: "viewer", status: "active" },
        ],
      },
    },
  });
  workspaceId = workspace.id;
  const account = await db.financialAccount.create({
    data: {
      workspaceId,
      name: "BCA utama",
      type: "bank",
      openingBalance: 1_000_000n,
      openingDate: new Date("2026-10-01T00:00:00.000Z"),
    },
  });
  accountId = account.id;
  const categories = await Promise.all([
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
        name: "Biaya",
        nameKey: "biaya",
        type: "expense",
      },
    }),
  ]);
  incomeCategoryId = categories[0].id;
  expenseCategoryId = categories[1].id;
  await db.transaction.create({
    data: {
      workspaceId,
      createdBy: ownerId,
      updatedBy: ownerId,
      type: "income",
      title: "Gaji",
      amount: 500_000n,
      transactionDate: new Date("2026-10-02T00:00:00.000Z"),
      accountId,
      categoryId: incomeCategoryId,
      idempotencyKey: randomUUID(),
      requestHash: "a".repeat(64),
    },
  });
});

afterEach(async () => {
  if (workspaceId) {
    await db.$transaction((tx) => deleteWorkspaceData(tx, workspaceId));
  }
  await db.user.deleteMany({
    where: { id: { in: [ownerId, editorId, viewerId] } },
  });
});

describe("balance reconciliation service", () => {
  it("records a match, applies one explicit adjustment, and preserves cash-flow transactions", async () => {
    const context = {
      workspaceId,
      actorId: ownerId,
      role: "owner" as const,
      today: new Date("2026-10-06T00:00:00.000Z"),
    };
    const matched = await createBalanceReconciliation(context, {
      accountId,
      actualBalance: 1_500_000n,
      reconciliationDate: context.today,
      resolution: "matched",
      note: "Cocok dengan rekening",
      idempotencyKey: "matched-once",
    });
    expect(matched.difference).toBe(0n);
    expect(matched.adjustmentAmount).toBe(0n);

    const adjustedInput = {
      accountId,
      actualBalance: 1_450_000n,
      reconciliationDate: context.today,
      resolution: "adjusted" as const,
      note: "Selisih tidak ditemukan",
      idempotencyKey: "adjusted-once",
    };
    const adjusted = await createBalanceReconciliation(
      { ...context, actorId: editorId, role: "editor" },
      adjustedInput,
    );
    const retry = await createBalanceReconciliation(
      { ...context, actorId: editorId, role: "editor" },
      adjustedInput,
    );
    expect(retry.id).toBe(adjusted.id);
    expect(adjusted.difference).toBe(-50_000n);
    expect(adjusted.adjustmentAmount).toBe(-50_000n);
    expect(
      await db.balanceReconciliation.count({ where: { workspaceId } }),
    ).toBe(2);
    expect(await db.transaction.count({ where: { workspaceId } })).toBe(1);
    expect((await listAccounts(workspaceId))[0].balance).toBe(1_450_000n);

    const exported = JSON.parse((await exportWorkspaceJson(workspaceId))!) as {
      schemaVersion: number;
      balanceReconciliations: Array<{
        adjustmentAmount: string;
        idempotencyKey?: string;
        requestHash?: string;
      }>;
    };
    expect(exported.schemaVersion).toBe(4);
    expect(exported.balanceReconciliations).toHaveLength(2);
    expect(exported.balanceReconciliations[1]).toEqual(
      expect.objectContaining({ adjustmentAmount: "-50000" }),
    );
    expect(exported.balanceReconciliations[1].idempotencyKey).toBeUndefined();
    expect(exported.balanceReconciliations[1].requestHash).toBeUndefined();
  });

  it("rejects Viewer mutations and marks a reconciliation stale after a backdated transaction", async () => {
    const reconciliation = await createBalanceReconciliation(
      {
        workspaceId,
        actorId: ownerId,
        role: "owner",
        today: new Date("2026-10-06T00:00:00.000Z"),
      },
      {
        accountId,
        actualBalance: 1_500_000n,
        reconciliationDate: new Date("2026-10-06T00:00:00.000Z"),
        resolution: "matched",
        note: null,
        idempotencyKey: "before-backdated",
      },
    );
    await expect(
      createBalanceReconciliation(
        {
          workspaceId,
          actorId: viewerId,
          role: "viewer",
          today: new Date("2026-10-06T00:00:00.000Z"),
        },
        {
          accountId,
          actualBalance: 1_500_000n,
          reconciliationDate: new Date("2026-10-06T00:00:00.000Z"),
          resolution: "matched",
          note: null,
          idempotencyKey: "viewer-denied",
        },
      ),
    ).rejects.toMatchObject({ code: "RECONCILIATION_ACCESS_DENIED" });

    const changedAt = new Date(reconciliation.createdAt.valueOf() + 1_000);
    await db.transaction.create({
      data: {
        workspaceId,
        createdBy: ownerId,
        updatedBy: ownerId,
        type: "expense",
        title: "Biaya terlambat dicatat",
        amount: 10_000n,
        transactionDate: new Date("2026-10-05T00:00:00.000Z"),
        accountId,
        categoryId: expenseCategoryId,
        idempotencyKey: randomUUID(),
        requestHash: "b".repeat(64),
        createdAt: changedAt,
        updatedAt: changedAt,
      },
    });

    const account = (await listAccounts(workspaceId))[0];
    expect(account.balance).toBe(1_490_000n);
    expect(account.lastReconciliation?.needsReview).toBe(true);
  });
});
