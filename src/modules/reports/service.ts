import "server-only";

import { listAccounts } from "@/modules/accounts/service";
import { getBudgetOverview } from "@/modules/budgets/service";
import { listCategories } from "@/modules/categories/service";
import {
  csvDocument,
  resolveReportFilters,
  type ReportFilters,
} from "@/modules/reports/domain";
import { getDatabase } from "@/server/db/client";

export type ReportQuery = Record<string, string | undefined>;

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function inclusiveEnd(date: Date) {
  return new Date(date.valueOf() - 86_400_000);
}

function transactionWhere(workspaceId: string, filters: ReportFilters) {
  return {
    workspaceId,
    deletedAt: null,
    transactionDate: { gte: filters.from, lt: filters.toExclusive },
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.accountId
      ? {
          OR: [
            { accountId: filters.accountId },
            { destinationAccountId: filters.accountId },
          ],
        }
      : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.query
      ? {
          AND: {
            OR: [
              {
                note: { contains: filters.query, mode: "insensitive" as const },
              },
              {
                category: {
                  name: {
                    contains: filters.query,
                    mode: "insensitive" as const,
                  },
                },
              },
              {
                account: {
                  name: {
                    contains: filters.query,
                    mode: "insensitive" as const,
                  },
                },
              },
              {
                destinationAccount: {
                  name: {
                    contains: filters.query,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          },
        }
      : {}),
  };
}

async function reportContext(
  workspaceId: string,
  today: Date,
  query: ReportQuery,
) {
  const budget = await getBudgetOverview(workspaceId, today);
  const defaults = {
    from: dateValue(budget.period.startDate),
    to: dateValue(inclusiveEnd(budget.period.endDateExclusive)),
  };
  const resolved = resolveReportFilters(query, defaults);
  return { budget, defaults, ...resolved };
}

export async function getReportOverview(
  workspaceId: string,
  today: Date,
  query: ReportQuery,
) {
  const db = getDatabase();
  const context = await reportContext(workspaceId, today, query);
  const [transactions, accounts, categories] = await Promise.all([
    db.transaction.findMany({
      where: transactionWhere(workspaceId, context.filters),
      include: {
        account: { select: { name: true } },
        destinationAccount: { select: { name: true } },
        category: { select: { name: true } },
        creator: {
          select: {
            user: { select: { displayName: true, email: true } },
          },
        },
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    }),
    listAccounts(workspaceId),
    listCategories(workspaceId),
  ]);
  let income = 0n;
  let expense = 0n;
  let transfer = 0n;
  const categoryTotals = new Map<string, bigint>();
  for (const transaction of transactions) {
    if (transaction.type === "income") income += transaction.amount;
    if (transaction.type === "expense") {
      expense += transaction.amount;
      const name = transaction.category?.name ?? "Tanpa kategori";
      categoryTotals.set(
        name,
        (categoryTotals.get(name) ?? 0n) + transaction.amount,
      );
    }
    if (transaction.type === "transfer") transfer += transaction.amount;
  }
  const isPeriodView =
    context.filters.fromValue === context.defaults.from &&
    context.filters.toValue === context.defaults.to &&
    !context.filters.type &&
    !context.filters.accountId &&
    !context.filters.categoryId &&
    !context.filters.query;
  return {
    ...context,
    transactions,
    accounts,
    categories,
    income,
    expense,
    transfer,
    netCashFlow: income - expense,
    categoryTotals: [...categoryTotals.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) =>
        a.amount === b.amount ? 0 : a.amount > b.amount ? -1 : 1,
      ),
    isPeriodView,
  };
}

export async function exportTransactionsCsv(
  workspaceId: string,
  today: Date,
  query: ReportQuery,
) {
  const report = await getReportOverview(workspaceId, today, query);
  if (!report.valid) return null;
  const rows = report.transactions.map((transaction) => [
    dateValue(transaction.transactionDate),
    transaction.type,
    transaction.account.name,
    transaction.destinationAccount?.name ?? "",
    transaction.category?.name ?? "",
    transaction.amount.toString(),
    transaction.note ?? "",
    transaction.creator.user.displayName ??
      transaction.creator.user.email ??
      "",
  ]);
  return csvDocument([
    [
      "Tanggal",
      "Jenis",
      "Akun",
      "Akun tujuan",
      "Kategori",
      "Nominal IDR",
      "Catatan",
      "Pencatat",
    ],
    ...rows,
  ]);
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function timestamp(value: Date | null) {
  return value?.toISOString() ?? null;
}

export async function exportWorkspaceJson(
  workspaceId: string,
  exportedAt = new Date(),
) {
  const db = getDatabase();
  const snapshot = await db.$transaction(
    async (tx) => {
      const workspace = await tx.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          id: true,
          name: true,
          type: true,
          currency: true,
          timezone: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!workspace) return null;
      const [
        cycleSettings,
        accounts,
        categories,
        periods,
        budgets,
        recurringTemplates,
        transactions,
      ] = await Promise.all([
        tx.cycleSetting.findMany({
          where: { workspaceId },
          orderBy: [{ effectiveDate: "asc" }, { version: "asc" }],
        }),
        tx.financialAccount.findMany({
          where: { workspaceId },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        }),
        tx.category.findMany({
          where: { workspaceId },
          orderBy: [{ type: "asc" }, { name: "asc" }, { id: "asc" }],
        }),
        tx.budgetPeriod.findMany({
          where: { workspaceId },
          orderBy: [{ startDate: "asc" }, { id: "asc" }],
        }),
        tx.budget.findMany({
          where: { workspaceId },
          orderBy: [{ periodId: "asc" }, { categoryId: "asc" }],
        }),
        tx.recurringTransactionTemplate.findMany({
          where: { workspaceId },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        }),
        tx.transaction.findMany({
          where: { workspaceId },
          select: {
            id: true,
            type: true,
            amount: true,
            transactionDate: true,
            accountId: true,
            destinationAccountId: true,
            categoryId: true,
            note: true,
            version: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
            recurringTemplateId: true,
            recurringDueDate: true,
            creator: {
              select: {
                userId: true,
                user: { select: { displayName: true, email: true } },
              },
            },
            updater: {
              select: {
                userId: true,
                user: { select: { displayName: true, email: true } },
              },
            },
          },
          orderBy: [
            { transactionDate: "asc" },
            { createdAt: "asc" },
            { id: "asc" },
          ],
        }),
      ]);
      return {
        workspace,
        cycleSettings,
        accounts,
        categories,
        periods,
        budgets,
        recurringTemplates,
        transactions,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
  if (!snapshot) return null;

  const document = {
    format: "alokasi-workspace-export",
    schemaVersion: 2,
    exportedAt: exportedAt.toISOString(),
    workspace: {
      ...snapshot.workspace,
      createdAt: snapshot.workspace.createdAt.toISOString(),
      updatedAt: snapshot.workspace.updatedAt.toISOString(),
    },
    cycleSettings: snapshot.cycleSettings.map((setting) => ({
      id: setting.id,
      startDay: setting.startDay,
      effectiveDate: dateOnly(setting.effectiveDate),
      version: setting.version,
      createdAt: setting.createdAt.toISOString(),
    })),
    accounts: snapshot.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      openingBalance: account.openingBalance.toString(),
      openingDate: dateOnly(account.openingDate),
      archivedAt: timestamp(account.archivedAt),
      version: account.version,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    })),
    categories: snapshot.categories.map((category) => ({
      id: category.id,
      name: category.name,
      type: category.type,
      archivedAt: timestamp(category.archivedAt),
      version: category.version,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    })),
    budgetPeriods: snapshot.periods.map((period) => ({
      id: period.id,
      startDate: dateOnly(period.startDate),
      endDateExclusive: dateOnly(period.endDateExclusive),
      cycleSettingVersion: period.cycleSettingVersion,
      isTransition: period.isTransition,
      createdAt: period.createdAt.toISOString(),
    })),
    budgets: snapshot.budgets.map((budget) => ({
      id: budget.id,
      categoryId: budget.categoryId,
      periodId: budget.periodId,
      limitAmount: budget.limitAmount.toString(),
      version: budget.version,
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
    })),
    recurringTransactionTemplates: snapshot.recurringTemplates.map(
      (template) => ({
        id: template.id,
        createdBy: template.createdBy,
        name: template.name,
        type: template.type,
        amount: template.amount.toString(),
        accountId: template.accountId,
        categoryId: template.categoryId,
        note: template.note,
        recurrenceDay: template.recurrenceDay,
        nextDueDate: dateOnly(template.nextDueDate),
        archivedAt: timestamp(template.archivedAt),
        version: template.version,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      }),
    ),
    transactions: snapshot.transactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount.toString(),
      transactionDate: dateOnly(transaction.transactionDate),
      accountId: transaction.accountId,
      destinationAccountId: transaction.destinationAccountId,
      categoryId: transaction.categoryId,
      note: transaction.note,
      createdBy: {
        userId: transaction.creator.userId,
        displayName: transaction.creator.user.displayName,
        email: transaction.creator.user.email,
      },
      updatedBy: {
        userId: transaction.updater.userId,
        displayName: transaction.updater.user.displayName,
        email: transaction.updater.user.email,
      },
      version: transaction.version,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      deletedAt: timestamp(transaction.deletedAt),
      recurringTemplateId: transaction.recurringTemplateId,
      recurringDueDate: transaction.recurringDueDate
        ? dateOnly(transaction.recurringDueDate)
        : null,
    })),
  };

  return `${JSON.stringify(document, null, 2)}\n`;
}
