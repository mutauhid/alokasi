import { z } from "zod";

const dateValue = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
    );
  });

const optionalUuid = z.union([z.uuid(), z.literal("")]);

const reportFilterInput = z.object({
  from: dateValue,
  to: dateValue,
  type: z.enum(["", "income", "expense", "transfer"]),
  accountId: optionalUuid,
  categoryId: optionalUuid,
  query: z
    .string()
    .trim()
    .max(100)
    .transform((value) => value.normalize("NFC")),
});

export type ReportFilters = {
  from: Date;
  toExclusive: Date;
  fromValue: string;
  toValue: string;
  type: "income" | "expense" | "transfer" | null;
  accountId: string | null;
  categoryId: string | null;
  query: string | null;
};

function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

export function resolveReportFilters(
  input: Record<string, string | undefined>,
  defaults: { from: string; to: string },
) {
  const parsed = reportFilterInput.safeParse({
    from: input.from || defaults.from,
    to: input.to || defaults.to,
    type: input.type ?? "",
    accountId: input.accountId ?? "",
    categoryId: input.categoryId ?? "",
    query: input.query ?? "",
  });
  if (!parsed.success || parsed.data.from > parsed.data.to) {
    return {
      valid: false as const,
      filters: {
        from: new Date(`${defaults.from}T00:00:00.000Z`),
        toExclusive: nextDate(defaults.to),
        fromValue: defaults.from,
        toValue: defaults.to,
        type: null,
        accountId: null,
        categoryId: null,
        query: null,
      } satisfies ReportFilters,
    };
  }
  return {
    valid: true as const,
    filters: {
      from: new Date(`${parsed.data.from}T00:00:00.000Z`),
      toExclusive: nextDate(parsed.data.to),
      fromValue: parsed.data.from,
      toValue: parsed.data.to,
      type: parsed.data.type || null,
      accountId: parsed.data.accountId || null,
      categoryId: parsed.data.categoryId || null,
      query: parsed.data.query || null,
    } satisfies ReportFilters,
  };
}

export function csvCell(value: string) {
  const safe = /^[\s]*[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function csvDocument(rows: string[][]) {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
