import "server-only";

import { listAccounts } from "@/modules/accounts/service";
import { getBudgetOverview } from "@/modules/budgets/service";
import { buildCashFlowTrend } from "@/modules/dashboard/domain";
import { getPeriodSelection } from "@/modules/periods/service";
import { getDatabase } from "@/server/db/client";
import { listRecurringReminders } from "@/modules/recurring/service";
import { getDebtOverview } from "@/modules/debts/service";

export async function getDashboardOverview(
  workspaceId: string,
  today: Date,
  selectedPeriodId?: string,
  workspaceType: "personal" | "shared" = "personal",
) {
  const db = getDatabase();
  const [accounts, budget, selection, recurringReminders, debtOverview] =
    await Promise.all([
      listAccounts(workspaceId),
      getBudgetOverview(workspaceId, today, selectedPeriodId),
      getPeriodSelection(workspaceId, today, selectedPeriodId),
      listRecurringReminders(workspaceId, today),
      workspaceType === "personal"
        ? getDebtOverview(workspaceId, today)
        : Promise.resolve(null),
    ]);
  const firstTrendPeriod =
    selection.trendPeriods[0] ?? selection.selectedPeriod;
  const transactions = await db.transaction.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      transactionDate: {
        gte: firstTrendPeriod.startDate,
        lt: selection.selectedPeriod.endDateExclusive,
      },
    },
    include: {
      account: { select: { name: true } },
      destinationAccount: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  });
  const selectedTransactions = transactions.filter(
    (transaction) =>
      transaction.transactionDate >= selection.selectedPeriod.startDate &&
      transaction.transactionDate < selection.selectedPeriod.endDateExclusive,
  );
  let income = 0n;
  let expense = 0n;
  const categoryTotals = new Map<
    string,
    { id: string; name: string; amount: bigint }
  >();
  for (const transaction of selectedTransactions) {
    if (transaction.type === "income") income += transaction.amount;
    if (transaction.type === "expense") {
      expense += transaction.amount;
      if (transaction.categoryId && transaction.category) {
        const current = categoryTotals.get(transaction.categoryId);
        categoryTotals.set(transaction.categoryId, {
          id: transaction.categoryId,
          name: transaction.category.name,
          amount: (current?.amount ?? 0n) + transaction.amount,
        });
      }
    }
  }
  const activeAccounts = accounts.filter((account) => !account.archivedAt);
  const debtItems = debtOverview?.items ?? [];
  const debtActivities = debtItems
    .flatMap((item) => [
      {
        id: `record-${item.id}`,
        activity: "record" as const,
        kind: item.kind,
        title: item.title,
        counterparty: item.counterparty,
        amount: item.principalAmount,
        activityDate: item.startDate,
        createdAt: item.createdAt,
      },
      ...item.payments.map((payment) => ({
        id: `payment-${payment.id}`,
        activity: "payment" as const,
        kind: item.kind,
        title: item.title,
        counterparty: item.counterparty,
        amount: payment.amount,
        activityDate: payment.paymentDate,
        createdAt: payment.createdAt,
      })),
    ])
    .sort(
      (a, b) =>
        b.createdAt.valueOf() - a.createdAt.valueOf() ||
        b.id.localeCompare(a.id),
    )
    .slice(0, 4);
  const nearestDebtDue =
    debtItems
      .filter((item) => item.outstandingAmount > 0n && item.dueDate)
      .sort(
        (a, b) =>
          a.dueDate!.valueOf() - b.dueDate!.valueOf() ||
          a.createdAt.valueOf() - b.createdAt.valueOf(),
      )[0] ?? null;
  return {
    accounts: activeAccounts,
    totalBalance: activeAccounts.reduce(
      (sum, account) => sum + account.balance,
      0n,
    ),
    income,
    expense,
    netCashFlow: income - expense,
    period: selection.selectedPeriod,
    isActivePeriod: selection.isActivePeriod,
    trend: buildCashFlowTrend(
      selection.trendPeriods,
      transactions,
      selection.activePeriod.id,
    ),
    latestTransactions: selectedTransactions.slice(0, 5),
    largestCategories: [...categoryTotals.values()]
      .sort((a, b) =>
        a.amount === b.amount ? 0 : a.amount > b.amount ? -1 : 1,
      )
      .slice(0, 5),
    budget,
    recurringReminders,
    debts: debtOverview
      ? {
          totalDebt: debtOverview.totalDebt,
          totalReceivable: debtOverview.totalReceivable,
          overdueCount: debtOverview.overdueCount,
          nearestDue: nearestDebtDue
            ? {
                id: nearestDebtDue.id,
                kind: nearestDebtDue.kind,
                title: nearestDebtDue.title,
                counterparty: nearestDebtDue.counterparty,
                dueDate: nearestDebtDue.dueDate!,
                outstandingAmount: nearestDebtDue.outstandingAmount,
              }
            : null,
          latestActivities: debtActivities,
        }
      : null,
  };
}
