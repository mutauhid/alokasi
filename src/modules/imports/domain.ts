import { z } from "zod";
import { isDatabaseBigInt } from "@/modules/finance/domain";

export const MAX_CSV_FILE_BYTES = 512_000;
export const MAX_IMPORT_ROWS = 300;
export const MAX_CSV_COLUMNS = 30;
export const MAX_CSV_CELL_LENGTH = 500;

export type CsvTable = {
  headers: string[];
  rows: string[][];
  delimiter: "," | ";" | "\t";
};

export class CsvImportParseError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "CsvImportParseError";
  }
}

function firstRecord(value: string) {
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '"') {
      if (quoted && value[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && (value[index] === "\n" || value[index] === "\r")) {
      return value.slice(0, index);
    }
  }
  return value;
}

function delimiterCount(record: string, delimiter: string) {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < record.length; index += 1) {
    if (record[index] === '"') {
      if (quoted && record[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && record[index] === delimiter) {
      count += 1;
    }
  }
  return count;
}

function detectDelimiter(value: string): CsvTable["delimiter"] {
  const record = firstRecord(value);
  const candidates = ([",", ";", "\t"] as const).map((delimiter) => ({
    delimiter,
    count: delimiterCount(record, delimiter),
  }));
  candidates.sort((left, right) => right.count - left.count);
  if (!candidates[0] || candidates[0].count === 0) {
    throw new CsvImportParseError("CSV_DELIMITER");
  }
  return candidates[0].delimiter;
}

function parseRows(value: string, delimiter: CsvTable["delimiter"]) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const finishCell = () => {
    if (cell.length > MAX_CSV_CELL_LENGTH) {
      throw new CsvImportParseError("CSV_CELL_TOO_LONG");
    }
    row.push(cell);
    cell = "";
  };
  const finishRow = () => {
    finishCell();
    if (row.length > MAX_CSV_COLUMNS) {
      throw new CsvImportParseError("CSV_TOO_MANY_COLUMNS");
    }
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quoted) {
      if (character === '"') {
        if (value[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === delimiter) {
      finishCell();
    } else if (character === "\n" || character === "\r") {
      finishRow();
      if (character === "\r" && value[index + 1] === "\n") index += 1;
    } else {
      cell += character;
    }
  }
  if (quoted) throw new CsvImportParseError("CSV_UNCLOSED_QUOTE");
  if (cell.length > 0 || row.length > 0) finishRow();
  return rows.filter((item) => item.some((value) => value.trim().length > 0));
}

export function parseCsvDocument(value: string): CsvTable {
  const normalized = value.replace(/^\uFEFF/u, "");
  if (!normalized.trim()) throw new CsvImportParseError("CSV_EMPTY");
  const delimiter = detectDelimiter(normalized);
  const parsed = parseRows(normalized, delimiter);
  if (parsed.length < 2) throw new CsvImportParseError("CSV_NO_DATA");
  const [rawHeaders, ...rows] = parsed;
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new CsvImportParseError("CSV_TOO_MANY_ROWS");
  }
  const headers = rawHeaders.map(
    (header, index) => header.normalize("NFC").trim() || `Kolom ${index + 1}`,
  );
  return { headers, rows, delimiter };
}

const columnIndex = z
  .number()
  .int()
  .min(0)
  .max(MAX_CSV_COLUMNS - 1);
const rawRows = z
  .array(
    z.array(z.string().max(MAX_CSV_CELL_LENGTH)).min(1).max(MAX_CSV_COLUMNS),
  )
  .min(1)
  .max(MAX_IMPORT_ROWS);

const baseMapping = z.object({
  dateColumn: columnIndex,
  titleColumn: columnIndex,
  noteColumn: z.union([columnIndex, z.literal(-1)]),
});

export const csvPreviewPayloadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  accountId: z.uuid(),
  incomeCategoryId: z.union([z.uuid(), z.literal("")]),
  expenseCategoryId: z.union([z.uuid(), z.literal("")]),
  rows: rawRows,
  mapping: z.discriminatedUnion("amountMode", [
    baseMapping.extend({
      amountMode: z.literal("signed"),
      amountColumn: columnIndex,
      positiveType: z.enum(["income", "expense"]),
    }),
    baseMapping.extend({
      amountMode: z.literal("separate"),
      incomeColumn: columnIndex,
      expenseColumn: columnIndex,
    }),
  ]),
});

