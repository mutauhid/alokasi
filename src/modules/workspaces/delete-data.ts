import "server-only";

import type { Prisma } from "@/generated/prisma/client";

/** Delete every row owned by a workspace in foreign-key-safe order. */
export async function deleteWorkspaceData(
  tx: Prisma.TransactionClient,
  workspaceId: string,
) {
  await tx.workspace.update({
    where: { id: workspaceId },
    data: {
      ownershipTransferToMembershipId: null,
      ownershipTransferRequestedAt: null,
      ownershipTransferExpiresAt: null,
    },
  });
  await tx.invitation.deleteMany({ where: { workspaceId } });
  await tx.auditEvent.deleteMany({ where: { workspaceId } });
  await tx.receiptDraft.deleteMany({ where: { workspaceId } });
  await tx.transaction.deleteMany({ where: { workspaceId } });
  await tx.recurringTransactionTemplate.deleteMany({ where: { workspaceId } });
  await tx.budget.deleteMany({ where: { workspaceId } });
  await tx.budgetPeriod.deleteMany({ where: { workspaceId } });
  await tx.cycleSetting.deleteMany({ where: { workspaceId } });
  await tx.category.deleteMany({ where: { workspaceId } });
  await tx.financialAccount.deleteMany({ where: { workspaceId } });
  await tx.membership.deleteMany({ where: { workspaceId } });
  await tx.workspace.delete({ where: { id: workspaceId } });
}
