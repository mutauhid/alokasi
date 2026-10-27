import "server-only";

import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/server/db/client";
import type { WorkspaceAccess } from "@/modules/workspaces/service";
import { FinanceDomainError } from "@/modules/finance/errors";
import { debtOutstanding, debtStatus } from "./domain";
import { safelyRefreshAndDeliverWebPush } from "@/modules/web-push/events";

type DebtRecordInput = {
  kind: "debt" | "receivable";
  origin: "current" | "historical";
  counterparty: string;
  title: string;
  principalAmount: bigint;
  startDate: Date;
  dueDate: Date | null;
  accountId: string | null;
  note: string | null;
  idempotencyKey: string;
};

type DebtPaymentInput = {
  debtRecordId: string;
  accountId: string;
  amount: bigint;
  paymentDate: Date;
  note: string | null;
  idempotencyKey: string;
};

type DebtSettlementInput = Omit<DebtPaymentInput, "amount">;

function ensureMutablePersonalWorkspace(access: WorkspaceAccess) {
  if (
    access.workspaceType !== "personal" ||
    !["owner", "editor"].includes(access.role)
  ) {
    throw new FinanceDomainError("DEBT_ACCESS_DENIED");
  }
}

function recordHash(input: DebtRecordInput) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        ...input,
        principalAmount: input.principalAmount.toString(),
        startDate: input.startDate.toISOString().slice(0, 10),
        dueDate: input.dueDate?.toISOString().slice(0, 10) ?? null,
      }),
    )
    .digest("hex");
}

function paymentHash(input: DebtPaymentInput) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        ...input,
        amount: input.amount.toString(),
        paymentDate: input.paymentDate.toISOString().slice(0, 10),
      }),
    )
    .digest("hex");
}

function settlementHash(input: DebtSettlementInput) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        ...input,
        mode: "full",
        paymentDate: input.paymentDate.toISOString().slice(0, 10),
      }),
    )
    .digest("hex");
}

function isUniqueViolation(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002",
  );
}

