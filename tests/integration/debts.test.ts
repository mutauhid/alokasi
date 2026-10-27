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
import {
  createDebtPayment,
  createDebtRecord,
  getDebtOverview,
  settleDebtRecord,
} from "../../src/modules/debts/service";
import { getBudgetOverview } from "../../src/modules/budgets/service";
import { getDashboardOverview } from "../../src/modules/dashboard/service";
import {
  exportWorkspaceJson,
  getReportOverview,
} from "../../src/modules/reports/service";
import { deleteWorkspaceData } from "../../src/modules/workspaces/delete-data";
import { getDatabase } from "../../src/server/db/client";

vi.mock("server-only", () => ({}));

const connectionString = process.env.TEST_DATABASE_URL;
let db: ReturnType<typeof getDatabase>;
let workspaceId = "";
let ownerId = "";
let accountId = "";

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
  await db.user.create({
    data: {
      id: ownerId,
      authSubject: randomUUID(),
      email: `debt-${ownerId}@example.invalid`,
    },
  });
  const workspace = await db.workspace.create({
    data: {
      name: "Debt fixture",
      type: "personal",
      personalOwnerId: ownerId,
      memberships: {
        create: { userId: ownerId, role: "owner", status: "active" },
      },
      cycleSettings: {
        create: {
          startDay: 1,
          effectiveDate: new Date("2026-10-01T00:00:00.000Z"),
          version: 1,
        },
      },
    },
  });
  workspaceId = workspace.id;
  await db.budgetPeriod.create({
    data: {
      workspaceId,
      startDate: new Date("2026-10-01T00:00:00.000Z"),
      endDateExclusive: new Date("2026-11-01T00:00:00.000Z"),
      cycleSettingVersion: 1,
    },
  });
  const account = await db.financialAccount.create({
    data: {
      workspaceId,
      name: "Mandiri",
      type: "bank",
      openingBalance: 1_000_000n,
      openingDate: new Date("2026-10-01T00:00:00.000Z"),
    },
  });
  accountId = account.id;
});

afterEach(async () => {
  if (workspaceId) {
    await db.$transaction((tx) => deleteWorkspaceData(tx, workspaceId));
  }
  if (ownerId) await db.user.deleteMany({ where: { id: ownerId } });
});

