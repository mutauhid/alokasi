import "server-only";

import { createHash } from "node:crypto";
import webpush from "web-push";
import type { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/server/db/client";
import type { WorkspaceAccess } from "@/modules/workspaces/service";
import {
  nextAllowedPushTime,
  preferenceField,
  privacySafeContent,
  safeLocalNotificationUrl,
  type PushKind,
} from "./domain";

type PushSubscriptionInput = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

type PushMessage = {
  workspaceId: string;
  userId: string;
  type: PushKind;
  dedupeKey: string;
  title: string;
  body: string;
  url: string;
  tag: string;
  now?: Date;
};

type PreferenceInput = {
  budgetAlertsEnabled: boolean;
  weeklySummaryEnabled: boolean;
  recurringRemindersEnabled: boolean;
  lowBalanceEnabled: boolean;
  lowBalanceThreshold: bigint | null;
  staleDraftsEnabled: boolean;
  sharedActivityEnabled: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  hideSensitiveContent: boolean;
};

const defaultPreference: PreferenceInput = {
  budgetAlertsEnabled: true,
  weeklySummaryEnabled: true,
  recurringRemindersEnabled: true,
  lowBalanceEnabled: false,
  lowBalanceThreshold: null as bigint | null,
  staleDraftsEnabled: true,
  sharedActivityEnabled: true,
  quietHoursStart: 22 * 60,
  quietHoursEnd: 7 * 60,
  hideSensitiveContent: true,
};

function endpointHash(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex");
}

export function getWebPushPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
}

function vapidConfig() {
  const publicKey = getWebPushPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = process.env.WEB_PUSH_SUBJECT?.trim() ?? "";
  if (
    !publicKey ||
    !privateKey ||
    !/^(mailto:.+@.+|https:\/\/[^\s]+)$/u.test(subject)
  ) {
    return null;
  }
  return { publicKey, privateKey, subject };
}

export function isWebPushConfigured() {
  return Boolean(vapidConfig());
}

export async function getWebPushSettings(access: WorkspaceAccess) {
  const db = getDatabase();
  const [preference, activeDevices] = await Promise.all([
    db.webPushPreference.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: access.workspaceId,
          userId: access.actorId,
        },
      },
    }),
    db.webPushSubscription.count({
      where: { userId: access.actorId, revokedAt: null },
    }),
  ]);
  return {
    ...(preference ?? defaultPreference),
    activeDevices,
    configured: isWebPushConfigured(),
    publicKey: getWebPushPublicKey(),
  };
}

export async function saveWebPushSubscription(
  access: WorkspaceAccess,
  input: PushSubscriptionInput,
  userAgent: string | null,
) {
  if (!isWebPushConfigured()) throw new Error("WEB_PUSH_NOT_CONFIGURED");
  if (
    !input.endpoint.startsWith("https://") ||
    input.endpoint.length > 2048 ||
    input.keys.p256dh.length < 40 ||
    input.keys.p256dh.length > 180 ||
    input.keys.auth.length < 12 ||
    input.keys.auth.length > 64
  ) {
    throw new Error("WEB_PUSH_SUBSCRIPTION_INVALID");
  }
  const hash = endpointHash(input.endpoint);
  const db = getDatabase();
  const existing = await db.webPushSubscription.findUnique({
    where: { endpointHash: hash },
    select: { userId: true },
  });
  if (existing && existing.userId !== access.actorId) {
    throw new Error("WEB_PUSH_SUBSCRIPTION_OWNED");
  }
  await db.$transaction(async (tx) => {
    await tx.webPushSubscription.upsert({
      where: { endpointHash: hash },
      create: {
        userId: access.actorId,
        endpointHash: hash,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: userAgent?.slice(0, 300) || null,
      },
      update: {
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: userAgent?.slice(0, 300) || null,
        revokedAt: null,
        lastSeenAt: new Date(),
      },
    });
    await tx.webPushPreference.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: access.workspaceId,
          userId: access.actorId,
        },
      },
      create: {
        workspaceId: access.workspaceId,
        userId: access.actorId,
        ...defaultPreference,
      },
      update: {},
    });
  });
}

