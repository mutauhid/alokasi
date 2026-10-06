import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/server/db/client";
import { FinanceDomainError } from "@/modules/finance/errors";
import {
  importDuplicateKey,
  type CsvCommitPayload,
  type ImportCandidate,
  type ImportRowIssue,
} from "@/modules/imports/domain";
import { transactionRequestHash } from "@/modules/transactions/service";

export type ImportContext = {
  workspaceId: string;
  actorId: string;
  role?: "owner" | "editor" | "viewer";
  today: Date;
};

type PreviewRow = ImportCandidate & { possibleDuplicate: boolean };

function assertImportRole(context: ImportContext) {
  if (context.role && !["owner", "editor"].includes(context.role)) {
    throw new FinanceDomainError("IMPORT_ACCESS_DENIED");
  }
}

async function importAccount(
  tx: Prisma.TransactionClient,
  context: ImportContext,
  accountId: string,
) {
  const account = await tx.financialAccount.findFirst({
    where: {
      id: accountId,
      workspaceId: context.workspaceId,
      archivedAt: null,
    },
    select: { id: true, openingDate: true },
  });
  if (!account) throw new FinanceDomainError("IMPORT_ACCOUNT_INVALID");
  return account;
}

async function validateCategories(
  tx: Prisma.TransactionClient,
  context: ImportContext,
  rows: ImportCandidate[],
) {
  const expected = new Map(rows.map((row) => [row.categoryId, row.type]));
  const categories = await tx.category.findMany({
    where: {
      workspaceId: context.workspaceId,
      id: { in: [...expected.keys()] },
      archivedAt: null,
    },
    select: { id: true, type: true },
  });
  if (
    categories.length !== expected.size ||
    categories.some((category) => expected.get(category.id) !== category.type)
  ) {
    throw new FinanceDomainError("IMPORT_CATEGORY_INVALID");
  }
}

async function databaseDuplicateKeys(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  accountId: string,
  rows: ImportCandidate[],
) {
  if (rows.length === 0) return new Set<string>();
  const dates = [
    ...new Map(
      rows.map((row) => [
        row.transactionDate.toISOString().slice(0, 10),
        row.transactionDate,
      ]),
    ).values(),
  ];
  const transactions = await tx.transaction.findMany({
    where: {
      workspaceId,
      accountId,
      deletedAt: null,
      destinationAccountId: null,
      type: { in: ["income", "expense"] },
      transactionDate: { in: dates },
    },
    select: {
      type: true,
      title: true,
      amount: true,
      transactionDate: true,
    },
  });
  return new Set(
    transactions
      .filter(
        (
          transaction,
        ): transaction is typeof transaction & {
          type: "income" | "expense";
        } => transaction.type === "income" || transaction.type === "expense",
      )
      .map(importDuplicateKey),
  );
}

export async function previewTransactionImport(
  context: ImportContext,
  input: { accountId: string; rows: ImportCandidate[] },
): Promise<{ rows: PreviewRow[]; issues: ImportRowIssue[] }> {
  assertImportRole(context);
  const db = getDatabase();
  const account = await importAccount(db, context, input.accountId);
  await validateCategories(db, context, input.rows);

  const issues: ImportRowIssue[] = [];
  const validRows = input.rows.filter((row) => {
    if (row.transactionDate > context.today) {
      issues.push({
        rowNumber: row.rowNumber,
        message: "tanggal berada di masa depan",
      });
      return false;
    }
    if (row.transactionDate < account.openingDate) {
      issues.push({
        rowNumber: row.rowNumber,
        message: "tanggal mendahului tanggal mulai akun",
      });
      return false;
    }
    return true;
  });
  const seen = await databaseDuplicateKeys(
    db,
    context.workspaceId,
    input.accountId,
    validRows,
  );
  const rows = validRows.map((row) => {
    const key = importDuplicateKey(row);
    const possibleDuplicate = seen.has(key);
    seen.add(key);
    return { ...row, possibleDuplicate };
  });
  return { rows, issues };
}

function batchRequestHash(input: CsvCommitPayload) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        fileName: input.fileName,
        accountId: input.accountId,
        sourceRowCount: input.sourceRowCount,
        rows: input.rows.map((row) => ({
          ...row,
          amount: row.amount.toString(),
          transactionDate: row.transactionDate.toISOString().slice(0, 10),
        })),
        selectedRowNumbers: [...input.selectedRowNumbers].sort(
          (left, right) => left - right,
        ),
        duplicateOverrideRowNumbers: [
          ...input.duplicateOverrideRowNumbers,
        ].sort((left, right) => left - right),
      }),
    )
    .digest("hex");
}

function isPrismaCode(error: unknown, code: string) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === code,
  );
}

