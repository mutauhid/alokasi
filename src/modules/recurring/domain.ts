import { z } from "zod";

const normalizedText = (maximum: number) =>
  z
    .string()
    .transform((value) => value.normalize("NFC").trim().replace(/\s+/gu, " "))
    .pipe(z.string().min(1).max(maximum));

const recurringFields = z.object({
  name: normalizedText(100),
  type: z.enum(["income", "expense"]),
  amount: z
    .string()
    .trim()
    .regex(/^\d+$/u)
    .transform((value) => BigInt(value))
    .refine((value) => value > 0n && value <= 9223372036854775807n),
  accountId: z.uuid(),
  categoryId: z.uuid(),
  note: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => value || null),
  recurrenceDay: z.coerce.number().int().min(1).max(31),
});

export const createRecurringTemplateInput = recurringFields;

export const updateRecurringTemplateInput = recurringFields.extend({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
});

export const recurringTemplateMutationInput = z.object({
  id: z.uuid(),
  version: z.coerce.number().int().positive(),
});

function daysInUtcMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function monthlyOccurrence(
  year: number,
  month: number,
  recurrenceDay: number,
) {
  const day = Math.min(recurrenceDay, daysInUtcMonth(year, month));
  return new Date(Date.UTC(year, month, day));
}

export function occurrenceOnOrAfter(today: Date, recurrenceDay: number) {
  const thisMonth = monthlyOccurrence(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    recurrenceDay,
  );
  return thisMonth >= today
    ? thisMonth
    : monthlyOccurrence(
        today.getUTCFullYear(),
        today.getUTCMonth() + 1,
        recurrenceDay,
      );
}

export function nextMonthlyOccurrence(
  currentDueDate: Date,
  recurrenceDay: number,
) {
  return monthlyOccurrence(
    currentDueDate.getUTCFullYear(),
    currentDueDate.getUTCMonth() + 1,
    recurrenceDay,
  );
}

export function calendarDayDifference(from: Date, to: Date) {
  return Math.round((to.valueOf() - from.valueOf()) / 86_400_000);
}
