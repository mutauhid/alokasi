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
import {
  commitTransactionImport,
  previewTransactionImport,
} from "../../src/modules/imports/service";
import { exportWorkspaceJson } from "../../src/modules/reports/service";
import { deleteWorkspaceData } from "../../src/modules/workspaces/delete-data";
import { getDatabase } from "../../src/server/db/client";

vi.mock("server-only", () => ({}));

const connectionString = process.env.TEST_DATABASE_URL;
let db: ReturnType<typeof getDatabase>;
let workspaceId: string;
let ownerId: string;
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
  viewerId = randomUUID();
  await db.user.createMany({
    data: [ownerId, viewerId].map((id, index) => ({
      id,
      authSubject: randomUUID(),
      email: `csv-import-${index}-${id}@example.invalid`,
    })),
  });
  const workspace = await db.workspace.create({
    data: {
      name: "CSV import fixture",
      type: "shared",
      memberships: {
        create: [
          { userId: ownerId, role: "owner", status: "active" },
          { userId: viewerId, role: "viewer", status: "active" },
        ],
      },
    },
  });
  workspaceId = workspace.id;
  const account = await db.financialAccount.create({
    data: {
      workspaceId,
      name: "Bank",
      type: "bank",
      openingBalance: 0n,
      openingDate: new Date("2026-10-01T00:00:00.000Z"),
    },
  });
  accountId = account.id;
  const categories = await Promise.all([
    db.category.create({
      data: { workspaceId, name: "Gaji", nameKey: "gaji", type: "income" },
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
  await db.user.deleteMany({ where: { id: { in: [ownerId, viewerId] } } });
});

describe("CSV transaction import service", () => {
  it("previews duplicates and commits an idempotent atomic batch", async () => {
    const context = {
      workspaceId,
      actorId: ownerId,
      role: "owner" as const,
      today: new Date("2026-10-06T00:00:00.000Z"),
    };
    const candidates = [
      {
        rowNumber: 2,
        type: "income" as const,
        title: "gaji",
        amount: 500_000n,
        transactionDate: new Date("2026-10-02T00:00:00.000Z"),
        categoryId: incomeCategoryId,
        note: null,
      },
      {
        rowNumber: 3,
        type: "expense" as const,
        title: "Belanja harian",
        amount: 100_000n,
        transactionDate: new Date("2026-10-03T00:00:00.000Z"),
        categoryId: expenseCategoryId,
        note: "impor",
      },
      {
        rowNumber: 4,
        type: "expense" as const,
        title: "Belanja harian",
        amount: 100_000n,
        transactionDate: new Date("2026-10-03T00:00:00.000Z"),
        categoryId: expenseCategoryId,
        note: "baris duplikat",
      },
    ];
    const preview = await previewTransactionImport(context, {
      accountId,
      rows: candidates,
    });
    expect(preview.rows.map((row) => row.possibleDuplicate)).toEqual([
      true,
      false,
      true,
    ]);

    const input = {
      fileName: "mutasi-bank.csv",
      accountId,
      batchKey: "csv-batch-once",
      sourceRowCount: 3,
      rows: preview.rows,
      selectedRowNumbers: [2, 3, 4],
      duplicateOverrideRowNumbers: [2],
    };
    const batch = await commitTransactionImport(context, input);
    const retry = await commitTransactionImport(context, input);

    expect(retry.id).toBe(batch.id);
    expect(batch.importedRowCount).toBe(2);
    expect(batch.skippedRowCount).toBe(1);
    expect(
      await db.transactionImportBatch.count({ where: { workspaceId } }),
    ).toBe(1);
    expect(await db.transaction.count({ where: { workspaceId } })).toBe(3);
    expect(
      await db.transaction.count({
        where: { workspaceId, importBatchId: batch.id },
      }),
    ).toBe(2);

    const exported = JSON.parse((await exportWorkspaceJson(workspaceId))!) as {
      schemaVersion: number;
      transactionImportBatches: Array<{
        importedRowCount: number;
        idempotencyKey?: string;
        requestHash?: string;
      }>;
      transactions: Array<{ importBatchId: string | null }>;
    };
    expect(exported.schemaVersion).toBe(5);
    expect(exported.transactionImportBatches).toHaveLength(1);
    expect(exported.transactionImportBatches[0]).toMatchObject({
      importedRowCount: 2,
    });
    expect(exported.transactionImportBatches[0].idempotencyKey).toBeUndefined();
    expect(exported.transactionImportBatches[0].requestHash).toBeUndefined();
    expect(
      exported.transactions.filter((item) => item.importBatchId === batch.id),
    ).toHaveLength(2);
  });

  it("rejects Viewer previews", async () => {
    await expect(
      previewTransactionImport(
        {
          workspaceId,
          actorId: viewerId,
          role: "viewer",
          today: new Date("2026-10-06T00:00:00.000Z"),
        },
        {
          accountId,
          rows: [
            {
              rowNumber: 2,
              type: "expense",
              title: "Belanja",
              amount: 10_000n,
              transactionDate: new Date("2026-10-03T00:00:00.000Z"),
              categoryId: expenseCategoryId,
              note: null,
            },
          ],
        },
      ),
    ).rejects.toMatchObject({ code: "IMPORT_ACCESS_DENIED" });
  });
});