export type CsvPreviewPayload = z.infer<typeof csvPreviewPayloadSchema>;

export type ImportCandidate = {
  rowNumber: number;
  type: "income" | "expense";
  title: string;
  amount: bigint;
  transactionDate: Date;
  categoryId: string;
  note: string | null;
};

export type ImportRowIssue = {
  rowNumber: number;
  message: string;
};

function normalizedText(value: string, maximum: number) {
  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  return normalized.length > 0 && normalized.length <= maximum
    ? normalized
    : null;
}

function calendarDate(value: string) {
  const trimmed = value.trim();
  let year: string;
  let month: string;
  let day: string;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(trimmed);
  const local = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/u.exec(trimmed);
  if (iso) [, year, month, day] = iso;
  else if (local) [, day, month, year] = local;
  else return null;
  const result = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(`${result}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(result)
    ? date
    : null;
}

function integerAmount(value: string) {
  let normalized = value
    .normalize("NFC")
    .trim()
    .replace(/^(?:rp|idr)\s*/iu, "")
    .replace(/\s+/gu, "");
  if (!normalized) return null;
  let negative = false;
  if (/^\(.*\)$/u.test(normalized)) {
    negative = true;
    normalized = normalized.slice(1, -1);
  }
  if (normalized.startsWith("-")) {
    negative = !negative;
    normalized = normalized.slice(1);
  } else if (normalized.startsWith("+")) {
    normalized = normalized.slice(1);
  }

  let digits: string | null = null;
  if (/^\d+$/u.test(normalized)) digits = normalized;
  else if (/^\d{1,3}(?:\.\d{3})+(?:,00)?$/u.test(normalized)) {
    digits = normalized.replace(/,00$/u, "").replaceAll(".", "");
  } else if (/^\d{1,3}(?:,\d{3})+(?:\.00)?$/u.test(normalized)) {
    digits = normalized.replace(/\.00$/u, "").replaceAll(",", "");
  } else if (/^\d+[.,]00$/u.test(normalized)) {
    digits = normalized.slice(0, -3);
  }
  if (!digits) return null;
  const amount = BigInt(digits);
  const signed = negative ? -amount : amount;
  return isDatabaseBigInt(signed) ? signed : null;
}

function mappingColumns(mapping: CsvPreviewPayload["mapping"]) {
  const columns = [mapping.dateColumn, mapping.titleColumn];
  if (mapping.noteColumn >= 0) columns.push(mapping.noteColumn);
  if (mapping.amountMode === "signed") columns.push(mapping.amountColumn);
  else columns.push(mapping.incomeColumn, mapping.expenseColumn);
  return columns;
}

export function hasDistinctCsvMapping(payload: CsvPreviewPayload) {
  const columns = mappingColumns(payload.mapping);
  return new Set(columns).size === columns.length;
}

export function mapCsvImportRows(payload: CsvPreviewPayload): {
  candidates: ImportCandidate[];
  issues: ImportRowIssue[];
} {
  const candidates: ImportCandidate[] = [];
  const issues: ImportRowIssue[] = [];
  payload.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const cell = (column: number) => row[column]?.trim() ?? "";
    const transactionDate = calendarDate(cell(payload.mapping.dateColumn));
    const title = normalizedText(cell(payload.mapping.titleColumn), 100);
    const note =
      payload.mapping.noteColumn >= 0
        ? normalizedText(cell(payload.mapping.noteColumn), 1000)
        : null;

    let type: "income" | "expense" | null = null;
    let amount: bigint | null = null;
    if (payload.mapping.amountMode === "signed") {
      const signed = integerAmount(cell(payload.mapping.amountColumn));
      if (signed !== null && signed !== 0n) {
        const positive = payload.mapping.positiveType;
        type =
          signed > 0n ? positive : positive === "income" ? "expense" : "income";
        amount = signed < 0n ? -signed : signed;
      }
    } else {
      const income = integerAmount(cell(payload.mapping.incomeColumn));
      const expense = integerAmount(cell(payload.mapping.expenseColumn));
      if (
        income !== null &&
        income > 0n &&
        (expense === null || expense === 0n)
      ) {
        type = "income";
        amount = income;
      } else if (
        expense !== null &&
        expense > 0n &&
        (income === null || income === 0n)
      ) {
        type = "expense";
        amount = expense;
      }
    }

    const categoryId =
      type === "income"
        ? payload.incomeCategoryId
        : type === "expense"
          ? payload.expenseCategoryId
          : "";
    const problems = [
      !transactionDate ? "tanggal tidak dikenali" : null,
      !title ? "deskripsi kosong atau terlalu panjang" : null,
      !type || !amount || amount <= 0n ? "nominal tidak valid" : null,
      type && !categoryId
        ? `kategori ${type === "income" ? "pemasukan" : "pengeluaran"} belum dipilih`
        : null,
    ].filter((problem): problem is string => Boolean(problem));
    if (problems.length > 0 || !transactionDate || !title || !type || !amount) {
      issues.push({ rowNumber, message: problems.join(", ") });
      return;
    }
    candidates.push({
      rowNumber,
      type,
      title,
      amount,
      transactionDate,
      categoryId,
      note,
    });
  });
  return { candidates, issues };
}

export const csvCommitPayloadSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    accountId: z.uuid(),
    batchKey: z.string().trim().min(1).max(128),
    sourceRowCount: z.number().int().min(1).max(MAX_IMPORT_ROWS),
    rows: z
      .array(
        z.object({
          rowNumber: z
            .number()
            .int()
            .min(2)
            .max(MAX_IMPORT_ROWS + 1),
          type: z.enum(["income", "expense"]),
          title: z.string().min(1).max(100),
          amount: z
            .string()
            .regex(/^\d+$/u)
            .transform((value) => BigInt(value))
            .refine((value) => value > 0n && isDatabaseBigInt(value)),
          transactionDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/u)
            .refine((value) => {
              const date = new Date(`${value}T00:00:00.000Z`);
              return (
                !Number.isNaN(date.valueOf()) &&
                date.toISOString().startsWith(value)
              );
            })
            .transform((value) => new Date(`${value}T00:00:00.000Z`)),
          categoryId: z.uuid(),
          note: z.string().max(1000).nullable(),
          possibleDuplicate: z.boolean(),
        }),
      )
      .min(1)
      .max(MAX_IMPORT_ROWS),
    selectedRowNumbers: z
      .array(
        z
          .number()
          .int()
          .min(2)
          .max(MAX_IMPORT_ROWS + 1),
      )
      .min(1)
      .max(MAX_IMPORT_ROWS),
    duplicateOverrideRowNumbers: z
      .array(
        z
          .number()
          .int()
          .min(2)
          .max(MAX_IMPORT_ROWS + 1),
      )
      .max(MAX_IMPORT_ROWS),
  })
  .refine((input) => input.sourceRowCount >= input.rows.length);

export type CsvCommitPayload = z.infer<typeof csvCommitPayloadSchema>;

export function importDuplicateKey(input: {
  type: "income" | "expense";
  title: string;
  amount: bigint;
  transactionDate: Date;
}) {
  const title = input.title
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("id-ID");
  return [
    input.type,
    input.transactionDate.toISOString().slice(0, 10),
    input.amount.toString(),
    title,
  ].join("|");
}
