export type CashFlowPeriod = {
  id: string;
  startDate: Date;
  endDateExclusive: Date;
  isTransition: boolean;
};

export type CashFlowTransaction = {
  type: "income" | "expense" | "transfer";
  amount: bigint;
  transactionDate: Date;
};

export function buildCashFlowTrend(
  periods: CashFlowPeriod[],
  transactions: CashFlowTransaction[],
  activePeriodId: string,
) {
  return periods.map((period) => {
    let income = 0n;
    let expense = 0n;
    for (const transaction of transactions) {
      if (
        transaction.transactionDate < period.startDate ||
        transaction.transactionDate >= period.endDateExclusive
      ) {
        continue;
      }
      if (transaction.type === "income") income += transaction.amount;
      if (transaction.type === "expense") expense += transaction.amount;
    }
    return {
      ...period,
      income,
      expense,
      isActive: period.id === activePeriodId,
    };
  });
}
