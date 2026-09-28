import { z } from "zod";
import { toDatabaseDate } from "@/modules/finance/domain";

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .refine((value) => {
    const date = toDatabaseDate(value);
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
    );
  });

const optionalText = (maximum: number) =>
  z
    .string()
    .transform((value) => value.normalize("NFC").trim().replace(/\s+/gu, " "))
    .pipe(z.string().max(maximum))
    .transform((value) => value || null);

export const submitReceiptDraftInput = z.object({
  draftId: z.uuid(),
  version: z.coerce.number().int().positive(),
  amount: z
    .string()
    .trim()
    .regex(/^\d+$/u)
    .transform(BigInt)
    .refine((value) => value > 0n && value <= 9223372036854775807n),
  transactionDate: dateField.transform(toDatabaseDate),
  merchant: optionalText(200),
  note: optionalText(1000),
  accountId: z.uuid(),
  categoryId: z.uuid(),
});

export const cancelReceiptDraftInput = z.object({
  draftId: z.uuid(),
  version: z.coerce.number().int().positive(),
});

const nullableConfidence = z.union([
  z.literal("").transform(() => null),
  z.coerce.number().int().min(0).max(100),
]);

export const createLocalReceiptDraftInput = z.object({
  amount: z.union([
    z.literal("").transform(() => null),
    z
      .string()
      .trim()
      .regex(/^\d+$/u)
      .transform(BigInt)
      .refine((value) => value > 0n && value <= 9223372036854775807n),
  ]),
  transactionDate: z.union([
    z.literal("").transform(() => null),
    dateField.transform(toDatabaseDate),
  ]),
  merchant: optionalText(200),
  note: optionalText(1000),
  institution: optionalText(100),
  evidenceKind: z.enum(["transfer", "qris", "receipt", "unknown"]),
  paymentRail: optionalText(50),
  ocrConfidence: z.coerce.number().int().min(0).max(100),
  amountConfidence: nullableConfidence,
  dateConfidence: nullableConfidence,
  merchantConfidence: nullableConfidence,
  institutionConfidence: nullableConfidence,
});

export type SubmitReceiptDraftInput = z.infer<typeof submitReceiptDraftInput>;
export type CreateLocalReceiptDraftInput = z.infer<
  typeof createLocalReceiptDraftInput
>;

export function receiptTransactionNote(
  merchant: string | null,
  note: string | null,
) {
  const parts = [merchant, note].filter(
    (value, index, values): value is string =>
      Boolean(value) && values.indexOf(value) === index,
  );
  return parts.length ? parts.join(" · ").slice(0, 1000) : null;
}
