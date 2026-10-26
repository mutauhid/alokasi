import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { deleteTelegramConnections } from "@/modules/telegram-integration/cleanup";
import { deletePersonalCategoryRules } from "@/modules/category-rules/cleanup";
import { deleteWorkspaceWebPushData } from "@/modules/web-push/cleanup";

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
  await deleteTelegramConnections(tx, { workspaceId });
  await deletePersonalCategoryRules(tx, { workspaceId });
  await deleteWorkspaceWebPushData(tx, { workspaceId });
  await tx.auditEvent.deleteMany({ where: { workspaceId } });
  await tx.receiptDraft.deleteMany({ where: { workspaceId } });
  await tx.balanceReconciliation.deleteMany({ where: { workspaceId } });
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
