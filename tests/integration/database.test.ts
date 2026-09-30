import { randomUUID } from "node:crypto";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { databaseConnectionUrl } from "../../src/server/db/connection";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));

// Dedicated, already-migrated test PostgreSQL. Never silently use DATABASE_URL.
const connectionString = process.env.TEST_DATABASE_URL;
let client: pg.Client;
let user: string;
let workspace: string;
let other: string;
let account: string;
let destination: string;
let foreignAccount: string;
let expense: string;
let income: string;
let period: string;

async function insert(table: string, data: Record<string, unknown>) {
  // table/column identifiers below are test-code constants, never user input.
  const columns = Object.keys(data);
  await client.query(
    `INSERT INTO app.${table} (${columns.join(",")}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(",")})`,
    Object.values(data),
  );
}

async function transaction(overrides: Record<string, unknown> = {}) {
  const id = randomUUID();
  await insert("transactions", {
    id,
    workspace_id: workspace,
    created_by: user,
    updated_by: user,
    type: "expense",
    title: "Transaksi fixture",
    amount: "150000",
    transaction_date: "2026-09-22",
    account_id: account,
    category_id: expense,
    idempotency_key: id,
    request_hash: "a".repeat(64),
    updated_at: new Date(),
    ...overrides,
  });
  return id;
}