describe("personal debt and receivable ledger", () => {
  it("updates account balances without becoming cash flow or budget realization", async () => {
    const context = {
      workspaceId,
      actorId: ownerId,
      role: "owner" as const,
      workspaceType: "personal" as const,
      timezone: "Asia/Jakarta",
      today: new Date("2026-10-27T00:00:00.000Z"),
    };
    const debtInput = {
      kind: "debt" as const,
      origin: "current" as const,
      counterparty: "Budi",
      title: "Pinjaman motor",
      principalAmount: 500_000n,
      startDate: new Date("2026-10-20T00:00:00.000Z"),
      dueDate: new Date("2026-11-20T00:00:00.000Z"),
      accountId,
      note: null,
      idempotencyKey: "new-debt",
    };
    const debt = await createDebtRecord(context, debtInput);
    expect((await createDebtRecord(context, debtInput)).id).toBe(debt.id);
    const receivable = await createDebtRecord(context, {
      kind: "receivable",
      origin: "historical",
      counterparty: "Sari",
      title: "Talangan tiket",
      principalAmount: 200_000n,
      startDate: new Date("2026-09-15T00:00:00.000Z"),
      dueDate: new Date("2026-10-25T00:00:00.000Z"),
      accountId: null,
      note: null,
      idempotencyKey: "old-receivable",
    });
    expect((await listAccounts(workspaceId))[0].balance).toBe(1_500_000n);

    const debtPaymentInput = {
      debtRecordId: debt.id,
      accountId,
      amount: 100_000n,
      paymentDate: new Date("2026-10-27T00:00:00.000Z"),
      note: "Cicilan pertama",
      idempotencyKey: "debt-payment-1",
    };
    const debtPayment = await createDebtPayment(context, debtPaymentInput);
    expect((await createDebtPayment(context, debtPaymentInput)).id).toBe(
      debtPayment.id,
    );
    await createDebtPayment(context, {
      debtRecordId: receivable.id,
      accountId,
      amount: 50_000n,
      paymentDate: new Date("2026-10-27T00:00:00.000Z"),
      note: null,
      idempotencyKey: "receivable-payment-1",
    });
    expect((await listAccounts(workspaceId))[0].balance).toBe(1_450_000n);
    await expect(
      createDebtPayment(context, {
        ...debtPaymentInput,
        amount: 500_000n,
        idempotencyKey: "overpayment",
      }),
    ).rejects.toMatchObject({ code: "DEBT_PAYMENT_EXCEEDS_OUTSTANDING" });

    const overview = await getDebtOverview(workspaceId, context.today);
    expect(overview).toMatchObject({
      totalDebt: 400_000n,
      totalReceivable: 150_000n,
      overdueCount: 1,
    });
    expect(await db.transaction.count({ where: { workspaceId } })).toBe(0);
    const report = await getReportOverview(workspaceId, context.today, {});
    expect(report).toMatchObject({ income: 0n, expense: 0n, netCashFlow: 0n });
    const budget = await getBudgetOverview(workspaceId, context.today);
    expect(budget).toMatchObject({ budgetedActual: 0n, unbudgeted: 0n });
    const dashboard = await getDashboardOverview(
      workspaceId,
      context.today,
      undefined,
      "personal",
    );
    expect(dashboard.debts).toMatchObject({
      totalDebt: 400_000n,
      totalReceivable: 150_000n,
      overdueCount: 1,
    });
    expect(dashboard.debts?.latestActivities).toHaveLength(4);
    expect(dashboard.latestTransactions).toHaveLength(0);

    const exported = JSON.parse((await exportWorkspaceJson(workspaceId))!) as {
      schemaVersion: number;
      debtRecords: unknown[];
      debtPayments: unknown[];
    };
    expect(exported.schemaVersion).toBe(5);
    expect(exported.debtRecords).toHaveLength(2);
    expect(exported.debtPayments).toHaveLength(2);
  });

  it("rejects the feature outside a personal mutable workspace", async () => {
    await expect(
      createDebtRecord(
        {
          workspaceId,
          actorId: ownerId,
          role: "viewer",
          workspaceType: "personal",
          timezone: "Asia/Jakarta",
          today: new Date("2026-10-27T00:00:00.000Z"),
        },
        {
          kind: "debt",
          origin: "current",
          counterparty: "Budi",
          title: "Tidak boleh",
          principalAmount: 100_000n,
          startDate: new Date("2026-10-27T00:00:00.000Z"),
          dueDate: null,
          accountId,
          note: null,
          idempotencyKey: "viewer-denied",
        },
      ),
    ).rejects.toMatchObject({ code: "DEBT_ACCESS_DENIED" });
  });

  it("settles the exact remaining debt once and applies its balance movement", async () => {
    const context = {
      workspaceId,
      actorId: ownerId,
      role: "owner" as const,
      workspaceType: "personal" as const,
      timezone: "Asia/Jakarta",
      today: new Date("2026-10-27T00:00:00.000Z"),
    };
    const debt = await createDebtRecord(context, {
      kind: "debt",
      origin: "current",
      counterparty: "Budi",
      title: "Pinjaman singkat",
      principalAmount: 100_000n,
      startDate: new Date("2026-10-20T00:00:00.000Z"),
      dueDate: new Date("2026-10-27T00:00:00.000Z"),
      accountId,
      note: null,
      idempotencyKey: "full-debt",
    });
    await createDebtPayment(context, {
      debtRecordId: debt.id,
      accountId,
      amount: 25_000n,
      paymentDate: context.today,
      note: "Cicilan",
      idempotencyKey: "partial-before-full",
    });

    const settlementInput = {
      debtRecordId: debt.id,
      accountId,
      paymentDate: context.today,
      note: "Pelunasan",
      idempotencyKey: "settle-full",
    };
    const settlement = await settleDebtRecord(context, settlementInput);
    expect(settlement.amount).toBe(75_000n);
    expect((await settleDebtRecord(context, settlementInput)).id).toBe(
      settlement.id,
    );
    expect(
      (await getDebtOverview(workspaceId, context.today)).items[0],
    ).toMatchObject({
      paidAmount: 100_000n,
      outstandingAmount: 0n,
      status: "settled",
    });
    expect((await listAccounts(workspaceId))[0].balance).toBe(1_000_000n);
    expect(
      await db.debtPayment.count({
        where: { workspaceId, debtRecordId: debt.id },
      }),
    ).toBe(2);
  });
});
