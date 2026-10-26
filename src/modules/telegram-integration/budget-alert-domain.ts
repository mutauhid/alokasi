export type BudgetAlertThreshold = 80 | 100;

export function budgetAlertThreshold(
  actualAmount: bigint,
  limitAmount: bigint,
): BudgetAlertThreshold | null {
  if (limitAmount <= 0n || actualAmount < 0n) return null;
  if (actualAmount >= limitAmount) return 100;
  if (actualAmount * 100n >= limitAmount * 80n) return 80;
  return null;
}

function rupiah(value: bigint) {
  return `Rp${new Intl.NumberFormat("id-ID").format(value)}`;
}

function dateLabel(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export function budgetAlertMessage(input: {
  categoryName: string;
  threshold: BudgetAlertThreshold;
  actualAmount: bigint;
  limitAmount: bigint;
  startDate: Date;
  endDateExclusive: Date;
}) {
  const usedPercent = Number((input.actualAmount * 100n) / input.limitAmount);
  const endDate = new Date(input.endDateExclusive);
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  const difference = input.limitAmount - input.actualAmount;
  const balanceLine =
    difference >= 0n
      ? `Sisa: ${rupiah(difference)}`
      : `Melebihi limit: ${rupiah(-difference)}`;
  const headline =
    input.threshold === 100
      ? `🚨 Budget ${input.categoryName} sudah mencapai limit.`
      : `⚠️ Budget ${input.categoryName} sudah terpakai ${usedPercent}%.`;
  return [
    headline,
    `Terpakai: ${rupiah(input.actualAmount)} dari ${rupiah(input.limitAmount)}`,
    balanceLine,
    `Periode: ${dateLabel(input.startDate)}–${dateLabel(endDate)}`,
  ].join("\n");
}
