import "server-only";

import type { Prisma } from "@/generated/prisma/client";

export async function deleteTelegramConnections(
  tx: Prisma.TransactionClient,
  where: Prisma.TelegramConnectionWhereInput,
) {
  const connections = await tx.telegramConnection.findMany({
    where,
    select: { id: true },
  });
  if (!connections.length) return;
  const ids = connections.map((item) => item.id);
  await tx.telegramDraft.deleteMany({ where: { connectionId: { in: ids } } });
  await tx.telegramConnection.deleteMany({ where: { id: { in: ids } } });
}