beforeAll(async () => {
  if (!connectionString)
    throw new Error(
      "TEST_DATABASE_URL wajib menunjuk PostgreSQL khusus test yang sudah dimigrasi (.env.test.local).",
    );
  client = new pg.Client({
    connectionString: databaseConnectionUrl(connectionString),
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
  } catch {
    throw new Error(
      "Koneksi database test gagal; periksa konfigurasi lokal. Credential disembunyikan.",
    );
  }
});

beforeEach(async () => {
  await client.query("BEGIN");
  user = randomUUID();
  workspace = randomUUID();
  other = randomUUID();
  account = randomUUID();
  destination = randomUUID();
  foreignAccount = randomUUID();
  expense = randomUUID();
  income = randomUUID();
  period = randomUUID();
  await insert("users", {
    id: user,
    auth_subject: randomUUID(),
    email: "fixture@example.invalid",
    updated_at: new Date(),
  });
  for (const id of [workspace, other]) {
    await insert("workspaces", {
      id,
      name: "Test",
      type: "shared",
      updated_at: new Date(),
    });
    await insert("memberships", {
      id: randomUUID(),
      workspace_id: id,
      user_id: user,
      role: "owner",
      updated_at: new Date(),
    });
  }
  for (const [id, scope] of [
    [account, workspace],
    [destination, workspace],
    [foreignAccount, other],
  ]) {
    await insert("financial_accounts", {
      id,
      workspace_id: scope,
      name: "Test",
      type: "bank",
      opening_balance: "0",
      opening_date: "2026-09-01",
      updated_at: new Date(),
    });
  }
  for (const [id, type] of [
    [expense, "expense"],
    [income, "income"],
  ]) {
    await insert("categories", {
      id,
      workspace_id: workspace,
      name: "Makan",
      name_key: "makan",
      type,
      updated_at: new Date(),
    });
  }
  await insert("cycle_settings", {
    id: randomUUID(),
    workspace_id: workspace,
    start_day: 1,
    effective_date: "2026-09-01",
    version: 1,
  });
  await insert("budget_periods", {
    id: period,
    workspace_id: workspace,
    start_date: "2026-09-01",
    end_date_exclusive: "2026-10-01",
  });
  await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  await client.query("SET CONSTRAINTS ALL DEFERRED");
});
afterEach(async () => {
  if (client) await client.query("ROLLBACK");
});
afterAll(async () => {
  if (client) await client.end();
});

describe("PostgreSQL data integrity (all fixture writes rolled back)", () => {
  it("scopes financial services, preserves idempotency, and records audit metadata", async () => {
    process.env.DATABASE_URL = connectionString;
    const prisma = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString: databaseConnectionUrl(connectionString!), max: 1 },
        { schema: "app" },
      ),
    });
    const profileId = randomUUID();
    let roomId: string | undefined;
    try {
      await prisma.user.create({
        data: {
          id: profileId,
          authSubject: randomUUID(),
          email: "finance-service@example.invalid",
        },
      });
      const room = await prisma.workspace.create({
        data: {
          name: "Finance service fixture",
          type: "personal",
          personalOwnerId: profileId,
          memberships: {
            create: { userId: profileId, role: "owner", status: "active" },
          },
          cycleSettings: {
            create: {
              startDay: 1,
              effectiveDate: new Date("2026-09-01T00:00:00.000Z"),
              version: 1,
            },
          },
        },
      });
      roomId = room.id;
      const context = { workspaceId: room.id, actorId: profileId };
      const accounts = await import("../../src/modules/accounts/service");
      const categories = await import("../../src/modules/categories/service");
      const transactions =
        await import("../../src/modules/transactions/service");
      const budgets = await import("../../src/modules/budgets/service");
      const reports = await import("../../src/modules/reports/service");
      const createdAccount = await accounts.createAccount(context, {
        name: "Dompet",
        type: "cash",
        openingBalance: 0n,
        openingDate: new Date("2026-09-23T00:00:00.000Z"),
      });
      await expect(
        accounts.renameAccount(
          { workspaceId: randomUUID(), actorId: profileId },
          {
            id: createdAccount.id,
            version: createdAccount.version,
            name: "Tidak boleh berubah",
          },
        ),
      ).rejects.toMatchObject({ code: "ACCOUNT_CONFLICT" });
      await accounts.renameAccount(context, {
        id: createdAccount.id,
        version: createdAccount.version,
        name: "Dompet utama",
      });
      const expenseCategory = await categories.createCategory(context, {
        name: "Hewan peliharaan",
        type: "expense",
      });
      const incomeCategory = await categories.createCategory(context, {
        name: "Bonus",
        type: "income",
      });
      const transactionContext = {
        ...context,
        today: new Date("2026-09-23T00:00:00.000Z"),
      };
      const incomeInput = {
        type: "income" as const,
        title: "Bonus proyek",
        amount: 1000n,
        transactionDate: new Date("2026-09-23T00:00:00.000Z"),
        accountId: createdAccount.id,
        destinationAccountId: null,
        categoryId: incomeCategory.id,
        note: "Bonus",
        idempotencyKey: "same-income-request",
      };
      const firstIncome = await transactions.createTransaction(
        transactionContext,
        incomeInput,
      );
      const retriedIncome = await transactions.createTransaction(
        transactionContext,
        incomeInput,
      );
      expect(retriedIncome.id).toBe(firstIncome.id);
      await expect(
        transactions.createTransaction(transactionContext, {
          ...incomeInput,
          amount: 2000n,
        }),
      ).rejects.toMatchObject({ code: "TRANSACTION_IDEMPOTENCY_CONFLICT" });
      const expenseTransaction = await transactions.createTransaction(
        transactionContext,
        {
          type: "expense",
          title: "Pakan kucing",
          amount: 1000n,
          transactionDate: new Date("2026-09-23T00:00:00.000Z"),
          accountId: createdAccount.id,
          destinationAccountId: null,
          categoryId: expenseCategory.id,
          note: "Pakan",
          idempotencyKey: "expense-request",
        },
      );
      const createdBudget = await budgets.createBudget(transactionContext, {
        categoryId: expenseCategory.id,
        limitAmount: 10_000n,
      });
      const budgetOverview = await budgets.getBudgetOverview(
        room.id,
        transactionContext.today,
      );
      expect(budgetOverview).toMatchObject({
        totalLimit: 10_000n,
        budgetedActual: 1_000n,
        unbudgeted: 0n,
        remaining: 9_000n,
      });
      await expect(
        budgets.updateBudget(
          { ...transactionContext, workspaceId: randomUUID() },
          { id: createdBudget.id, version: 1, limitAmount: 20_000n },
        ),
      ).rejects.toMatchObject({ code: "BUDGET_CONFLICT" });
      await budgets.updateBudget(transactionContext, {
        id: createdBudget.id,
        version: 1,
        limitAmount: 20_000n,
      });
      const exportedJson = await reports.exportWorkspaceJson(
        room.id,
        new Date("2026-09-27T10:00:00.000Z"),
      );
      expect(exportedJson).not.toBeNull();
      if (!exportedJson) throw new Error("Workspace export was not created");
      const exported = JSON.parse(exportedJson) as {
        format: string;
        exportedAt: string;
        workspace: { id: string };
        accounts: Array<{ openingBalance: string }>;
        categories: Array<{ id: string }>;
        budgetPeriods: Array<{ id: string }>;
        budgets: Array<{ limitAmount: string }>;
        transactions: Array<{ amount: string; deletedAt: string | null }>;
      };
      expect(exported).toMatchObject({
        format: "alokasi-workspace-export",
        exportedAt: "2026-09-27T10:00:00.000Z",
        workspace: { id: room.id },
      });
      expect(exported.accounts[0]?.openingBalance).toBe("0");
      expect(exported.categories).toHaveLength(2);
      expect(exported.budgetPeriods).toHaveLength(1);
      expect(exported.budgets[0]?.limitAmount).toBe("20000");
      expect(exported.transactions.map((item) => item.amount)).toEqual([
        "1000",
        "1000",
      ]);
      expect(exportedJson).not.toContain("same-income-request");
      expect(exportedJson).not.toContain("requestHash");
      await budgets.deleteBudget(transactionContext, {
        id: createdBudget.id,
        version: 2,
      });
      await transactions.updateTransaction(transactionContext, {
        id: expenseTransaction.id,
        version: expenseTransaction.version,
        type: "expense",
        title: "Pakan bulanan",
        amount: 1000n,
        transactionDate: new Date("2026-09-23T00:00:00.000Z"),
        accountId: createdAccount.id,
        destinationAccountId: null,
        categoryId: expenseCategory.id,
        note: "Pakan bulanan",
      });
      await transactions.deleteTransaction(context, {
        id: firstIncome.id,
        version: firstIncome.version,
      });
      await transactions.deleteTransaction(context, {
        id: expenseTransaction.id,
        version: expenseTransaction.version + 1,
      });
      expect(await transactions.listTransactions(room.id)).toHaveLength(0);
      await accounts.archiveAccount(context, {
        id: createdAccount.id,
        version: createdAccount.version + 1,
      });
      await categories.archiveCategory(context, {
        id: expenseCategory.id,
        version: expenseCategory.version,
      });
      const finalExportJson = await reports.exportWorkspaceJson(room.id);
      if (!finalExportJson)
        throw new Error("Final workspace export was not created");
      const finalExport = JSON.parse(finalExportJson) as {
        accounts: Array<{ archivedAt: string | null }>;
        categories: Array<{ id: string; archivedAt: string | null }>;
        budgets: unknown[];
        transactions: Array<{ deletedAt: string | null }>;
      };
      expect(finalExport.accounts[0]?.archivedAt).not.toBeNull();
      expect(
        finalExport.categories.find((item) => item.id === expenseCategory.id)
          ?.archivedAt,
      ).not.toBeNull();
      expect(finalExport.budgets).toHaveLength(0);
      expect(
        finalExport.transactions.every((item) => item.deletedAt !== null),
      ).toBe(true);
      const audit = await prisma.auditEvent.findMany({
        where: { workspaceId: room.id },
        orderBy: { occurredAt: "asc" },
      });
      expect(audit).toHaveLength(14);
      expect(new Set(audit.map((event) => event.entityType))).toEqual(
        new Set(["financial_account", "category", "transaction", "budget"]),
      );
      expect(audit.every((event) => event.actorId === profileId)).toBe(true);
      expect(
        audit.every((event) =>
          event.changedFields.every((field) => !field.includes("Dompet")),
        ),
      ).toBe(true);
      const visible = await accounts.listAccounts(room.id);
      expect(visible[0]).toMatchObject({
        name: "Dompet utama",
        balance: 0n,
      });
      expect(visible[0].archivedAt).not.toBeNull();
    } finally {
      if (roomId) {
        await prisma.$transaction(async (tx) => {
          await tx.auditEvent.deleteMany({ where: { workspaceId: roomId } });
          await tx.transaction.deleteMany({ where: { workspaceId: roomId } });
          await tx.budget.deleteMany({ where: { workspaceId: roomId } });
          await tx.budgetPeriod.deleteMany({ where: { workspaceId: roomId } });
          await tx.cycleSetting.deleteMany({ where: { workspaceId: roomId } });
          await tx.category.deleteMany({ where: { workspaceId: roomId } });
          await tx.financialAccount.deleteMany({
            where: { workspaceId: roomId },
          });
          await tx.membership.deleteMany({ where: { workspaceId: roomId } });
          await tx.workspace.delete({ where: { id: roomId } });
          await tx.user.delete({ where: { id: profileId } });
        });
      } else {
        await prisma.user.deleteMany({ where: { id: profileId } });
      }
      await prisma.$disconnect();
    }
  }, 60_000);
  it("enforces shared workspace invitation and member roles", async () => {
    process.env.DATABASE_URL = connectionString;
    const prisma = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString: databaseConnectionUrl(connectionString!), max: 1 },
        { schema: "app" },
      ),
      transactionOptions: { maxWait: 15_000, timeout: 30_000 },
    });
    const ownerId = randomUUID();
    const inviteeSubject = randomUUID();
    let sharedWorkspaceId: string | undefined;
    let inviteeId: string | undefined;
    try {
      await prisma.user.create({
        data: {
          id: ownerId,
          authSubject: randomUUID(),
          email: "shared-owner@example.invalid",
          displayName: "Owner bersama",
        },
      });
      const workspaces = await import("../../src/modules/workspaces/service");
      const transactions =
        await import("../../src/modules/transactions/service");
      const shared = await workspaces.createSharedWorkspace(ownerId, {
        name: "Dana keluarga",
        timezone: "Asia/Jakarta",
        now: new Date("2026-09-24T00:00:00.000Z"),
      });
      sharedWorkspaceId = shared.id;
      const ownerAccess = {
        workspaceId: shared.id,
        actorId: ownerId,
        role: "owner" as const,
        timezone: shared.timezone,
        workspaceType: "shared" as const,
      };
      const issued = await workspaces.createInvitation(ownerAccess, {
        email: "shared-editor@example.invalid",
        role: "editor",
      });
      expect(issued.token).not.toContain(issued.invitation.tokenHash);
      expect(await workspaces.getInvitationPreview(issued.token)).toMatchObject(
        { id: issued.invitation.id },
      );

      const inviteeIdentity = {
        subject: inviteeSubject,
        email: "shared-editor@example.invalid",
        emailVerified: true,
        displayName: "Editor bersama",
      };
      expect(
        await workspaces.acceptInvitation(inviteeIdentity, issued.token),
      ).toBe(shared.id);
      inviteeId = (
        await prisma.user.findUniqueOrThrow({
          where: { authSubject: inviteeSubject },
        })
      ).id;
      const editorAccess = await workspaces.requireWorkspaceAccess(
        inviteeIdentity,
        shared.id,
        ["editor"],
      );
      const account = await prisma.financialAccount.create({
        data: {
          workspaceId: shared.id,
          name: "Kas bersama",
          type: "cash",
          openingBalance: 0n,
          openingDate: new Date("2026-09-01T00:00:00.000Z"),
        },
      });
      const category = await prisma.category.findFirstOrThrow({
        where: { workspaceId: shared.id, type: "expense" },
      });
      const editorTransaction = await transactions.createTransaction(
        {
          ...editorAccess,
          today: new Date("2026-09-24T00:00:00.000Z"),
        },
        {
          type: "expense",
          title: "Belanja bersama",
          amount: 25_000n,
          transactionDate: new Date("2026-09-24T00:00:00.000Z"),
          accountId: account.id,
          destinationAccountId: null,
          categoryId: category.id,
          note: "Dibuat editor",
          idempotencyKey: randomUUID(),
        },
      );
      expect(editorTransaction.createdBy).toBe(inviteeId);
      const ownerTransaction = await transactions.createTransaction(
        {
          ...ownerAccess,
          today: new Date("2026-09-24T00:00:00.000Z"),
        },
        {
          type: "expense",
          title: "Belanja pemilik",
          amount: 10_000n,
          transactionDate: new Date("2026-09-24T00:00:00.000Z"),
          accountId: account.id,
          destinationAccountId: null,
          categoryId: category.id,
          note: "Dibuat owner",
          idempotencyKey: randomUUID(),
        },
      );
      await expect(
        transactions.deleteTransaction(editorAccess, {
          id: ownerTransaction.id,
          version: ownerTransaction.version,
        }),
      ).rejects.toMatchObject({ code: "TRANSACTION_CONFLICT" });

      const editorMembership = await prisma.membership.findUniqueOrThrow({
        where: {
          workspaceId_userId: {
            workspaceId: shared.id,
            userId: inviteeId,
          },
        },
      });
      await workspaces.changeMemberRole(ownerAccess, {
        membershipId: editorMembership.id,
        version: editorMembership.version,
        role: "viewer",
      });
      await expect(
        workspaces.requireWorkspaceAccess(inviteeIdentity, shared.id, [
          "editor",
        ]),
      ).rejects.toMatchObject({ code: "WORKSPACE_ROLE_DENIED" });
      const viewerAccess = await workspaces.requireWorkspaceAccess(
        inviteeIdentity,
        shared.id,
        ["viewer"],
      );
      await expect(
        transactions.createTransaction(
          { ...viewerAccess, today: new Date("2026-09-24T00:00:00.000Z") },
          {
            type: "expense",
            title: "Transaksi tanpa izin",
            amount: 1n,
            transactionDate: new Date("2026-09-24T00:00:00.000Z"),
            accountId: account.id,
            destinationAccountId: null,
            categoryId: category.id,
            note: null,
            idempotencyKey: randomUUID(),
          },
        ),
      ).rejects.toMatchObject({ code: "TRANSACTION_ACCESS_DENIED" });
      const viewerMembership = await prisma.membership.findUniqueOrThrow({
        where: { id: editorMembership.id },
      });
      await workspaces.revokeMember(ownerAccess, {
        membershipId: viewerMembership.id,
        version: viewerMembership.version,
      });
      await expect(
        workspaces.requireWorkspaceAccess(inviteeIdentity, shared.id),
      ).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
      await expect(
        workspaces.acceptInvitation(inviteeIdentity, issued.token),
      ).rejects.toMatchObject({ code: "INVITATION_INVALID" });
    } finally {
      const workspaceIds = (
        await prisma.workspace.findMany({
          where: {
            OR: [
              ...(sharedWorkspaceId ? [{ id: sharedWorkspaceId }] : []),
              ...(inviteeId ? [{ personalOwnerId: inviteeId }] : []),
            ],
          },
          select: { id: true },
        })
      ).map((item) => item.id);
      if (workspaceIds.length > 0) {
        await prisma.$transaction(async (tx) => {
          await tx.auditEvent.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.transaction.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.budget.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.invitation.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.budgetPeriod.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.cycleSetting.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.category.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.financialAccount.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.membership.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.workspace.deleteMany({
            where: { id: { in: workspaceIds } },
          });
        });
      }
      await prisma.user.deleteMany({
        where: { id: { in: [ownerId, ...(inviteeId ? [inviteeId] : [])] } },
      });
      await prisma.$disconnect();
    }
  }, 90_000);
  it("transfers shared workspace ownership only after target acceptance and lets former owner leave", async () => {
    process.env.DATABASE_URL = connectionString;
    const prisma = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString: databaseConnectionUrl(connectionString!), max: 2 },
        { schema: "app" },
      ),
      transactionOptions: { maxWait: 15_000, timeout: 30_000 },
    });
    const ownerId = randomUUID();
    const ownerSubject = randomUUID();
    const successorSubject = randomUUID();
    let sharedWorkspaceId: string | undefined;
    let successorId: string | undefined;
    try {
      await prisma.user.create({
        data: {
          id: ownerId,
          authSubject: ownerSubject,
          email: "transfer-owner@example.invalid",
          displayName: "Owner awal",
        },
      });
      const workspaces = await import("../../src/modules/workspaces/service");
      const shared = await workspaces.createSharedWorkspace(ownerId, {
        name: "Ruang alih kepemilikan",
        timezone: "Asia/Jakarta",
        now: new Date("2026-09-27T00:00:00.000Z"),
      });
      sharedWorkspaceId = shared.id;
      const ownerIdentity = {
        subject: ownerSubject,
        email: "transfer-owner@example.invalid",
        emailVerified: true,
        displayName: "Owner awal",
      };
      const ownerAccess = {
        workspaceId: shared.id,
        actorId: ownerId,
        role: "owner" as const,
        timezone: shared.timezone,
        workspaceType: "shared" as const,
      };
      const invitation = await workspaces.createInvitation(ownerAccess, {
        email: "transfer-successor@example.invalid",
        role: "viewer",
      });
      const successorIdentity = {
        subject: successorSubject,
        email: "transfer-successor@example.invalid",
        emailVerified: true,
        displayName: "Owner penerus",
      };
      await workspaces.acceptInvitation(successorIdentity, invitation.token);
      successorId = (
        await prisma.user.findUniqueOrThrow({
          where: { authSubject: successorSubject },
        })
      ).id;
      const successorMembership = await prisma.membership.findUniqueOrThrow({
        where: {
          workspaceId_userId: {
            workspaceId: shared.id,
            userId: successorId,
          },
        },
      });
      const ownerMembership = await prisma.membership.findUniqueOrThrow({
        where: {
          workspaceId_userId: {
            workspaceId: shared.id,
            userId: ownerId,
          },
        },
      });
      const workspaceBefore = await prisma.workspace.findUniqueOrThrow({
        where: { id: shared.id },
      });
      const requestedAt = new Date("2026-09-27T03:00:00.000Z");
      await workspaces.requestOwnershipTransfer(ownerAccess, {
        membershipId: successorMembership.id,
        workspaceVersion: workspaceBefore.version,
        now: requestedAt,
      });
      let pendingWorkspace = await prisma.workspace.findUniqueOrThrow({
        where: { id: shared.id },
      });
      expect(pendingWorkspace).toMatchObject({
        ownershipTransferToMembershipId: successorMembership.id,
        ownershipTransferRequestedAt: requestedAt,
        ownershipTransferExpiresAt: new Date("2026-10-04T03:00:00.000Z"),
      });
      await workspaces.cancelOwnershipTransfer(ownerAccess, {
        workspaceVersion: pendingWorkspace.version,
      });
      const cancelledWorkspace = await prisma.workspace.findUniqueOrThrow({
        where: { id: shared.id },
      });
      expect(cancelledWorkspace.ownershipTransferToMembershipId).toBeNull();
      await workspaces.requestOwnershipTransfer(ownerAccess, {
        membershipId: successorMembership.id,
        workspaceVersion: cancelledWorkspace.version,
        now: new Date("2026-09-27T03:30:00.000Z"),
      });
      pendingWorkspace = await prisma.workspace.findUniqueOrThrow({
        where: { id: shared.id },
      });
      await expect(
        workspaces.leaveSharedWorkspace(ownerAccess, {
          membershipVersion: ownerMembership.version,
        }),
      ).rejects.toMatchObject({ code: "OWNER_TRANSFER_REQUIRED" });

      const successorAccess = {
        workspaceId: shared.id,
        actorId: successorId,
        role: "viewer" as const,
        timezone: shared.timezone,
        workspaceType: "shared" as const,
      };
      const acceptInput = {
        workspaceVersion: pendingWorkspace.version,
        membershipVersion: successorMembership.version,
        now: new Date("2026-09-27T04:00:00.000Z"),
      };
      const concurrentAccepts = await Promise.allSettled([
        workspaces.acceptOwnershipTransfer(successorAccess, acceptInput),
        workspaces.acceptOwnershipTransfer(successorAccess, acceptInput),
      ]);
      expect(
        concurrentAccepts.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      const rejectedAccept = concurrentAccepts.find(
        (result) => result.status === "rejected",
      );
      expect(rejectedAccept).toMatchObject({
        reason: { code: "OWNERSHIP_TRANSFER_CONFLICT" },
      });

      const [formerOwner, newOwner, workspaceAfter] = await Promise.all([
        prisma.membership.findUniqueOrThrow({
          where: { id: ownerMembership.id },
        }),
        prisma.membership.findUniqueOrThrow({
          where: { id: successorMembership.id },
        }),
        prisma.workspace.findUniqueOrThrow({ where: { id: shared.id } }),
      ]);
      expect(formerOwner.role).toBe("editor");
      expect(newOwner.role).toBe("owner");
      expect(workspaceAfter.ownershipTransferToMembershipId).toBeNull();
      expect(
        await prisma.membership.count({
          where: {
            workspaceId: shared.id,
            status: "active",
            role: "owner",
          },
        }),
      ).toBe(1);

      await workspaces.leaveSharedWorkspace(
        { ...ownerAccess, role: "editor" },
        { membershipVersion: formerOwner.version },
      );
      await expect(
        workspaces.requireWorkspaceAccess(ownerIdentity, shared.id),
      ).rejects.toMatchObject({ code: "WORKSPACE_ACCESS_DENIED" });
      await expect(
        workspaces.leaveSharedWorkspace(
          { ...successorAccess, role: "owner" },
          { membershipVersion: newOwner.version },
        ),
      ).rejects.toMatchObject({ code: "OWNER_TRANSFER_REQUIRED" });
      expect(
        await prisma.auditEvent.findMany({
          where: {
            workspaceId: shared.id,
            action: {
              in: [
                "ownership_transfer_requested",
                "ownership_transfer_cancelled",
                "ownership_transferred",
                "left",
              ],
            },
          },
          select: { action: true },
          orderBy: { occurredAt: "asc" },
        }),
      ).toEqual([
        { action: "ownership_transfer_requested" },
        { action: "ownership_transfer_cancelled" },
        { action: "ownership_transfer_requested" },
        { action: "ownership_transferred" },
        { action: "left" },
      ]);
    } finally {
      const workspaceIds = (
        await prisma.workspace.findMany({
          where: {
            OR: [
              ...(sharedWorkspaceId ? [{ id: sharedWorkspaceId }] : []),
              { personalOwnerId: ownerId },
              ...(successorId ? [{ personalOwnerId: successorId }] : []),
            ],
          },
          select: { id: true },
        })
      ).map((item) => item.id);
      if (workspaceIds.length > 0) {
        await prisma.$transaction(async (tx) => {
          await tx.auditEvent.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.receiptDraft.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.transaction.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.budget.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.invitation.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.budgetPeriod.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.cycleSetting.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.category.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.financialAccount.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.membership.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.workspace.deleteMany({
            where: { id: { in: workspaceIds } },
          });
        });
      }
      await prisma.user.deleteMany({
        where: {
          id: { in: [ownerId, ...(successorId ? [successorId] : [])] },
        },
      });
      await prisma.$disconnect();
    }
  }, 90_000);
  it("deletes a shared workspace atomically only for its active owner with an exact name", async () => {
    process.env.DATABASE_URL = connectionString;
    const prisma = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString: databaseConnectionUrl(connectionString!), max: 1 },
        { schema: "app" },
      ),
      transactionOptions: { maxWait: 15_000, timeout: 30_000 },
    });
    const ownerId = randomUUID();
    const editorId = randomUUID();
    let roomId: string | undefined;
    try {
      await prisma.user.createMany({
        data: [
          {
            id: ownerId,
            authSubject: randomUUID(),
            email: "delete-owner@example.invalid",
          },
          {
            id: editorId,
            authSubject: randomUUID(),
            email: "delete-editor@example.invalid",
          },
        ],
      });
      const workspaces = await import("../../src/modules/workspaces/service");
      const room = await workspaces.createSharedWorkspace(ownerId, {
        name: "Ruang untuk dihapus",
        timezone: "Asia/Jakarta",
        now: new Date("2026-09-28T00:00:00.000Z"),
      });
      roomId = room.id;
      await prisma.membership.create({
        data: {
          workspaceId: room.id,
          userId: editorId,
          role: "editor",
          status: "active",
        },
      });
      const [category, period] = await Promise.all([
        prisma.category.findFirstOrThrow({
          where: { workspaceId: room.id, type: "expense" },
        }),
        prisma.budgetPeriod.findFirstOrThrow({
          where: { workspaceId: room.id },
        }),
      ]);
      const account = await prisma.financialAccount.create({
        data: {
          workspaceId: room.id,
          name: "Rekening ruang",
          type: "bank",
          openingBalance: 0n,
          openingDate: new Date("2026-09-01T00:00:00.000Z"),
        },
      });
      const createdTransaction = await prisma.transaction.create({
        data: {
          workspaceId: room.id,
          createdBy: ownerId,
          updatedBy: ownerId,
          type: "expense",
          title: "Pengeluaran ruang",
          amount: 25_000n,
          transactionDate: new Date("2026-09-28T00:00:00.000Z"),
          accountId: account.id,
          categoryId: category.id,
          idempotencyKey: randomUUID(),
          requestHash: "d".repeat(64),
        },
      });
      await Promise.all([
        prisma.budget.create({
          data: {
            workspaceId: room.id,
            categoryId: category.id,
            periodId: period.id,
            limitAmount: 100_000n,
          },
        }),
        prisma.receiptDraft.create({
          data: {
            workspaceId: room.id,
            createdBy: ownerId,
            status: "cancelled",
            cancelledAt: new Date("2026-09-28T01:00:00.000Z"),
          },
        }),
        prisma.invitation.create({
          data: {
            workspaceId: room.id,
            createdBy: ownerId,
            invitedEmail: "invitee@example.invalid",
            role: "viewer",
            tokenHash: "e".repeat(64),
            createdAt: new Date("2026-09-28T00:00:00.000Z"),
            expiresAt: new Date("2026-10-05T00:00:00.000Z"),
          },
        }),
      ]);
      expect(createdTransaction.amount).toBe(25_000n);

      const ownerAccess = {
        workspaceId: room.id,
        actorId: ownerId,
        role: "owner" as const,
        timezone: "Asia/Jakarta",
        workspaceType: "shared" as const,
      };
      expect(await workspaces.getWorkspaceDeletionSummary(ownerAccess)).toEqual(
        expect.objectContaining({
          name: "Ruang untuk dihapus",
          version: 1,
          members: 2,
          accounts: 1,
          transactions: 1,
          budgets: 1,
          receiptDrafts: 1,
        }),
      );
      await expect(
        workspaces.deleteSharedWorkspace(ownerAccess, {
          workspaceVersion: 1,
          confirmationName: "ruang untuk dihapus",
        }),
      ).rejects.toMatchObject({ code: "WORKSPACE_DELETE_NAME_MISMATCH" });
      await expect(
        workspaces.deleteSharedWorkspace(
          { ...ownerAccess, actorId: editorId, role: "editor" },
          {
            workspaceVersion: 1,
            confirmationName: "Ruang untuk dihapus",
          },
        ),
      ).rejects.toMatchObject({ code: "WORKSPACE_DELETE_NOT_ALLOWED" });

      await workspaces.deleteSharedWorkspace(ownerAccess, {
        workspaceVersion: 1,
        confirmationName: "Ruang untuk dihapus",
      });
      expect(
        await prisma.workspace.findUnique({ where: { id: room.id } }),
      ).toBeNull();
      const remainingChildren = await Promise.all([
        prisma.membership.count({ where: { workspaceId: room.id } }),
        prisma.financialAccount.count({ where: { workspaceId: room.id } }),
        prisma.category.count({ where: { workspaceId: room.id } }),
        prisma.transaction.count({ where: { workspaceId: room.id } }),
        prisma.budget.count({ where: { workspaceId: room.id } }),
        prisma.receiptDraft.count({ where: { workspaceId: room.id } }),
        prisma.auditEvent.count({ where: { workspaceId: room.id } }),
      ]);
      expect(remainingChildren).toEqual([0, 0, 0, 0, 0, 0, 0]);
      expect(
        await prisma.user.count({
          where: { id: { in: [ownerId, editorId] } },
        }),
      ).toBe(2);
    } finally {
      if (
        roomId &&
        (await prisma.workspace.findUnique({ where: { id: roomId } }))
      ) {
        await prisma.$transaction(async (tx) => {
          await tx.workspace.update({
            where: { id: roomId },
            data: {
              ownershipTransferToMembershipId: null,
              ownershipTransferRequestedAt: null,
              ownershipTransferExpiresAt: null,
            },
          });
          await tx.invitation.deleteMany({ where: { workspaceId: roomId } });
          await tx.auditEvent.deleteMany({ where: { workspaceId: roomId } });
          await tx.receiptDraft.deleteMany({ where: { workspaceId: roomId } });
          await tx.transaction.deleteMany({ where: { workspaceId: roomId } });
          await tx.budget.deleteMany({ where: { workspaceId: roomId } });
          await tx.budgetPeriod.deleteMany({ where: { workspaceId: roomId } });
          await tx.cycleSetting.deleteMany({ where: { workspaceId: roomId } });
          await tx.category.deleteMany({ where: { workspaceId: roomId } });
          await tx.financialAccount.deleteMany({
            where: { workspaceId: roomId },
          });
          await tx.membership.deleteMany({ where: { workspaceId: roomId } });
          await tx.workspace.delete({ where: { id: roomId } });
        });
      }
      await prisma.user.deleteMany({
        where: { id: { in: [ownerId, editorId] } },
      });
      await prisma.$disconnect();
    }
  }, 90_000);
  it("deletes personal data, anonymizes shared history, and requires shared ownership resolution", async () => {
    process.env.DATABASE_URL = connectionString;
    const prisma = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString: databaseConnectionUrl(connectionString!), max: 1 },
        { schema: "app" },
      ),
      transactionOptions: { maxWait: 15_000, timeout: 30_000 },
    });
    const subject = randomUUID();
    const otherOwnerId = randomUUID();
    let actorId: string | undefined;
    let memberRoomId: string | undefined;
    let ownedRoomId: string | undefined;
    try {
      const identity = {
        subject,
        email: "delete-account@example.invalid",
        emailVerified: true,
        displayName: "Akun dihapus",
      };
      const { provisionPersonalWorkspace } =
        await import("../../src/modules/workspaces/provision-personal");
      const personal = await provisionPersonalWorkspace(
        identity,
        new Date("2026-09-28T00:00:00.000Z"),
      );
      actorId = personal.user.id;
      const users = await import("../../src/modules/users/service");
      await users.updateApplicationProfile({
        actorId,
        authSubject: subject,
        displayName: "Nama profil baru",
      });
      expect(await users.getUserProfile(actorId)).toMatchObject({
        email: identity.email,
        displayName: "Nama profil baru",
      });
      await expect(
        users.updateApplicationProfile({
          actorId,
          authSubject: randomUUID(),
          displayName: "Tidak boleh tersimpan",
        }),
      ).rejects.toMatchObject({ code: "ACCOUNT_ACCESS_DENIED" });
      await prisma.user.create({
        data: {
          id: otherOwnerId,
          authSubject: randomUUID(),
          email: "retained-owner@example.invalid",
        },
      });
      const workspaces = await import("../../src/modules/workspaces/service");
      const owned = await workspaces.createSharedWorkspace(actorId, {
        name: "Masih dimiliki",
        timezone: "Asia/Jakarta",
        now: new Date("2026-09-28T00:00:00.000Z"),
      });
      ownedRoomId = owned.id;
      await expect(
        users.deleteApplicationAccount({
          actorId,
          authSubject: subject,
          confirmationEmail: identity.email,
        }),
      ).rejects.toMatchObject({ code: "ACCOUNT_OWNS_SHARED_WORKSPACE" });
      await workspaces.deleteSharedWorkspace(
        {
          workspaceId: owned.id,
          actorId,
          role: "owner",
          timezone: owned.timezone,
          workspaceType: "shared",
        },
        { workspaceVersion: owned.version, confirmationName: owned.name },
      );
      ownedRoomId = undefined;

      const shared = await workspaces.createSharedWorkspace(otherOwnerId, {
        name: "Histori bersama",
        timezone: "Asia/Jakarta",
        now: new Date("2026-09-28T00:00:00.000Z"),
      });
      memberRoomId = shared.id;
      const membership = await prisma.membership.create({
        data: {
          workspaceId: shared.id,
          userId: actorId,
          role: "editor",
          status: "active",
        },
      });
      const category = await prisma.category.findFirstOrThrow({
        where: { workspaceId: shared.id, type: "expense" },
      });
      const account = await prisma.financialAccount.create({
        data: {
          workspaceId: shared.id,
          name: "Kas bersama",
          type: "cash",
          openingBalance: 0n,
          openingDate: new Date("2026-09-01T00:00:00.000Z"),
        },
      });
      const sharedTransaction = await prisma.transaction.create({
        data: {
          workspaceId: shared.id,
          createdBy: actorId,
          updatedBy: actorId,
          type: "expense",
          title: "Pengeluaran bersama",
          amount: 25_000n,
          transactionDate: new Date("2026-09-28T00:00:00.000Z"),
          accountId: account.id,
          categoryId: category.id,
          idempotencyKey: randomUUID(),
          requestHash: "a".repeat(64),
        },
      });
      await prisma.receiptDraft.create({
        data: {
          workspaceId: shared.id,
          createdBy: actorId,
          status: "needs_review",
          correctedAmount: 25_000n,
          correctedTransactionDate: new Date("2026-09-28T00:00:00.000Z"),
          selectedAccountId: account.id,
          selectedCategoryId: category.id,
        },
      });
      await prisma.workspace.update({
        where: { id: shared.id },
        data: {
          ownershipTransferToMembershipId: membership.id,
          ownershipTransferRequestedAt: new Date("2026-09-28T02:00:00.000Z"),
          ownershipTransferExpiresAt: new Date("2026-10-05T02:00:00.000Z"),
        },
      });

      expect(await users.getAccountDeletionSummary(actorId)).toEqual(
        expect.objectContaining({
          email: identity.email,
          sharedMemberships: 1,
          ownedShared: [],
        }),
      );
      const disabledAt = new Date("2026-09-28T03:00:00.000Z");
      await users.deleteApplicationAccount({
        actorId,
        authSubject: subject,
        confirmationEmail: identity.email,
        now: disabledAt,
      });

      expect(
        await prisma.workspace.findUnique({
          where: { id: personal.workspace.id },
        }),
      ).toBeNull();
      expect(
        await prisma.user.findUniqueOrThrow({ where: { id: actorId } }),
      ).toMatchObject({
        authSubject: null,
        email: null,
        displayName: null,
        disabledAt,
      });
      expect(
        await prisma.membership.findUnique({ where: { id: membership.id } }),
      ).toMatchObject({ status: "revoked", role: "editor" });
      expect(
        await prisma.transaction.findUnique({
          where: { id: sharedTransaction.id },
        }),
      ).toMatchObject({ amount: 25_000n, createdBy: actorId });
      expect(
        await prisma.receiptDraft.count({
          where: { workspaceId: shared.id, createdBy: actorId },
        }),
      ).toBe(0);
      expect(
        await prisma.workspace.findUniqueOrThrow({ where: { id: shared.id } }),
      ).toMatchObject({
        ownershipTransferToMembershipId: null,
        ownershipTransferRequestedAt: null,
        ownershipTransferExpiresAt: null,
      });
    } finally {
      if (memberRoomId) {
        const room = await prisma.workspace.findUnique({
          where: { id: memberRoomId },
        });
        if (room) {
          const workspaces =
            await import("../../src/modules/workspaces/service");
          await workspaces.deleteSharedWorkspace(
            {
              workspaceId: room.id,
              actorId: otherOwnerId,
              role: "owner",
              timezone: room.timezone,
              workspaceType: "shared",
            },
            {
              workspaceVersion: room.version,
              confirmationName: room.name,
            },
          );
        }
      }
      if (ownedRoomId) {
        const room = await prisma.workspace.findUnique({
          where: { id: ownedRoomId },
        });
        if (room) {
          const workspaces =
            await import("../../src/modules/workspaces/service");
          await workspaces.deleteSharedWorkspace(
            {
              workspaceId: room.id,
              actorId: actorId!,
              role: "owner",
              timezone: room.timezone,
              workspaceType: "shared",
            },
            {
              workspaceVersion: room.version,
              confirmationName: room.name,
            },
          );
        }
      }
      if (actorId) {
        const personalRoom = await prisma.workspace.findUnique({
          where: { personalOwnerId: actorId },
        });
        if (personalRoom) {
          const { deleteWorkspaceData } =
            await import("../../src/modules/workspaces/delete-data");
          await prisma.$transaction((tx) =>
            deleteWorkspaceData(tx, personalRoom.id),
          );
        }
      }
      await prisma.user.deleteMany({
        where: {
          id: { in: [otherOwnerId, ...(actorId ? [actorId] : [])] },
        },
      });
      await prisma.$disconnect();
    }
  }, 90_000);
  it("applies payday cycle changes immediately without detaching the active budget", async () => {
    process.env.DATABASE_URL = connectionString;
    const prisma = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString: databaseConnectionUrl(connectionString!), max: 1 },
        { schema: "app" },
      ),
      transactionOptions: { maxWait: 15_000, timeout: 30_000 },
    });
    const ownerId = randomUUID();
    let roomId: string | undefined;
    try {
      await prisma.user.create({
        data: {
          id: ownerId,
          authSubject: randomUUID(),
          email: "payday-owner@example.invalid",
        },
      });
      const room = await prisma.workspace.create({
        data: {
          name: "Siklus gajian",
          type: "personal",
          personalOwnerId: ownerId,
          memberships: {
            create: { userId: ownerId, role: "owner", status: "active" },
          },
        },
      });
      roomId = room.id;
      await prisma.cycleSetting.create({
        data: {
          workspaceId: room.id,
          startDay: 1,
          effectiveDate: new Date("2026-09-01T00:00:00.000Z"),
          version: 1,
        },
      });
      const activePeriod = await prisma.budgetPeriod.create({
        data: {
          workspaceId: room.id,
          startDate: new Date("2026-09-01T00:00:00.000Z"),
          endDateExclusive: new Date("2026-10-01T00:00:00.000Z"),
          cycleSettingVersion: 1,
        },
      });
      const category = await prisma.category.create({
        data: {
          workspaceId: room.id,
          name: "Rencana siklus",
          nameKey: "rencana siklus",
          type: "expense",
        },
      });
      const activeBudget = await prisma.budget.create({
        data: {
          workspaceId: room.id,
          categoryId: category.id,
          periodId: activePeriod.id,
          limitAmount: 500_000n,
        },
      });
      const periods = await import("../../src/modules/periods/service");
      const context = {
        workspaceId: room.id,
        actorId: ownerId,
        today: new Date("2026-09-27T00:00:00.000Z"),
      };

      const firstChange = await periods.changeCycleStartDay(context, {
        startDay: 25,
        version: 1,
      });
      expect(firstChange).toMatchObject({ startDay: 25, version: 2 });
      const secondChange = await periods.changeCycleStartDay(context, {
        startDay: 20,
        version: 2,
      });
      expect(secondChange).toMatchObject({ startDay: 20, version: 3 });

      const storedPeriods = await prisma.budgetPeriod.findMany({
        where: { workspaceId: room.id },
        orderBy: { startDate: "asc" },
      });
      expect(storedPeriods).toHaveLength(2);
      expect(storedPeriods[0]).toMatchObject({
        cycleSettingVersion: 1,
        isTransition: true,
      });
      expect(
        storedPeriods.map((item) => ({
          id: item.id,
          start: item.startDate.toISOString().slice(0, 10),
          end: item.endDateExclusive.toISOString().slice(0, 10),
          version: item.cycleSettingVersion,
          transition: item.isTransition,
        })),
      ).toEqual([
        {
          id: expect.any(String),
          start: "2026-09-01",
          end: "2026-09-25",
          version: 1,
          transition: true,
        },
        {
          id: activePeriod.id,
          start: "2026-09-25",
          end: "2026-10-20",
          version: 3,
          transition: true,
        },
      ]);
      expect(
        await prisma.budget.findUniqueOrThrow({
          where: { id: activeBudget.id },
          select: { periodId: true, limitAmount: true },
        }),
      ).toEqual({ periodId: activePeriod.id, limitAmount: 500_000n });
      expect(
        await prisma.cycleSetting.findMany({
          where: { workspaceId: room.id },
          orderBy: { version: "asc" },
          select: { startDay: true, version: true, effectiveDate: true },
        }),
      ).toEqual([
        {
          startDay: 1,
          version: 1,
          effectiveDate: new Date("2026-09-01T00:00:00.000Z"),
        },
        {
          startDay: 25,
          version: 2,
          effectiveDate: context.today,
        },
        {
          startDay: 20,
          version: 3,
          effectiveDate: context.today,
        },
      ]);
      expect(
        await prisma.auditEvent.findMany({
          where: { workspaceId: room.id, entityType: "cycle_setting" },
          orderBy: { occurredAt: "asc" },
          select: { action: true },
        }),
      ).toEqual([{ action: "applied" }, { action: "applied" }]);
      const futurePeriod = await prisma.budgetPeriod.create({
        data: {
          workspaceId: room.id,
          startDate: new Date("2026-10-20T00:00:00.000Z"),
          endDateExclusive: new Date("2026-11-20T00:00:00.000Z"),
          cycleSettingVersion: 3,
        },
      });
      await prisma.budget.create({
        data: {
          workspaceId: room.id,
          categoryId: category.id,
          periodId: futurePeriod.id,
          limitAmount: 100_000n,
        },
      });
      await expect(
        periods.changeCycleStartDay(context, { startDay: 15, version: 3 }),
      ).rejects.toMatchObject({ code: "CYCLE_FUTURE_BUDGETS" });
    } finally {
      if (roomId) {
        await prisma.$transaction(async (tx) => {
          await tx.auditEvent.deleteMany({ where: { workspaceId: roomId } });
          await tx.budget.deleteMany({ where: { workspaceId: roomId } });
          await tx.budgetPeriod.deleteMany({ where: { workspaceId: roomId } });
          await tx.cycleSetting.deleteMany({ where: { workspaceId: roomId } });
          await tx.category.deleteMany({ where: { workspaceId: roomId } });
          await tx.membership.deleteMany({ where: { workspaceId: roomId } });
          await tx.workspace.delete({ where: { id: roomId } });
          await tx.user.delete({ where: { id: ownerId } });
        });
      } else {
        await prisma.user.deleteMany({ where: { id: ownerId } });
      }
      await prisma.$disconnect();
    }
  }, 60_000);
  it("previews history and copies selected budgets without overwriting the active period", async () => {
    process.env.DATABASE_URL = connectionString;
    const prisma = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString: databaseConnectionUrl(connectionString!), max: 1 },
        { schema: "app" },
      ),
      transactionOptions: { maxWait: 15_000, timeout: 30_000 },
    });
    const ownerId = randomUUID();
    let roomId: string | undefined;
    try {
      await prisma.user.create({
        data: {
          id: ownerId,
          authSubject: randomUUID(),
          email: "budget-history-owner@example.invalid",
        },
      });
      const room = await prisma.workspace.create({
        data: {
          name: "Budget historis",
          type: "personal",
          personalOwnerId: ownerId,
          memberships: {
            create: { userId: ownerId, role: "owner", status: "active" },
          },
          cycleSettings: {
            create: {
              startDay: 1,
              effectiveDate: new Date("2026-08-01T00:00:00.000Z"),
              version: 1,
            },
          },
        },
      });
      roomId = room.id;
      const category = await prisma.category.create({
        data: {
          workspaceId: room.id,
          name: "Belanja",
          nameKey: "belanja",
          type: "expense",
        },
      });
      const [sourcePeriod, targetPeriod] = await prisma.$transaction(
        async (tx) => {
          const source = await tx.budgetPeriod.create({
            data: {
              workspaceId: room.id,
              startDate: new Date("2026-08-01T00:00:00.000Z"),
              endDateExclusive: new Date("2026-09-01T00:00:00.000Z"),
              cycleSettingVersion: 1,
            },
          });
          const target = await tx.budgetPeriod.create({
            data: {
              workspaceId: room.id,
              startDate: new Date("2026-09-01T00:00:00.000Z"),
              endDateExclusive: new Date("2026-10-01T00:00:00.000Z"),
              cycleSettingVersion: 1,
            },
          });
          return [source, target] as const;
        },
      );
      await prisma.budget.create({
        data: {
          workspaceId: room.id,
          categoryId: category.id,
          periodId: sourcePeriod.id,
          limitAmount: 750_000n,
        },
      });

      const budgets = await import("../../src/modules/budgets/service");
      const preview = await budgets.getBudgetOverview(
        room.id,
        new Date("2026-09-15T00:00:00.000Z"),
        targetPeriod.id,
        { includeCopyPreview: true },
      );
      expect(preview.copyItems).toMatchObject([
        {
          categoryId: category.id,
          limitAmount: 750_000n,
          eligible: true,
        },
      ]);

      await expect(
        budgets.copyBudgetsFromPrevious(
          {
            workspaceId: room.id,
            actorId: ownerId,
            today: new Date("2026-09-15T00:00:00.000Z"),
          },
          {
            sourcePeriodId: sourcePeriod.id,
            targetPeriodId: targetPeriod.id,
            categoryIds: [category.id],
          },
        ),
      ).resolves.toEqual({ copied: 1 });
      expect(
        await prisma.budget.findMany({
          where: { workspaceId: room.id, categoryId: category.id },
          orderBy: { period: { startDate: "asc" } },
          select: { periodId: true, limitAmount: true },
        }),
      ).toEqual([
        { periodId: sourcePeriod.id, limitAmount: 750_000n },
        { periodId: targetPeriod.id, limitAmount: 750_000n },
      ]);
      await expect(
        budgets.copyBudgetsFromPrevious(
          {
            workspaceId: room.id,
            actorId: ownerId,
            today: new Date("2026-09-15T00:00:00.000Z"),
          },
          {
            sourcePeriodId: sourcePeriod.id,
            targetPeriodId: targetPeriod.id,
            categoryIds: [category.id],
          },
        ),
      ).rejects.toMatchObject({ code: "BUDGET_COPY_CONFLICT" });
    } finally {
      if (roomId) {
        await prisma.$transaction(async (tx) => {
          await tx.auditEvent.deleteMany({ where: { workspaceId: roomId } });
          await tx.budget.deleteMany({ where: { workspaceId: roomId } });
          await tx.budgetPeriod.deleteMany({ where: { workspaceId: roomId } });
          await tx.cycleSetting.deleteMany({ where: { workspaceId: roomId } });
          await tx.category.deleteMany({ where: { workspaceId: roomId } });
          await tx.membership.deleteMany({ where: { workspaceId: roomId } });
          await tx.workspace.delete({ where: { id: roomId } });
          await tx.user.delete({ where: { id: ownerId } });
        });
      } else {
        await prisma.user.deleteMany({ where: { id: ownerId } });
      }
      await prisma.$disconnect();
    }
  }, 60_000);
  it("keeps simulated receipt drafts private and submits exactly one expense", async () => {
    process.env.DATABASE_URL = connectionString;
    const prisma = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString: databaseConnectionUrl(connectionString!), max: 1 },
        { schema: "app" },
      ),
      transactionOptions: { maxWait: 15_000, timeout: 30_000 },
    });
    const ownerId = randomUUID();
    let roomId: string | undefined;
    try {
      await prisma.user.create({
        data: {
          id: ownerId,
          authSubject: randomUUID(),
          email: "receipt-owner@example.invalid",
        },
      });
      const room = await prisma.workspace.create({
        data: {
          name: "Draf struk",
          type: "personal",
          personalOwnerId: ownerId,
          memberships: {
            create: { userId: ownerId, role: "owner", status: "active" },
          },
        },
      });
      roomId = room.id;
      const accountRow = await prisma.financialAccount.create({
        data: {
          workspaceId: room.id,
          name: "Dompet",
          type: "cash",
          openingBalance: 0n,
          openingDate: new Date("2026-09-01T00:00:00.000Z"),
        },
      });
      const category = await prisma.category.create({
        data: {
          workspaceId: room.id,
          name: "Belanja",
          nameKey: "belanja",
          type: "expense",
        },
      });
      const receipts = await import("../../src/modules/receipts/service");
      const context = {
        workspaceId: room.id,
        actorId: ownerId,
        role: "owner" as const,
        today: new Date("2026-09-25T00:00:00.000Z"),
      };
      const draft = await receipts.createSimulatedReceiptDraft(context);
      expect(draft).toMatchObject({
        status: "needs_review",
        sourceKind: "fixture",
        extractedAmount: 125000n,
        createdBy: ownerId,
      });
      expect(
        await prisma.transaction.count({ where: { workspaceId: room.id } }),
      ).toBe(0);

      const localDraft = await receipts.createLocalReceiptDraft(context, {
        amount: 502500n,
        transactionDate: new Date("2026-09-25T00:00:00.000Z"),
        merchant: "MUHAMMAD TAUFIK HIDAYAT",
        note: "Transfer via Bank Mandiri (BI-FAST)",
        institution: "Bank Mandiri",
        evidenceKind: "transfer",
        paymentRail: "BI-FAST",
        ocrConfidence: 88,
        amountConfidence: 92,
        dateConfidence: 86,
        merchantConfidence: 78,
        institutionConfidence: 94,
      });
      expect(localDraft).toMatchObject({
        id: draft.id,
        sourceKind: "local_ocr",
        extractedAmount: 502500n,
        detectedInstitution: "Bank Mandiri",
        evidenceKind: "transfer",
        paymentRail: "BI-FAST",
      });

      const corrected = {
        draftId: localDraft.id,
        version: localDraft.version,
        amount: 502500n,
        transactionDate: new Date("2026-09-25T00:00:00.000Z"),
        merchant: "MUHAMMAD TAUFIK HIDAYAT",
        note: "Transfer via Bank Mandiri (BI-FAST)",
        accountId: accountRow.id,
        categoryId: category.id,
      };
      const [created, retried] = await Promise.all([
        receipts.submitReceiptDraft(context, corrected),
        receipts.submitReceiptDraft(context, corrected),
      ]);
      expect(retried.id).toBe(created.id);
      expect(created).toMatchObject({
        type: "expense",
        amount: 502500n,
        accountId: accountRow.id,
        categoryId: category.id,
      });
      expect(
        await prisma.transaction.count({ where: { workspaceId: room.id } }),
      ).toBe(1);
      expect(
        await prisma.receiptDraft.findUnique({ where: { id: draft.id } }),
      ).toMatchObject({
        status: "submitted",
        correctedAmount: 502500n,
        submittedTransactionId: created.id,
      });

      await expect(
        receipts.createSimulatedReceiptDraft({ ...context, role: "viewer" }),
      ).rejects.toMatchObject({ code: "RECEIPT_ACCESS_DENIED" });
      const cancelled = await receipts.createSimulatedReceiptDraft(context);
      await receipts.cancelReceiptDraft(context, {
        draftId: cancelled.id,
        version: cancelled.version,
      });
      expect(
        await prisma.receiptDraft.findUnique({ where: { id: cancelled.id } }),
      ).toMatchObject({ status: "cancelled" });
      expect(
        await prisma.transaction.count({ where: { workspaceId: room.id } }),
      ).toBe(1);
    } finally {
      if (roomId) {
        await prisma.$transaction(async (tx) => {
          await tx.receiptDraft.deleteMany({ where: { workspaceId: roomId } });
          await tx.auditEvent.deleteMany({ where: { workspaceId: roomId } });
          await tx.transaction.deleteMany({ where: { workspaceId: roomId } });
          await tx.category.deleteMany({ where: { workspaceId: roomId } });
          await tx.financialAccount.deleteMany({
            where: { workspaceId: roomId },
          });
          await tx.membership.deleteMany({ where: { workspaceId: roomId } });
          await tx.workspace.delete({ where: { id: roomId } });
          await tx.user.delete({ where: { id: ownerId } });
        });
      } else {
        await prisma.user.deleteMany({ where: { id: ownerId } });
      }
      await prisma.$disconnect();
    }
  }, 60_000);
  it("provisions one personal workspace idempotently", async () => {
    process.env.DATABASE_URL = connectionString;
    const { provisionPersonalWorkspace } =
      await import("../../src/modules/workspaces/provision-personal");
    const subject = randomUUID();
    let createdUser: string | undefined;
    try {
      const identity = {
        subject,
        email: "onboarding@example.invalid",
        emailVerified: true,
        displayName: "Onboarding",
      };
      const first = await provisionPersonalWorkspace(
        identity,
        new Date("2026-09-23T12:00:00Z"),
      );
      createdUser = first.user.id;
      const second = await provisionPersonalWorkspace(
        identity,
        new Date("2026-09-23T12:00:00Z"),
      );
      expect(second.workspace.id).toBe(first.workspace.id);
      const result = await client.query(
        `SELECT
          (SELECT count(*)::int FROM app.workspaces WHERE personal_owner_id=$1) AS workspaces,
          (SELECT count(*)::int FROM app.memberships WHERE workspace_id=$2 AND role='owner' AND status='active') AS owners,
          (SELECT count(*)::int FROM app.categories WHERE workspace_id=$2) AS categories,
          (SELECT count(*)::int FROM app.cycle_settings WHERE workspace_id=$2) AS cycle_settings,
          (SELECT count(*)::int FROM app.budget_periods WHERE workspace_id=$2) AS periods`,
        [first.user.id, first.workspace.id],
      );
      expect(result.rows[0]).toEqual({
        workspaces: 1,
        owners: 1,
        categories: 8,
        cycle_settings: 1,
        periods: 1,
      });
    } finally {
      if (createdUser) {
        const cleanup = new pg.Client({
          connectionString: databaseConnectionUrl(connectionString!),
          connectionTimeoutMillis: 10000,
        });
        await cleanup.connect();
        await cleanup.query("BEGIN");
        await cleanup.query(
          "DELETE FROM app.budget_periods WHERE workspace_id IN (SELECT id FROM app.workspaces WHERE personal_owner_id=$1)",
          [createdUser],
        );
        await cleanup.query(
          "DELETE FROM app.cycle_settings WHERE workspace_id IN (SELECT id FROM app.workspaces WHERE personal_owner_id=$1)",
          [createdUser],
        );
        await cleanup.query(
          "DELETE FROM app.categories WHERE workspace_id IN (SELECT id FROM app.workspaces WHERE personal_owner_id=$1)",
          [createdUser],
        );
        await cleanup.query(
          "DELETE FROM app.memberships WHERE workspace_id IN (SELECT id FROM app.workspaces WHERE personal_owner_id=$1)",
          [createdUser],
        );
        await cleanup.query(
          "DELETE FROM app.workspaces WHERE personal_owner_id=$1",
          [createdUser],
        );
        await cleanup.query("DELETE FROM app.users WHERE id=$1", [createdUser]);
        await cleanup.query("COMMIT");
        await cleanup.end();
      }
    }
  });
  it("round-trips BigInt and DATE through the generated Prisma client and adapter", async () => {
    const prisma = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString: databaseConnectionUrl(connectionString!), max: 1 },
        { schema: "app" },
      ),
    });
    const rollback = new Error("INTENTIONAL_TEST_ROLLBACK");
    const profileId = randomUUID();
    try {
      await expect(
        prisma.$transaction(
          async (tx) => {
            await tx.user.create({
              data: {
                id: profileId,
                authSubject: randomUUID(),
                email: "prisma@example.invalid",
              },
            });
            const room = await tx.workspace.create({
              data: {
                name: "Prisma fixture",
                type: "personal",
                personalOwnerId: profileId,
                memberships: { create: { userId: profileId, role: "owner" } },
              },
            });
            const result = await tx.financialAccount.create({
              data: {
                workspaceId: room.id,
                name: "Test",
                type: "cash",
                openingBalance: 9007199254740993n,
                openingDate: new Date("2026-09-01T00:00:00Z"),
              },
            });
            expect(result.openingBalance).toBe(9007199254740993n);
            expect(result.openingDate.toISOString()).toBe(
              "2026-09-01T00:00:00.000Z",
            );
            await tx.$executeRawUnsafe("SET CONSTRAINTS ALL IMMEDIATE");
            throw rollback;
          },
          { timeout: 15000 },
        ),
      ).rejects.toBe(rollback);
      expect(
        await prisma.user.findUnique({ where: { id: profileId } }),
      ).toBeNull();
    } finally {
      await prisma.$disconnect();
    }
  });
  it("denies direct schema access to Supabase browser roles", async () => {
    const result = await client.query(
      "SELECT has_schema_privilege(rolname, 'app', 'USAGE') AS allowed FROM pg_roles WHERE rolname IN ('anon','authenticated')",
    );
    for (const row of result.rows) expect(row.allowed).toBe(false);
  });
  it("preserves rupiah above Number.MAX_SAFE_INTEGER", async () => {
    const id = await transaction({ amount: "9007199254740993" });
    const result = await client.query(
      "SELECT amount::text FROM app.transactions WHERE id=$1",
      [id],
    );
    expect(result.rows[0].amount).toBe("9007199254740993");
  });
  it.each(["0", "-1"])("rejects nonpositive amount %s", async (amount) => {
    await expect(transaction({ amount })).rejects.toMatchObject({
      code: "23514",
    });
  });
  it("rejects a source account from another workspace", async () => {
    await expect(
      transaction({ account_id: foreignAccount }),
    ).rejects.toMatchObject({ code: "23503" });
  });
  it("rejects a category with the wrong transaction type", async () => {
    await expect(transaction({ category_id: income })).rejects.toMatchObject({
      code: "23503",
    });
  });
  it("rejects a creator who is not a workspace member", async () => {
    await expect(
      transaction({ created_by: randomUUID() }),
    ).rejects.toMatchObject({ code: "23503" });
  });
  it.each([
    { type: "transfer", category_id: null },
    { type: "income", category_id: null },
    { type: "expense", category_id: null },
  ])("rejects an incomplete transaction %j", async (fields) => {
    await expect(transaction(fields)).rejects.toMatchObject({ code: "23514" });
  });
  it("rejects self transfer", async () => {
    await expect(
      transaction({
        type: "transfer",
        category_id: null,
        destination_account_id: account,
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("rejects a transfer destination in another workspace", async () => {
    await expect(
      transaction({
        type: "transfer",
        category_id: null,
        destination_account_id: foreignAccount,
      }),
    ).rejects.toMatchObject({ code: "23503" });
  });
  it("stores a transfer as one row with both accounts", async () => {
    const id = await transaction({
      type: "transfer",
      category_id: null,
      destination_account_id: destination,
    });
    const result = await client.query(
      "SELECT account_id,destination_account_id FROM app.transactions WHERE id=$1",
      [id],
    );
    expect(result.rows).toEqual([
      { account_id: account, destination_account_id: destination },
    ]);
  });
  it("keeps the idempotency reservation after soft deletion", async () => {
    await transaction({ idempotency_key: "retry", deleted_at: new Date() });
    await expect(
      transaction({ idempotency_key: "retry" }),
    ).rejects.toMatchObject({ code: "23505" });
  });
  it("keeps archived category names reserved", async () => {
    await client.query(
      "UPDATE app.categories SET archived_at=now() WHERE id=$1",
      [expense],
    );
    await expect(
      insert("categories", {
        id: randomUUID(),
        workspace_id: workspace,
        name: "MAKAN",
        name_key: "makan",
        type: "expense",
        updated_at: new Date(),
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });
  it("rejects a misleading category normalization key", async () => {
    await expect(
      client.query(
        "UPDATE app.categories SET name_key='different' WHERE id=$1",
        [expense],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("preserves references to used categories", async () => {
    await transaction();
    await expect(
      client.query("DELETE FROM app.categories WHERE id=$1", [expense]),
    ).rejects.toMatchObject({ code: "23503" });
  });
  it("rejects income budget", async () => {
    await expect(
      insert("budgets", {
        id: randomUUID(),
        workspace_id: workspace,
        category_id: income,
        category_type: "income",
        period_id: period,
        limit_amount: "1000000",
        updated_at: new Date(),
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("rejects duplicate budget for the same period/category", async () => {
    const data = {
      workspace_id: workspace,
      category_id: expense,
      period_id: period,
      limit_amount: "1000000",
      updated_at: new Date(),
    };
    await insert("budgets", { id: randomUUID(), ...data });
    await expect(
      insert("budgets", { id: randomUUID(), ...data }),
    ).rejects.toMatchObject({ code: "23505" });
  });
  it("rejects a gap in formed calendar periods at transaction end", async () => {
    await insert("budget_periods", {
      id: randomUUID(),
      workspace_id: workspace,
      start_date: "2026-11-01",
      end_date_exclusive: "2026-12-01",
    });
    await expect(
      client.query("SET CONSTRAINTS ALL IMMEDIATE"),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("accepts adjacent calendar periods", async () => {
    await insert("budget_periods", {
      id: randomUUID(),
      workspace_id: workspace,
      start_date: "2026-10-01",
      end_date_exclusive: "2026-11-01",
    });
    await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  });
  it("rejects removing the only owner", async () => {
    await client.query(
      "UPDATE app.memberships SET status='revoked' WHERE workspace_id=$1",
      [workspace],
    );
    await expect(
      client.query("SET CONSTRAINTS ALL IMMEDIATE"),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("allows only the personal owner in a personal workspace", async () => {
    await client.query(
      "UPDATE app.workspaces SET type='personal',personal_owner_id=$2 WHERE id=$1",
      [workspace, user],
    );
    const secondUser = randomUUID();
    await insert("users", {
      id: secondUser,
      auth_subject: randomUUID(),
      email: "second@example.invalid",
      updated_at: new Date(),
    });
    await insert("memberships", {
      id: randomUUID(),
      workspace_id: workspace,
      user_id: secondUser,
      role: "viewer",
      updated_at: new Date(),
    });
    await expect(
      client.query("SET CONSTRAINTS ALL IMMEDIATE"),
    ).rejects.toMatchObject({ code: "23514" });
  });
});