export async function revokeWebPushSubscription(
  userId: string,
  endpoint: string,
) {
  if (!endpoint || endpoint.length > 2048) return;
  await getDatabase().webPushSubscription.updateMany({
    where: { userId, endpointHash: endpointHash(endpoint), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllWebPushSubscriptions(userId: string) {
  await getDatabase().webPushSubscription.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function updateWebPushPreference(
  access: WorkspaceAccess,
  input: PreferenceInput,
) {
  if (
    input.lowBalanceEnabled &&
    (!input.lowBalanceThreshold || input.lowBalanceThreshold <= 0n)
  ) {
    throw new Error("WEB_PUSH_LOW_BALANCE_INVALID");
  }
  if (
    (input.quietHoursStart === null) !== (input.quietHoursEnd === null) ||
    (input.quietHoursStart !== null &&
      (input.quietHoursStart < 0 ||
        input.quietHoursStart > 1439 ||
        input.quietHoursEnd === null ||
        input.quietHoursEnd < 0 ||
        input.quietHoursEnd > 1439 ||
        input.quietHoursStart === input.quietHoursEnd))
  ) {
    throw new Error("WEB_PUSH_QUIET_HOURS_INVALID");
  }
  await getDatabase().$transaction(async (tx) => {
    await tx.webPushPreference.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: access.workspaceId,
          userId: access.actorId,
        },
      },
      create: {
        workspaceId: access.workspaceId,
        userId: access.actorId,
        ...input,
      },
      update: input,
    });
    if (!input.lowBalanceEnabled) {
      await tx.webPushLowBalanceState.deleteMany({
        where: { workspaceId: access.workspaceId, userId: access.actorId },
      });
    }
  });
}

export async function queueWebPush(
  tx: Prisma.TransactionClient,
  message: PushMessage,
) {
  const preference = await tx.webPushPreference.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: message.workspaceId,
        userId: message.userId,
      },
    },
    include: {
      workspace: { select: { timezone: true } },
      membership: { select: { status: true } },
    },
  });
  if (
    !preference ||
    preference.membership.status !== "active" ||
    !preference[preferenceField(message.type)]
  ) {
    return 0;
  }
  const subscriptions = await tx.webPushSubscription.findMany({
    where: { userId: message.userId, revokedAt: null },
    select: { id: true },
  });
  if (subscriptions.length === 0) return 0;
  const content = privacySafeContent({
    hideSensitiveContent: preference.hideSensitiveContent,
    title: message.title,
    body: message.body,
  });
  const now = message.now ?? new Date();
  const availableAt = nextAllowedPushTime(
    now,
    preference.workspace.timezone,
    preference.quietHoursStart,
    preference.quietHoursEnd,
  );
  const created = await tx.webPushDelivery.createMany({
    data: subscriptions.map((subscription) => ({
      workspaceId: message.workspaceId,
      userId: message.userId,
      subscriptionId: subscription.id,
      type: message.type,
      dedupeKey: message.dedupeKey.slice(0, 220),
      title: content.title,
      body: content.body,
      url: safeLocalNotificationUrl(message.url),
      tag: message.tag.slice(0, 120),
      availableAt,
    })),
    skipDuplicates: true,
  });
  return created.count;
}

export async function deliverPendingWebPush(limit = 50, now = new Date()) {
  const config = vapidConfig();
  if (!config) return { sent: 0, failed: 0, skipped: 0, configured: false };
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  const db = getDatabase();
  const candidates = await db.webPushDelivery.findMany({
    where: {
      status: "pending",
      availableAt: { lte: now },
      subscription: { revokedAt: null },
      membership: { status: "active", user: { disabledAt: null } },
    },
    select: { id: true },
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const candidate of candidates) {
    const claimed = await db.webPushDelivery.updateMany({
      where: { id: candidate.id, status: "pending", availableAt: { lte: now } },
      data: { status: "sending", attemptedAt: now },
    });
    if (claimed.count !== 1) {
      skipped += 1;
      continue;
    }
    const delivery = await db.webPushDelivery.findUnique({
      where: { id: candidate.id },
      include: { subscription: true },
    });
    if (!delivery || delivery.subscription.revokedAt) {
      if (delivery) {
        await db.webPushDelivery.update({
          where: { id: delivery.id },
          data: { status: "failed", failureCode: "SUBSCRIPTION_REVOKED" },
        });
      }
      skipped += 1;
      continue;
    }
    try {
      await webpush.sendNotification(
        {
          endpoint: delivery.subscription.endpoint,
          keys: {
            p256dh: delivery.subscription.p256dh,
            auth: delivery.subscription.auth,
          },
        },
        JSON.stringify({
          title: delivery.title,
          body: delivery.body,
          url: delivery.url,
          tag: delivery.tag,
        }),
        { TTL: 6 * 60 * 60, urgency: "normal" },
      );
      await db.webPushDelivery.update({
        where: { id: delivery.id },
        data: { status: "sent", sentAt: new Date(), failureCode: null },
      });
      sent += 1;
    } catch (error) {
      const statusCode =
        error && typeof error === "object" && "statusCode" in error
          ? Number(error.statusCode)
          : 0;
      await db.$transaction(async (tx) => {
        await tx.webPushDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "failed",
            failureCode: statusCode ? String(statusCode) : "SEND_FAILED",
          },
        });
        if (statusCode === 404 || statusCode === 410) {
          await tx.webPushSubscription.update({
            where: { id: delivery.subscriptionId },
            data: { revokedAt: new Date() },
          });
        }
      });
      failed += 1;
    }
  }
  return { sent, failed, skipped, configured: true };
}

export async function safelyDeliverWebPush(input?: {
  workspaceId?: string;
  userId?: string;
}) {
  try {
    if (input?.workspaceId) {
      const hasPending = await getDatabase().webPushDelivery.count({
        where: {
          status: "pending",
          workspaceId: input.workspaceId,
        },
      });
      if (!hasPending) return;
    }
    await deliverPendingWebPush();
  } catch {
    // Notification delivery must never roll back a valid financial mutation.
  }
}
