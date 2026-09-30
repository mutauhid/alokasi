import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { FinanceDomainError } from "@/modules/finance/errors";
import {
  nextMonthlyOccurrence,
  occurrenceOnOrAfter,
} from "@/modules/recurring/domain";
import { createTransactionInTransaction } from "@/modules/transactions/service";
import { getDatabase } from "@/server/db/client";

type RecurringContext = {
  workspaceId: string;
  actorId: string;
  role: "owner" | "editor" | "viewer";
  today: Date;
};

type RecurringFields = {
  name: string;
  type: "income" | "expense";
  amount: bigint;
  accountId: string;
  categoryId: string;
  note: string | null;
  recurrenceDay: number;
};

function requireWriter(context: RecurringContext) {
  if (context.role === "viewer") {
    throw new FinanceDomainError("RECURRING_ACCESS_DENIED");
  }
}

function editableTemplateWhere(
  context: RecurringContext,
  input: { id: string; version: number },
) {
  return {
    id: input.id,
    workspaceId: context.workspaceId,
    version: input.version,
    archivedAt: null,
    ...(context.role === "editor" ? { createdBy: context.actorId } : {}),
  };
}

async function validateReferences(
  tx: Prisma.TransactionClient,
  context: RecurringContext,
  input: Pick<RecurringFields, "accountId" | "categoryId" | "type">,
) {
  const [account, category] = await Promise.all([
    tx.financialAccount.findFirst({
      where: {
        id: input.accountId,
        workspaceId: context.workspaceId,
        archivedAt: null,
      },
      select: { id: true },
    }),
    tx.category.findFirst({
      where: {
        id: input.categoryId,
        workspaceId: context.workspaceId,
        type: input.type,
        archivedAt: null,
      },
      select: { id: true },
    }),
  ]);
  if (!account) throw new FinanceDomainError("RECURRING_ACCOUNT_INVALID");
  if (!category) throw new FinanceDomainError("RECURRING_CATEGORY_INVALID");
}

export function listRecurringTemplates(workspaceId: string) {
  return getDatabase().recurringTransactionTemplate.findMany({
    where: { workspaceId, archivedAt: null },
    include: {
      account: { select: { name: true, archivedAt: true } },
      category: { select: { name: true, archivedAt: true } },
      creator: {
        select: { user: { select: { displayName: true, email: true } } },
      },
    },
    orderBy: [{ nextDueDate: "asc" }, { createdAt: "asc" }],
  });
}

export function listRecurringReminders(
  workspaceId: string,
  today: Date,
  horizonDays = 7,
) {
  const horizon = new Date(today.valueOf() + horizonDays * 86_400_000);
  return getDatabase().recurringTransactionTemplate.findMany({
    where: {
      workspaceId,
      archivedAt: null,
      nextDueDate: { lte: horizon },
    },
    select: {
      id: true,
      name: true,
      type: true,
      amount: true,
      nextDueDate: true,
    },
    orderBy: [{ nextDueDate: "asc" }, { createdAt: "asc" }],
    take: 5,
  });
}

export async function createRecurringTemplate(
  context: RecurringContext,
  input: RecurringFields,
) {
  requireWriter(context);
  return getDatabase().$transaction(async (tx) => {
    await validateReferences(tx, context, input);
    const template = await tx.recurringTransactionTemplate.create({
      data: {
        workspaceId: context.workspaceId,
        createdBy: context.actorId,
        ...input,
        nextDueDate: occurrenceOnOrAfter(context.today, input.recurrenceDay),
      },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: context.workspaceId,
        actorId: context.actorId,
        entityType: "recurring_transaction_template",
        entityId: template.id,
        action: "created",
        changedFields: [
          "name",
          "type",
          "amount",
          "account_id",
          "category_id",
          "note",
          "recurrence_day",
          "next_due_date",
        ],
      },
    });
    return template;
  });
}

