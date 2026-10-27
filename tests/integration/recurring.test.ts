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
  createRecurringTemplate,
  postRecurringOccurrence,
  skipRecurringOccurrence,
} from "../../src/modules/recurring/service";
import { archiveAccount } from "../../src/modules/accounts/service";
import { archiveCategory } from "../../src/modules/categories/service";
import { exportWorkspaceJson } from "../../src/modules/reports/service";

vi.mock("server-only", () => ({}));

const connectionString = process.env.TEST_DATABASE_URL;
let db: ReturnType<typeof getDatabase>;
let workspaceId: string;
let ownerId: string;
let editorId: string;
let accountId: string;
let expenseCategoryId: string;

beforeAll(() => {
  if (!connectionString) {
    throw new Error(
      "TEST_DATABASE_URL wajib menunjuk PostgreSQL khusus test yang sudah dimigrasi.",
    );
  }
  // Services intentionally read DATABASE_URL at runtime. Point that runtime
  // singleton at the already-validated dedicated test database explicitly.
  process.env.DATABASE_URL = connectionString;
  db = getDatabase();
});

beforeEach(async () => {
  ownerId = randomUUID();
  editorId = randomUUID();
  await db.user.createMany({
    data: [
      {
        id: ownerId,
        authSubject: randomUUID(),
        email: `${ownerId}@example.invalid`,
      },
      {
        id: editorId,
        authSubject: randomUUID(),
        email: `${editorId}@example.invalid`,
      },
    ],
  });
  const workspace = await db.workspace.create({
    data: {
      name: "Recurring fixture",
      type: "shared",
      memberships: {
        create: [
          { userId: ownerId, role: "owner", status: "active" },
          { userId: editorId, role: "editor", status: "active" },
        ],
      },
      cycleSettings: {
        create: {
          startDay: 1,
          effectiveDate: new Date("2027-01-01T00:00:00.000Z"),
          version: 1,
        },
      },
    },
  });
  workspaceId = workspace.id;
  await db.budgetPeriod.create({
    data: {
      workspaceId,
      startDate: new Date("2027-01-01T00:00:00.000Z"),
      endDateExclusive: new Date("2027-02-01T00:00:00.000Z"),
      cycleSettingVersion: 1,
    },
  });
  const account = await db.financialAccount.create({
    data: {
      workspaceId,
      name: "Rekening utama",
      type: "bank",
      openingBalance: 0n,
      openingDate: new Date("2027-01-01T00:00:00.000Z"),
    },
  });
  accountId = account.id;
  const category = await db.category.create({
    data: {
      workspaceId,
      name: "Tagihan",
      nameKey: "tagihan",
      type: "expense",
    },
  });
  expenseCategoryId = category.id;
});

afterEach(async () => {
  if (workspaceId) {
    await db.$transaction((tx) => deleteWorkspaceData(tx, workspaceId));
  }
  await db.user.deleteMany({ where: { id: { in: [ownerId, editorId] } } });
});

