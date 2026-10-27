import { z } from "zod";
import { isDatabaseBigInt } from "@/modules/finance/domain";

export const debtKinds = ["debt", "receivable"] as const;
export const debtOrigins = ["current", "historical"] as const;

const normalizedText = (maximum: number) =>
  z
    .string()
    .transform((value) => value.normalize("NFC").trim().replace(/\s+/gu, " "))
    .pipe(z.string().min(1).max(maximum));

const positiveAmount = z
  .string()
  .trim()
  .regex(/^\d+$/u)
  .transform((value) => BigInt(value))
  .refine((value) => value > 0n && isDatabaseBigInt(value));

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
    );
  });

export const createDebtRecordInput = z
  .object({
    kind: z.enum(debtKinds),
    origin: z.enum(debtOrigins),
    counterparty: normalizedText(100),
    title: normalizedText(100),
    principalAmount: positiveAmount,
    startDate: calendarDate,
    dueDate: z
      .union([calendarDate, z.literal("")])
      .transform((value) => value || null),
    accountId: z.union([z.uuid(), z.literal("")]),
    note: z
      .string()
      .trim()
      .max(1000)
      .transform((value) => value || null),
    idempotencyKey: z.string().trim().min(1).max(128),
  })
  .superRefine((value, context) => {
    if (value.dueDate && value.dueDate < value.startDate) {
      context.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Tanggal jatuh tempo tidak boleh sebelum tanggal mulai.",
      });
    }
    if (value.origin === "current" && !value.accountId) {
      context.addIssue({
        code: "custom",
        path: ["accountId"],
        message: "Akun wajib dipilih untuk catatan baru.",
      });
    }
    if (value.origin === "historical" && value.accountId) {
      context.addIssue({
        code: "custom",
        path: ["accountId"],
        message: "Catatan lama tidak mengubah saldo awal.",
      });
    }
  });

export const createDebtPaymentInput = z.object({
  debtRecordId: z.uuid(),
  accountId: z.uuid(),
  amount: positiveAmount,
  paymentDate: calendarDate,
  note: z
    .string()
    .trim()
    .max(500)
    .transform((value) => value || null),
  idempotencyKey: z.string().trim().min(1).max(128),
});

export const settleDebtRecordInput = createDebtPaymentInput.omit({
  amount: true,
});

export type DebtStatus = "unpaid" | "partial" | "settled" | "overdue";

export function debtStatus(input: {
  principalAmount: bigint;
  paidAmount: bigint;
  dueDate: Date | null;
  today: Date;
}): DebtStatus {
  if (input.paidAmount >= input.principalAmount) return "settled";
  if (input.dueDate && input.dueDate < input.today) return "overdue";
  return input.paidAmount > 0n ? "partial" : "unpaid";
}

export function debtOutstanding(principalAmount: bigint, paidAmount: bigint) {
  return principalAmount > paidAmount ? principalAmount - paidAmount : 0n;
}

export function debtReminderPhase(
  dueDate: Date,
  today: Date,
  outstandingAmount: bigint,
) {
  if (outstandingAmount <= 0n) return null;
  const days = Math.round((dueDate.valueOf() - today.valueOf()) / 86_400_000);
  if (days === 3) return "d-3" as const;
  if (days === 0) return "due" as const;
  return null;
}

export function debtBalanceAdjustments(
  records: Array<{
    kind: "debt" | "receivable";
    origin: "current" | "historical";
    principalAmount: bigint;
    accountId: string | null;
  }>,
  payments: Array<{
    kind: "debt" | "receivable";
    amount: bigint;
    accountId: string;
  }>,
) {
  return [
    ...records.flatMap((record) =>
      record.origin === "current" && record.accountId
        ? [
            {
              accountId: record.accountId,
              amount:
                record.kind === "debt"
                  ? record.principalAmount
                  : -record.principalAmount,
            },
          ]
        : [],
    ),
    ...payments.map((payment) => ({
      accountId: payment.accountId,
      amount: payment.kind === "debt" ? -payment.amount : payment.amount,
    })),
  ];
}