export async function updateRecurringTemplate(
  context: RecurringContext,
  input: RecurringFields & { id: string; version: number },
) {
  requireWriter(context);
  return getDatabase().$transaction(async (tx) => {
    const existing = await tx.recurringTransactionTemplate.findFirst({
      where: editableTemplateWhere(context, input),
    });
    if (!existing) throw new FinanceDomainError("RECURRING_CONFLICT");
    await validateReferences(tx, context, input);
    const nextDueDate =
      existing.recurrenceDay === input.recurrenceDay
        ? existing.nextDueDate
        : occurrenceOnOrAfter(context.today, input.recurrenceDay);
    const updated = await tx.recurringTransactionTemplate.updateMany({
      where: editableTemplateWhere(context, input),
      data: {
        name: input.name,
        type: input.type,
        amount: input.amount,
        accountId: input.accountId,
        categoryId: input.categoryId,
        note: input.note,
        recurrenceDay: input.recurrenceDay,
        nextDueDate,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new FinanceDomainError("RECURRING_CONFLICT");
    }
    await tx.auditEvent.create({
      data: {
        workspaceId: context.workspaceId,
        actorId: context.actorId,
        entityType: "recurring_transaction_template",
        entityId: input.id,
        action: "updated",
        changedFields: [
          "name",
          "type",
          "amount",
          "account_id",
          "category_id",
          "note",
          "recurrence_day",
          "next_due_date",
          "version",
        ],
      },
    });
  });
}

export async function archiveRecurringTemplate(
  context: RecurringContext,
  input: { id: string; version: number },
) {
  requireWriter(context);
  return getDatabase().$transaction(async (tx) => {
    const archived = await tx.recurringTransactionTemplate.updateMany({
      where: editableTemplateWhere(context, input),
      data: { archivedAt: new Date(), version: { increment: 1 } },
    });
    if (archived.count !== 1) {
      throw new FinanceDomainError("RECURRING_CONFLICT");
    }
    await tx.auditEvent.create({
      data: {
        workspaceId: context.workspaceId,
        actorId: context.actorId,
        entityType: "recurring_transaction_template",
        entityId: input.id,
        action: "archived",
        changedFields: ["archived_at", "version"],
      },
    });
  });
}

export async function skipRecurringOccurrence(
  context: RecurringContext,
  input: { id: string; version: number },
) {
  requireWriter(context);
  return getDatabase().$transaction(async (tx) => {
    const template = await tx.recurringTransactionTemplate.findFirst({
      where: editableTemplateWhere(context, input),
    });
    if (!template) throw new FinanceDomainError("RECURRING_CONFLICT");
    if (template.nextDueDate > context.today) {
      throw new FinanceDomainError("RECURRING_NOT_DUE");
    }
    const advanced = await tx.recurringTransactionTemplate.updateMany({
      where: {
        ...editableTemplateWhere(context, input),
        nextDueDate: template.nextDueDate,
      },
      data: {
        nextDueDate: nextMonthlyOccurrence(
          template.nextDueDate,
          template.recurrenceDay,
        ),
        version: { increment: 1 },
      },
    });
    if (advanced.count !== 1) {
      throw new FinanceDomainError("RECURRING_CONFLICT");
    }
    await tx.auditEvent.create({
      data: {
        workspaceId: context.workspaceId,
        actorId: context.actorId,
        entityType: "recurring_transaction_template",
        entityId: template.id,
        action: "occurrence_skipped",
        changedFields: ["next_due_date", "version"],
      },
    });
  });
}

export async function postRecurringOccurrence(
  context: RecurringContext,
  input: { id: string; version: number },
) {
  requireWriter(context);
  try {
    return await getDatabase().$transaction(async (tx) => {
      const template = await tx.recurringTransactionTemplate.findFirst({
        where: editableTemplateWhere(context, input),
      });
      if (!template) throw new FinanceDomainError("RECURRING_CONFLICT");
      if (template.nextDueDate > context.today) {
        throw new FinanceDomainError("RECURRING_NOT_DUE");
      }
      const dueDate = template.nextDueDate;
      const advanced = await tx.recurringTransactionTemplate.updateMany({
        where: {
          ...editableTemplateWhere(context, input),
          nextDueDate: dueDate,
        },
        data: {
          nextDueDate: nextMonthlyOccurrence(dueDate, template.recurrenceDay),
          version: { increment: 1 },
        },
      });
      if (advanced.count !== 1) {
        throw new FinanceDomainError("RECURRING_CONFLICT");
      }
      const transaction = await createTransactionInTransaction(tx, context, {
        type: template.type as "income" | "expense",
        title: template.name,
        amount: template.amount,
        transactionDate: dueDate,
        accountId: template.accountId,
        destinationAccountId: null,
        categoryId: template.categoryId,
        note: template.note ?? template.name,
        idempotencyKey: `recurring:${template.id}:${dueDate.toISOString().slice(0, 10)}`,
        recurringTemplateId: template.id,
        recurringDueDate: dueDate,
      });
      await tx.auditEvent.create({
        data: {
          workspaceId: context.workspaceId,
          actorId: context.actorId,
          entityType: "recurring_transaction_template",
          entityId: template.id,
          action: "occurrence_posted",
          changedFields: ["next_due_date", "version"],
        },
      });
      return transaction;
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new FinanceDomainError("RECURRING_CONFLICT");
    }
    throw error;
  }
}