export async function createDebtRecord(
  access: WorkspaceAccess & { today: Date },
  input: DebtRecordInput,
) {
  ensureMutablePersonalWorkspace(access);
  if (input.startDate > access.today) {
    throw new FinanceDomainError("DEBT_FUTURE_DATE");
  }
  if (
    (input.origin === "current" && !input.accountId) ||
    (input.origin === "historical" && input.accountId)
  ) {
    throw new FinanceDomainError("DEBT_INVALID_ORIGIN");
  }
  const hash = recordHash(input);
  const db = getDatabase();
  try {
    const record = await db.$transaction(async (tx) => {
      const existing = await tx.debtRecord.findUnique({
        where: {
          workspaceId_createdBy_idempotencyKey: {
            workspaceId: access.workspaceId,
            createdBy: access.actorId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (existing) {
        if (existing.requestHash !== hash) {
          throw new FinanceDomainError("DEBT_IDEMPOTENCY_CONFLICT");
        }
        return existing;
      }
      if (input.accountId) {
        const account = await tx.financialAccount.findFirst({
          where: {
            id: input.accountId,
            workspaceId: access.workspaceId,
            archivedAt: null,
          },
          select: { openingDate: true },
        });
        if (!account) throw new FinanceDomainError("DEBT_ACCOUNT_INVALID");
        if (input.startDate < account.openingDate) {
          throw new FinanceDomainError("DEBT_BEFORE_ACCOUNT");
        }
      }
      const created = await tx.debtRecord.create({
        data: {
          workspaceId: access.workspaceId,
          createdBy: access.actorId,
          ...input,
          requestHash: hash,
        },
      });
      await tx.auditEvent.create({
        data: {
          workspaceId: access.workspaceId,
          actorId: access.actorId,
          entityType: "debt_record",
          entityId: created.id,
          action: "created",
          changedFields: [
            "kind",
            "origin",
            "counterparty",
            "title",
            "principal_amount",
            "start_date",
            "due_date",
            "account_id",
            "note",
          ],
        },
      });
      return created;
    });
    await safelyRefreshAndDeliverWebPush(access.workspaceId);
    return record;
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const existing = await db.debtRecord.findUnique({
      where: {
        workspaceId_createdBy_idempotencyKey: {
          workspaceId: access.workspaceId,
          createdBy: access.actorId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (!existing || existing.requestHash !== hash) {
      throw new FinanceDomainError("DEBT_IDEMPOTENCY_CONFLICT");
    }
    return existing;
  }
}

export async function createDebtPayment(
  access: WorkspaceAccess & { today: Date },
  input: DebtPaymentInput,
) {
  return persistDebtPayment(access, input, paymentHash(input), input.amount);
}

export async function settleDebtRecord(
  access: WorkspaceAccess & { today: Date },
  input: DebtSettlementInput,
) {
  return persistDebtPayment(access, input, settlementHash(input), null);
}

async function persistDebtPayment(
  access: WorkspaceAccess & { today: Date },
  input: DebtSettlementInput,
  hash: string,
  requestedAmount: bigint | null,
) {
  ensureMutablePersonalWorkspace(access);
  if (input.paymentDate > access.today) {
    throw new FinanceDomainError("DEBT_FUTURE_DATE");
  }
  const db = getDatabase();
  try {
    const payment = await db.$transaction(
      async (tx) => {
        await tx.$queryRaw`
          SELECT id FROM app.debt_records
          WHERE workspace_id = ${access.workspaceId}::uuid
            AND id = ${input.debtRecordId}::uuid
          FOR UPDATE
        `;
        const existing = await tx.debtPayment.findUnique({
          where: {
            workspaceId_createdBy_idempotencyKey: {
              workspaceId: access.workspaceId,
              createdBy: access.actorId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (existing) {
          if (existing.requestHash !== hash) {
            throw new FinanceDomainError("DEBT_IDEMPOTENCY_CONFLICT");
          }
          return existing;
        }
        const record = await tx.debtRecord.findFirst({
          where: {
            id: input.debtRecordId,
            workspaceId: access.workspaceId,
          },
          select: { id: true, principalAmount: true, startDate: true },
        });
        if (!record) throw new FinanceDomainError("DEBT_NOT_FOUND");
        if (input.paymentDate < record.startDate) {
          throw new FinanceDomainError("DEBT_PAYMENT_BEFORE_START");
        }
        const account = await tx.financialAccount.findFirst({
          where: {
            id: input.accountId,
            workspaceId: access.workspaceId,
            archivedAt: null,
          },
          select: { openingDate: true },
        });
        if (!account) throw new FinanceDomainError("DEBT_ACCOUNT_INVALID");
        if (input.paymentDate < account.openingDate) {
          throw new FinanceDomainError("DEBT_BEFORE_ACCOUNT");
        }
        const aggregate = await tx.debtPayment.aggregate({
          where: {
            workspaceId: access.workspaceId,
            debtRecordId: record.id,
          },
          _sum: { amount: true },
        });
        const paidAmount = aggregate._sum.amount ?? 0n;
        const outstandingAmount = debtOutstanding(
          record.principalAmount,
          paidAmount,
        );
        const amount = requestedAmount ?? outstandingAmount;
        if (amount <= 0n) {
          throw new FinanceDomainError("DEBT_ALREADY_SETTLED");
        }
        if (amount > outstandingAmount) {
          throw new FinanceDomainError("DEBT_PAYMENT_EXCEEDS_OUTSTANDING");
        }
        const created = await tx.debtPayment.create({
          data: {
            workspaceId: access.workspaceId,
            createdBy: access.actorId,
            ...input,
            amount,
            requestHash: hash,
          },
        });
        await tx.auditEvent.create({
          data: {
            workspaceId: access.workspaceId,
            actorId: access.actorId,
            entityType: "debt_payment",
            entityId: created.id,
            action: "created",
            changedFields: [
              "debt_record_id",
              "account_id",
              "amount",
              "payment_date",
              "note",
            ],
          },
        });
        return created;
      },
      { isolationLevel: "Serializable" },
    );
    await safelyRefreshAndDeliverWebPush(access.workspaceId);
    return payment;
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const existing = await db.debtPayment.findUnique({
      where: {
        workspaceId_createdBy_idempotencyKey: {
          workspaceId: access.workspaceId,
          createdBy: access.actorId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (!existing || existing.requestHash !== hash) {
      throw new FinanceDomainError("DEBT_IDEMPOTENCY_CONFLICT");
    }
    return existing;
  }
}

export async function getDebtOverview(workspaceId: string, today: Date) {
  const records = await getDatabase().debtRecord.findMany({
    where: { workspaceId },
    include: {
      account: { select: { name: true } },
      payments: {
        include: { account: { select: { name: true } } },
        orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      },
    },
    orderBy: [{ dueDate: "asc" }, { startDate: "desc" }, { createdAt: "desc" }],
  });
  const items = records.map((record) => {
    const paidAmount = record.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0n,
    );
    const outstandingAmount = debtOutstanding(
      record.principalAmount,
      paidAmount,
    );
    return {
      ...record,
      paidAmount,
      outstandingAmount,
      status: debtStatus({
        principalAmount: record.principalAmount,
        paidAmount,
        dueDate: record.dueDate,
        today,
      }),
    };
  });
  return {
    items,
    totalDebt: items
      .filter((item) => item.kind === "debt")
      .reduce((sum, item) => sum + item.outstandingAmount, 0n),
    totalReceivable: items
      .filter((item) => item.kind === "receivable")
      .reduce((sum, item) => sum + item.outstandingAmount, 0n),
    overdueCount: items.filter((item) => item.status === "overdue").length,
  };
}

export async function debtAdjustmentsAtDate(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  date?: Date,
) {
  const [records, payments] = await Promise.all([
    tx.debtRecord.findMany({
      where: {
        workspaceId,
        origin: "current",
        accountId: { not: null },
        ...(date ? { startDate: { lte: date } } : {}),
      },
      select: { kind: true, principalAmount: true, accountId: true },
    }),
    tx.debtPayment.findMany({
      where: { workspaceId, ...(date ? { paymentDate: { lte: date } } : {}) },
      select: {
        amount: true,
        accountId: true,
        debtRecord: { select: { kind: true } },
      },
    }),
  ]);
  return [
    ...records.map((record) => ({
      accountId: record.accountId!,
      amount:
        record.kind === "debt"
          ? record.principalAmount
          : -record.principalAmount,
    })),
    ...payments.map((payment) => ({
      accountId: payment.accountId,
      amount:
        payment.debtRecord.kind === "debt" ? -payment.amount : payment.amount,
    })),
  ];
}