async function commitOnce(
  context: ImportContext,
  input: CsvCommitPayload,
  requestHash: string,
) {
  const db = getDatabase();
  return db.$transaction(
    async (tx) => {
      const account = await importAccount(tx, context, input.accountId);
      await validateCategories(tx, context, input.rows);
      const selected = new Set(input.selectedRowNumbers);
      const overrides = new Set(input.duplicateOverrideRowNumbers);
      if (
        selected.size !== input.selectedRowNumbers.length ||
        overrides.size !== input.duplicateOverrideRowNumbers.length ||
        [...overrides].some((rowNumber) => !selected.has(rowNumber))
      ) {
        throw new FinanceDomainError("IMPORT_SELECTION_INVALID");
      }
      const rowsByNumber = new Map(
        input.rows.map((row) => [row.rowNumber, row]),
      );
      if ([...selected].some((rowNumber) => !rowsByNumber.has(rowNumber))) {
        throw new FinanceDomainError("IMPORT_SELECTION_INVALID");
      }
      const selectedRows = input.rows.filter((row) =>
        selected.has(row.rowNumber),
      );
      if (
        selectedRows.some(
          (row) =>
            row.transactionDate > context.today ||
            row.transactionDate < account.openingDate,
        )
      ) {
        throw new FinanceDomainError("IMPORT_DATE_INVALID");
      }

      const seen = await databaseDuplicateKeys(
        tx,
        context.workspaceId,
        input.accountId,
        selectedRows,
      );
      const importedRows: typeof selectedRows = [];
      for (const row of selectedRows) {
        const key = importDuplicateKey(row);
        if (seen.has(key) && !overrides.has(row.rowNumber)) continue;
        importedRows.push(row);
        seen.add(key);
      }

      const batch = await tx.transactionImportBatch.create({
        data: {
          workspaceId: context.workspaceId,
          accountId: input.accountId,
          createdBy: context.actorId,
          sourceFileName: input.fileName,
          sourceRowCount: input.sourceRowCount,
          importedRowCount: importedRows.length,
          skippedRowCount: input.sourceRowCount - importedRows.length,
          idempotencyKey: input.batchKey,
          requestHash,
        },
      });

      const transactions = importedRows.map((row) => {
        const id = randomUUID();
        const transactionInput = {
          type: row.type,
          title: row.title,
          amount: row.amount,
          transactionDate: row.transactionDate,
          accountId: input.accountId,
          destinationAccountId: null,
          categoryId: row.categoryId,
          note: row.note,
        };
        return {
          id,
          workspaceId: context.workspaceId,
          createdBy: context.actorId,
          updatedBy: context.actorId,
          ...transactionInput,
          idempotencyKey: `csv:${batch.id}:${row.rowNumber}`,
          requestHash: transactionRequestHash(transactionInput),
          importBatchId: batch.id,
          importRowNumber: row.rowNumber,
        };
      });
      if (transactions.length > 0) {
        await tx.transaction.createMany({ data: transactions });
        await tx.auditEvent.createMany({
          data: transactions.map((transaction) => ({
            workspaceId: context.workspaceId,
            actorId: context.actorId,
            entityType: "transaction",
            entityId: transaction.id,
            action: "created",
            changedFields: [
              "type",
              "title",
              "amount",
              "transaction_date",
              "account_id",
              "category_id",
              "note",
              "import_batch_id",
              "import_row_number",
            ],
          })),
        });
      }
      await tx.auditEvent.create({
        data: {
          workspaceId: context.workspaceId,
          actorId: context.actorId,
          entityType: "transaction_import_batch",
          entityId: batch.id,
          action: "created",
          changedFields: [
            "account_id",
            "source_file_name",
            "source_row_count",
            "imported_row_count",
            "skipped_row_count",
          ],
        },
      });
      return batch;
    },
    { isolationLevel: "Serializable" },
  );
}

export async function commitTransactionImport(
  context: ImportContext,
  input: CsvCommitPayload,
) {
  assertImportRole(context);
  const requestHash = batchRequestHash(input);
  const db = getDatabase();
  const existing = await db.transactionImportBatch.findUnique({
    where: {
      workspaceId_createdBy_idempotencyKey: {
        workspaceId: context.workspaceId,
        createdBy: context.actorId,
        idempotencyKey: input.batchKey,
      },
    },
  });
  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new FinanceDomainError("IMPORT_IDEMPOTENCY_CONFLICT");
    }
    return existing;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await commitOnce(context, input, requestHash);
    } catch (error) {
      if (isPrismaCode(error, "P2034") && attempt < 2) continue;
      if (isPrismaCode(error, "P2002")) {
        const raced = await db.transactionImportBatch.findUnique({
          where: {
            workspaceId_createdBy_idempotencyKey: {
              workspaceId: context.workspaceId,
              createdBy: context.actorId,
              idempotencyKey: input.batchKey,
            },
          },
        });
        if (raced?.requestHash === requestHash) return raced;
        throw new FinanceDomainError("IMPORT_IDEMPOTENCY_CONFLICT");
      }
      throw error;
    }
  }
  throw new FinanceDomainError("IMPORT_CONFLICT");
}

export function listTransactionImportBatches(workspaceId: string) {
  return getDatabase().transactionImportBatch.findMany({
    where: { workspaceId },
    select: {
      id: true,
      sourceFileName: true,
      sourceRowCount: true,
      importedRowCount: true,
      skippedRowCount: true,
      createdAt: true,
      account: { select: { name: true } },
      creator: {
        select: { user: { select: { displayName: true, email: true } } },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 20,
  });
}
