import "server-only";

import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { FinanceDomainError } from "@/modules/finance/errors";

export const duplicateWindowMs = 10 * 60 * 1000;

type DuplicateInput = {
  type: "income" | "expense" | "transfer";
  title: string;
  amount: bigint;
  transactionDate: Date;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  idempotencyKey: string;
};

export type PotentialDuplicateCandidate = {
  id: string;
  title: string;
  amount: bigint;
  transactionDate: Date;
  createdAt: Date;
  accountName: string;
};

function confirmationFor(input: DuplicateInput, candidateId: string) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        candidateId,
        type: input.type,
        title: input.title.toLocaleLowerCase("id-ID"),
        amount: input.amount.toString(),
        transactionDate: input.transactionDate.toISOString().slice(0, 10),
        accountId: input.accountId,
        destinationAccountId: input.destinationAccountId,
        categoryId: input.categoryId,
      }),
    )
    .digest("hex")
    .slice(0, 16);
}

export class PotentialDuplicateTransactionError extends FinanceDomainError {
  readonly confirmation: string;

  constructor(
    public readonly candidate: PotentialDuplicateCandidate,
    input: DuplicateInput,
  ) {
    super("TRANSACTION_POSSIBLE_DUPLICATE");
    this.name = "PotentialDuplicateTransactionError";
    this.confirmation = confirmationFor(input, candidate.id);
  }
}

export async function assertNoUnconfirmedDuplicate(
  tx: Prisma.TransactionClient,
  context: { workspaceId: string; actorId: string },
  input: DuplicateInput & { duplicateConfirmation?: string },
) {
  const candidate = await tx.transaction.findFirst({
    where: {
      workspaceId: context.workspaceId,
      deletedAt: null,
      type: input.type,
      title: { equals: input.title, mode: "insensitive" },
      amount: input.amount,
      transactionDate: input.transactionDate,
      accountId: input.accountId,
      destinationAccountId: input.destinationAccountId,
      categoryId: input.categoryId,
      createdAt: { gte: new Date(Date.now() - duplicateWindowMs) },
      NOT: {
        createdBy: context.actorId,
        idempotencyKey: input.idempotencyKey,
      },
    },
    select: {
      id: true,
      title: true,
      amount: true,
      transactionDate: true,
      createdAt: true,
      account: { select: { name: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  if (!candidate) return;
  const view: PotentialDuplicateCandidate = {
    id: candidate.id,
    title: candidate.title,
    amount: candidate.amount,
    transactionDate: candidate.transactionDate,
    createdAt: candidate.createdAt,
    accountName: candidate.account.name,
  };
  const error = new PotentialDuplicateTransactionError(view, input);
  if (input.duplicateConfirmation === error.confirmation) return;
  throw error;
}

export type DuplicateTransactionWarning = {
  confirmation: string;
  transactionId: string;
  title: string;
  amount: string;
  transactionDate: string;
  createdAt: string;
  accountName: string;
};

export function duplicateWarning(
  error: PotentialDuplicateTransactionError,
): DuplicateTransactionWarning {
  return {
    confirmation: error.confirmation,
    transactionId: error.candidate.id,
    title: error.candidate.title,
    amount: error.candidate.amount.toString(),
    transactionDate: error.candidate.transactionDate.toISOString().slice(0, 10),
    createdAt: error.candidate.createdAt.toISOString(),
    accountName: error.candidate.accountName,
  };
}
