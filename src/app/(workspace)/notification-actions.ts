"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/modules/web-push/in-app";
import { requireWorkspaceAccess } from "@/modules/workspaces/service";
import { requireVerifiedIdentity } from "@/server/auth/identity";

const identifier = z.uuid();

export async function markNotificationReadAction(
  workspaceId: string,
  notificationId: string,
) {
  const parsedWorkspaceId = identifier.parse(workspaceId);
  const parsedNotificationId = identifier.parse(notificationId);
  const identity = await requireVerifiedIdentity();
  const access = await requireWorkspaceAccess(identity, parsedWorkspaceId);
  await markNotificationRead(access, parsedNotificationId);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction(workspaceId: string) {
  const parsedWorkspaceId = identifier.parse(workspaceId);
  const identity = await requireVerifiedIdentity();
  const access = await requireWorkspaceAccess(identity, parsedWorkspaceId);
  await markAllNotificationsRead(access);
  revalidatePath("/", "layout");
}
