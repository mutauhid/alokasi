import "server-only";

import { getDatabase } from "@/server/db/client";
import { FinanceDomainError } from "@/modules/finance/errors";
import { ensurePeriod, getPeriodSelection } from "@/modules/periods/service";

type OwnerContext = { workspaceId: string; actorId: string; today: Date };

export async function ensureCurrentPeriod(workspaceId: string, today: Date) {
  return ensurePeriod(workspaceId, today);
}

async function currentPeriodForBudgetMutation(
  workspaceId: string,
  today: Date,
) {
  try {
    return await ensureCurrentPeriod(workspaceId, today);
  } catch (error) {
    if (
      error instanceof FinanceDomainError &&
      error.code === "PERIOD_NOT_AVAILABLE"
    ) {
      throw new FinanceDomainError("BUDGET_CONFLICT");
    }
    throw error;
  }
}

export async function getBudgetOverview(
  workspaceId: string,
  today: Date,
  selectedPeriodId?: string,
  options: { includeCopyPreview?: boolean } = {},
) {
  const db = getDatabase();
  const selection = await getPeriodSelection(
    workspaceId,
    today,
    selectedPeriodId,
  );
  const period = selection.selectedPeriod;
  const [budgets, categories, expenses, sourceBudgets] = await Promise.all([
    db.budget.findMany({
      where: { workspaceId, periodId: period.id },
      include: { category: { select: { name: true, archivedAt: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.category.findMany({
      where: { workspaceId, type: "expense", archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.transaction.findMany({
      where: {
        workspaceId,
        type: "expense",
        deletedAt: null,
        transactionDate: {
          gte: period.startDate,
          lt: period.endDateExclusive,
        },
      },
      select: { categoryId: true, amount: true },
    }),
    options.includeCopyPreview &&
    selection.isActivePeriod &&
    selection.previousPeriod
      ? db.budget.findMany({
          where: {
            workspaceId,
            periodId: selection.previousPeriod.id,
          },
          include: {
            category: {
              select: { id: true, name: true, archivedAt: true },
            },
          },
          orderBy: { category: { name: "asc" } },
        })
      : Promise.resolve([]),
  ]);
  const actualByCategory = new Map<string, bigint>();
  for (const expense of expenses) {
    if (!expense.categoryId) continue;
    actualByCategory.set(
      expense.categoryId,
      (actualByCategory.get(expense.categoryId) ?? 0n) + expense.amount,
    );
  }
  const budgetedIds = new Set(budgets.map((budget) => budget.categoryId));
  const items = budgets.map((budget) => ({
    ...budget,
    actual: actualByCategory.get(budget.categoryId) ?? 0n,
  }));
  const totalLimit = items.reduce((sum, item) => sum + item.limitAmount, 0n);
  const budgetedActual = items.reduce((sum, item) => sum + item.actual, 0n);
  const unbudgeted = [...actualByCategory].reduce(
    (sum, [categoryId, amount]) =>
      budgetedIds.has(categoryId) ? sum : sum + amount,
    0n,
  );
  return {
    period,
    periods: selection.periods,
    activePeriod: selection.activePeriod,
    isActivePeriod: selection.isActivePeriod,
    previousPeriod: selection.previousPeriod,
    items,
    availableCategories: categories.filter(
      (category) => !budgetedIds.has(category.id),
    ),
    totalLimit,
    budgetedActual,
    unbudgeted,
    remaining: totalLimit - budgetedActual,
    copyItems: sourceBudgets.map((budget) => ({
      categoryId: budget.categoryId,
      categoryName: budget.category.name,
      limitAmount: budget.limitAmount,
      eligible:
        !budget.category.archivedAt && !budgetedIds.has(budget.categoryId),
      reason: budget.category.archivedAt
        ? "Kategori diarsipkan"
        : budgetedIds.has(budget.categoryId)
          ? "Sudah ada di periode ini"
          : null,
    })),
  };
}

export async function createBudget(
  context: OwnerContext,
  input: { categoryId: string; limitAmount: bigint },
) {
  const db = getDatabase();
  const period = await ensureCurrentPeriod(context.workspaceId, context.today);
  const category = await db.category.findFirst({
    where: {
      id: input.categoryId,
      workspaceId: context.workspaceId,
      type: "expense",
      archivedAt: null,
    },
  });
  if (!category) throw new FinanceDomainError("BUDGET_CATEGORY_INVALID");
  const duplicate = await db.budget.findUnique({
    where: {
      workspaceId_categoryId_periodId: {
        workspaceId: context.workspaceId,
        categoryId: input.categoryId,
        periodId: period.id,
      },
    },
  });
  if (duplicate) throw new FinanceDomainError("BUDGET_DUPLICATE");
  return db.$transaction(async (tx) => {
    const budget = await tx.budget.create({
      data: {
        workspaceId: context.workspaceId,
        categoryId: input.categoryId,
        periodId: period.id,
        limitAmount: input.limitAmount,
      },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: context.workspaceId,
        actorId: context.actorId,
        entityType: "budget",
        entityId: budget.id,
        action: "created",
        changedFields: ["category_id", "period_id", "limit_amount"],
      },
    });
    return budget;
  });
}

export async function updateBudget(
  context: OwnerContext,
  input: { id: string; version: number; limitAmount: bigint },
) {
  const period = await currentPeriodForBudgetMutation(
    context.workspaceId,
    context.today,
  );
  return getDatabase().$transaction(async (tx) => {
    const updated = await tx.budget.updateMany({
      where: {
        id: input.id,
        workspaceId: context.workspaceId,
        periodId: period.id,
        version: input.version,
      },
      data: { limitAmount: input.limitAmount, version: { increment: 1 } },
    });
    if (updated.count !== 1) throw new FinanceDomainError("BUDGET_CONFLICT");
    await tx.auditEvent.create({
      data: {
        workspaceId: context.workspaceId,
        actorId: context.actorId,
        entityType: "budget",
        entityId: input.id,
        action: "updated",
        changedFields: ["limit_amount", "version"],
      },
    });
  });
}

export async function deleteBudget(
  context: OwnerContext,
  input: { id: string; version: number },
) {
  const period = await currentPeriodForBudgetMutation(
    context.workspaceId,
    context.today,
  );
  return getDatabase().$transaction(async (tx) => {
    const budget = await tx.budget.findFirst({
      where: {
        id: input.id,
        workspaceId: context.workspaceId,
        periodId: period.id,
        version: input.version,
      },
    });
    if (!budget) throw new FinanceDomainError("BUDGET_CONFLICT");
    await tx.budget.delete({ where: { id: budget.id } });
    await tx.auditEvent.create({
      data: {
        workspaceId: context.workspaceId,
        actorId: context.actorId,
        entityType: "budget",
        entityId: budget.id,
        action: "deleted",
        changedFields: ["deleted"],
      },
    });
  });
}

export async function copyBudgetsFromPrevious(
  context: OwnerContext,
  input: {
    sourcePeriodId: string;
    targetPeriodId: string;
    categoryIds: string[];
  },
) {
  const db = getDatabase();
  const activePeriod = await ensureCurrentPeriod(
    context.workspaceId,
    context.today,
  );
  if (input.targetPeriodId !== activePeriod.id) {
    throw new FinanceDomainError("BUDGET_COPY_TARGET_INVALID");
  }
  return db.$transaction(
    async (tx) => {
      const sourcePeriod = await tx.budgetPeriod.findFirst({
        where: {
          id: input.sourcePeriodId,
          workspaceId: context.workspaceId,
          endDateExclusive: activePeriod.startDate,
        },
      });
      if (!sourcePeriod) {
        throw new FinanceDomainError("BUDGET_COPY_SOURCE_INVALID");
      }
      const sourceBudgets = await tx.budget.findMany({
        where: {
          workspaceId: context.workspaceId,
          periodId: sourcePeriod.id,
          categoryId: { in: input.categoryIds },
          category: { archivedAt: null },
        },
      });
      if (sourceBudgets.length !== input.categoryIds.length) {
        throw new FinanceDomainError("BUDGET_COPY_SOURCE_INVALID");
      }
      const existing = await tx.budget.count({
        where: {
          workspaceId: context.workspaceId,
          periodId: activePeriod.id,
          categoryId: { in: input.categoryIds },
        },
      });
      if (existing > 0) {
        throw new FinanceDomainError("BUDGET_COPY_CONFLICT");
      }
      for (const source of sourceBudgets) {
        const budget = await tx.budget.create({
          data: {
            workspaceId: context.workspaceId,
            categoryId: source.categoryId,
            periodId: activePeriod.id,
            limitAmount: source.limitAmount,
          },
        });
        await tx.auditEvent.create({
          data: {
            workspaceId: context.workspaceId,
            actorId: context.actorId,
            entityType: "budget",
            entityId: budget.id,
            action: "copied",
            changedFields: [
              "category_id",
              "period_id",
              "limit_amount",
              "copied_from_period_id",
            ],
          },
        });
      }
      return { copied: sourceBudgets.length };
    },
    { isolationLevel: "Serializable" },
  );
}
