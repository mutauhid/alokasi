import { z } from "zod";

export const accountTypes = ["bank", "cash", "ewallet"] as const;
export const categoryTypes = ["income", "expense"] as const;
export const transactionTypes = ["income", "expense", "transfer"] as const;
export const reconciliationResolutions = ["matched", "adjusted"] as const;

export const MIN_DATABASE_BIGINT = -9223372036854775808n;
export const MAX_DATABASE_BIGINT = 9223372036854775807n;

export function isDatabaseBigInt(value: bigint) {
  return value >= MIN_DATABASE_BIGINT && value <= MAX_DATABASE_BIGINT;
}

const normalizedName = (maximum: number) =>
  z
    .string()
    .transform((value) => value.normalize("NFC").trim().replace(/\s+/gu, " "))
    .pipe(z.string().min(1).max(maximum));

export const createAccountInput = z.object({
  name: normalizedName(100),
  type: z.enum(accountTypes),
  openingBalance: z
    .string()
    .trim()
    .regex(/^-?\d+$/u)
    .transform((value) => BigInt(value))
    .refine(
      (value) =>
        value >= -9223372036854775808n && value <= 9223372036854775807n,
    ),
  openingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
      );
    }),
});

export const renameInput = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
  name: normalizedName(100),
});

export const versionedInput = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
});

export const createReconciliationInput = z.object({
  accountId: z.uuid(),
  actualBalance: z
    .string()
    .trim()
    .regex(/^-?\d+$/u)
    .transform((value) => BigInt(value))
    .refine(isDatabaseBigInt),
  reconciliationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
      );
    }),
  resolution: z.enum(reconciliationResolutions),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((value) => value || null),
  idempotencyKey: z.string().trim().min(1).max(128),
});

export const createCategoryInput = z.object({
  name: normalizedName(50),
  type: z.enum(categoryTypes),
});

export const renameCategoryInput = renameInput.extend({
  name: normalizedName(50),
});

const transactionFields = z.object({
  type: z.enum(transactionTypes),
  title: normalizedName(100),
  amount: z
    .string()
    .trim()
    .regex(/^\d+$/u)
    .transform((value) => BigInt(value))
    .refine((value) => value > 0n && value <= 9223372036854775807n),
  transactionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
      );
    }),
  accountId: z.uuid(),
  destinationAccountId: z.union([z.uuid(), z.literal("")]),
  categoryId: z.union([z.uuid(), z.literal("")]),
  note: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => value || null),
});

export const createTransactionInput = transactionFields.extend({
  idempotencyKey: z.string().trim().min(1).max(128),
});

export const updateTransactionInput = transactionFields.extend({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
});

const budgetAmount = z
  .string()
  .trim()
  .regex(/^\d+$/u)
  .transform((value) => BigInt(value))
  .refine((value) => value > 0n && value <= 9223372036854775807n);

export const createBudgetInput = z.object({
  categoryId: z.uuid(),
  limitAmount: budgetAmount,
});

export const updateBudgetInput = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
  limitAmount: budgetAmount,
});

export const copyBudgetsInput = z.object({
  sourcePeriodId: z.uuid(),
  targetPeriodId: z.uuid(),
  categoryIds: z
    .array(z.uuid())
    .min(1)
    .max(100)
    .refine(
      (values) => new Set(values).size === values.length,
      "Kategori tidak boleh berulang",
    ),
});

export function categoryNameKey(name: string) {
  return name.toLocaleLowerCase("id-ID");
}

export function toDatabaseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function budgetPercent(actual: bigint, limit: bigint) {
  return limit > 0n ? (actual * 100n) / limit : 0n;
}

export function budgetStatus(actual: bigint, limit: bigint) {
  const percent = budgetPercent(actual, limit);
  if (percent > 100n) return "Terlampaui";
  if (percent === 100n) return "Habis";
  if (percent >= 80n) return "Hampir habis";
  return "Normal";
}

export type BalanceTransaction = {
  type: "income" | "expense" | "transfer";
  amount: bigint;
  accountId: string;
  destinationAccountId: string | null;
};

export type AccountBalanceAdjustment = {
  accountId: string;
  amount: bigint;
};

export function calculateAccountBalances(
  accounts: Array<{ id: string; openingBalance: bigint }>,
  transactions: BalanceTransaction[],
  adjustments: AccountBalanceAdjustment[] = [],
) {
  const balances = new Map(
    accounts.map((account) => [account.id, account.openingBalance]),
  );
  for (const transaction of transactions) {
    const source = balances.get(transaction.accountId);
    if (source !== undefined) {
      balances.set(
        transaction.accountId,
        transaction.type === "income"
          ? source + transaction.amount
          : source - transaction.amount,
      );
    }
    if (transaction.type === "transfer" && transaction.destinationAccountId) {
      const destination = balances.get(transaction.destinationAccountId);
      if (destination !== undefined) {
        balances.set(
          transaction.destinationAccountId,
          destination + transaction.amount,
        );
      }
    }
  }
  for (const adjustment of adjustments) {
    const balance = balances.get(adjustment.accountId);
    if (balance !== undefined) {
      balances.set(adjustment.accountId, balance + adjustment.amount);
    }
  }
  return balances;
}

export function reconciliationDifference(
  recordedBalance: bigint,
  actualBalance: bigint,
) {
  const difference = actualBalance - recordedBalance;
  if (!isDatabaseBigInt(recordedBalance) || !isDatabaseBigInt(difference)) {
    throw new RangeError("Balance reconciliation exceeds BIGINT range");
  }
  return difference;
}