describe("recurring transaction service", () => {
  it("posts only after confirmation and keeps a day-31 schedule across February", async () => {
    const template = await createRecurringTemplate(
      {
        workspaceId,
        actorId: ownerId,
        role: "owner",
        today: new Date("2027-01-30T00:00:00.000Z"),
      },
      {
        name: "Sewa rumah",
        type: "expense",
        amount: 2_500_000n,
        accountId,
        categoryId: expenseCategoryId,
        note: "Sewa bulanan",
        recurrenceDay: 31,
      },
    );
    expect(template.nextDueDate.toISOString().slice(0, 10)).toBe("2027-01-31");
    expect(await db.transaction.count({ where: { workspaceId } })).toBe(0);

    await expect(
      postRecurringOccurrence(
        {
          workspaceId,
          actorId: ownerId,
          role: "owner",
          today: new Date("2027-01-30T00:00:00.000Z"),
        },
        { id: template.id, version: template.version },
      ),
    ).rejects.toMatchObject({ code: "RECURRING_NOT_DUE" });

    const transaction = await postRecurringOccurrence(
      {
        workspaceId,
        actorId: ownerId,
        role: "owner",
        today: new Date("2027-01-31T00:00:00.000Z"),
      },
      { id: template.id, version: template.version },
    );
    expect(transaction.transactionDate.toISOString().slice(0, 10)).toBe(
      "2027-01-31",
    );
    expect(transaction.recurringTemplateId).toBe(template.id);

    const exportedJson = await exportWorkspaceJson(
      workspaceId,
      new Date("2027-01-31T12:00:00.000Z"),
    );
    if (!exportedJson) throw new Error("Workspace export was not created");
    const exported = JSON.parse(exportedJson) as {
      schemaVersion: number;
      recurringTransactionTemplates: Array<{
        id: string;
        amount: string;
        nextDueDate: string;
      }>;
      transactions: Array<{
        recurringTemplateId: string | null;
        recurringDueDate: string | null;
      }>;
    };
    expect(exported.schemaVersion).toBe(5);
    expect(exported.recurringTransactionTemplates).toEqual([
      expect.objectContaining({
        id: template.id,
        amount: "2500000",
        nextDueDate: "2027-02-28",
      }),
    ]);
    expect(exported.transactions).toEqual([
      expect.objectContaining({
        recurringTemplateId: template.id,
        recurringDueDate: "2027-01-31",
      }),
    ]);

    const february = await db.recurringTransactionTemplate.findUniqueOrThrow({
      where: { id: template.id },
    });
    expect(february.nextDueDate.toISOString().slice(0, 10)).toBe("2027-02-28");
    await skipRecurringOccurrence(
      {
        workspaceId,
        actorId: ownerId,
        role: "owner",
        today: new Date("2027-02-28T00:00:00.000Z"),
      },
      { id: template.id, version: february.version },
    );
    const march = await db.recurringTransactionTemplate.findUniqueOrThrow({
      where: { id: template.id },
    });
    expect(march.nextDueDate.toISOString().slice(0, 10)).toBe("2027-03-31");
    expect(await db.transaction.count({ where: { workspaceId } })).toBe(1);
  });

  it("keeps editor templates owner-scoped and protects referenced setup", async () => {
    const template = await createRecurringTemplate(
      {
        workspaceId,
        actorId: ownerId,
        role: "owner",
        today: new Date("2027-01-01T00:00:00.000Z"),
      },
      {
        name: "Internet",
        type: "expense",
        amount: 500_000n,
        accountId,
        categoryId: expenseCategoryId,
        note: null,
        recurrenceDay: 10,
      },
    );
    await expect(
      skipRecurringOccurrence(
        {
          workspaceId,
          actorId: editorId,
          role: "editor",
          today: new Date("2027-01-10T00:00:00.000Z"),
        },
        { id: template.id, version: template.version },
      ),
    ).rejects.toMatchObject({ code: "RECURRING_CONFLICT" });
    await expect(
      archiveCategory(
        { workspaceId, actorId: ownerId },
        { id: expenseCategoryId, version: 1 },
      ),
    ).rejects.toMatchObject({ code: "CATEGORY_RECURRING_ACTIVE" });
    await expect(
      archiveAccount(
        { workspaceId, actorId: ownerId },
        { id: accountId, version: 1 },
      ),
    ).rejects.toMatchObject({ code: "ACCOUNT_RECURRING_ACTIVE" });
  });

  it("posts a due occurrence at most once under concurrent confirmation", async () => {
    const template = await createRecurringTemplate(
      {
        workspaceId,
        actorId: editorId,
        role: "editor",
        today: new Date("2027-01-10T00:00:00.000Z"),
      },
      {
        name: "Internet editor",
        type: "expense",
        amount: 500_000n,
        accountId,
        categoryId: expenseCategoryId,
        note: null,
        recurrenceDay: 10,
      },
    );
    const context = {
      workspaceId,
      actorId: editorId,
      role: "editor" as const,
      today: new Date("2027-01-10T00:00:00.000Z"),
    };
    const results = await Promise.allSettled([
      postRecurringOccurrence(context, {
        id: template.id,
        version: template.version,
      }),
      postRecurringOccurrence(context, {
        id: template.id,
        version: template.version,
      }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(
      await db.transaction.count({
        where: {
          workspaceId,
          recurringTemplateId: template.id,
          recurringDueDate: new Date("2027-01-10T00:00:00.000Z"),
        },
      }),
    ).toBe(1);
  });
});
