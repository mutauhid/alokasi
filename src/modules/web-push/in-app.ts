import "server-only";

import type { WorkspaceAccess } from "@/modules/workspaces/service";
import { getDatabase } from "@/server/db/client";

const inboxLimit = 40;

export async function getNotificationInbox(access: WorkspaceAccess) {
  const db = getDatabase();
  const [items, unreadCount] = await Promise.all([
    db.inAppNotification.findMany({
      where: {
        workspaceId: access.workspaceId,
        userId: access.actorId,
        membership: { status: "active" },
      },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        url: true,
        readAt: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: inboxLimit,
    }),
    db.inAppNotification.count({
      where: {
        workspaceId: access.workspaceId,
        userId: access.actorId,
        readAt: null,
        membership: { status: "active" },
      },
    }),
  ]);
  return { items, unreadCount, limit: inboxLimit };
}

export async function markNotificationRead(
  access: WorkspaceAccess,
  notificationId: string,
) {
  await getDatabase().inAppNotification.updateMany({
    where: {
      id: notificationId,
      workspaceId: access.workspaceId,
      userId: access.actorId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(access: WorkspaceAccess) {
  await getDatabase().inAppNotification.updateMany({
    where: {
      workspaceId: access.workspaceId,
      userId: access.actorId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}
