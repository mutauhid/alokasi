import "server-only";

import type { Prisma } from "@/generated/prisma/client";

type CleanupScope = {
  workspaceId?: string;
  userId?: string;
  workspace?: { type: "shared" };
  membership?: { id: string };
};

export async function deleteWorkspaceWebPushData(
  tx: Prisma.TransactionClient,
  scope: CleanupScope,
) {
  await tx.webPushDelivery.deleteMany({ where: scope });
  await tx.webPushLowBalanceState.deleteMany({ where: scope });
  await tx.webPushPreference.deleteMany({ where: scope });
}

export async function deleteUserWebPushSubscriptions(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  await tx.webPushDelivery.deleteMany({ where: { userId } });
  await tx.webPushSubscription.deleteMany({ where: { userId } });
}
