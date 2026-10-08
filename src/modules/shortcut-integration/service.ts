import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { MemberRole } from "@/generated/prisma/enums";
import { FinanceDomainError } from "@/modules/finance/errors";
import type { ConfigureShortcutInput } from "@/modules/shortcut-integration/domain";
import { getDatabase } from "@/server/db/client";

const tokenPrefix = "alokasi_ios_";
const tokenLifetimeMs = 365 * 24 * 60 * 60 * 1000;

export type ShortcutAccess = {
  workspaceId: string;
  actorId: string;
  role: "owner" | "editor" | "viewer";
};

export class ShortcutIntegrationError extends Error {
  constructor(
    public readonly code:
      | "SHORTCUT_ACCESS_DENIED"
      | "SHORTCUT_ACCOUNT_INVALID"
      | "SHORTCUT_CATEGORY_INVALID"
      | "SHORTCUT_TOKEN_INVALID"
      | "SHORTCUT_TOKEN_EXPIRED",
  ) {
    super(code);
    this.name = "ShortcutIntegrationError";
  }
}

function requireEditor(role: MemberRole) {
  if (role === "viewer") {
    throw new ShortcutIntegrationError("SHORTCUT_ACCESS_DENIED");
  }
}

export function hashShortcutToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isShortcutTokenShape(token: string) {
  return new RegExp(`^${tokenPrefix}[A-Za-z0-9_-]{43}$`, "u").test(token);
}

export async function getShortcutIntegration(access: ShortcutAccess): Promise<{
  configured: boolean;
  accountName?: string;
  categoryName?: string;
  expiresAt?: Date;
  lastUsedAt?: Date;
}> {
  const membership = await getDatabase().membership.findFirst({
    where: {
      workspaceId: access.workspaceId,
      userId: access.actorId,
      status: "active",
    },
    select: {
      shortcutTokenHash: true,
      shortcutTokenExpiresAt: true,
      shortcutTokenLastUsedAt: true,
      shortcutDefaultAccountId: true,
      shortcutDefaultCategoryId: true,
    },
  });
  if (!membership?.shortcutTokenHash) return { configured: false };
  const [account, category] = await Promise.all([
    membership.shortcutDefaultAccountId
      ? getDatabase().financialAccount.findFirst({
          where: {
            id: membership.shortcutDefaultAccountId,
            workspaceId: access.workspaceId,
          },
          select: { name: true },
        })
      : null,
    membership.shortcutDefaultCategoryId
      ? getDatabase().category.findFirst({
          where: {
            id: membership.shortcutDefaultCategoryId,
            workspaceId: access.workspaceId,
            type: "expense",
          },
          select: { name: true },
        })
      : null,
  ]);
  return {
    configured: true,
    accountName: account?.name,
    categoryName: category?.name,
    expiresAt: membership.shortcutTokenExpiresAt ?? undefined,
    lastUsedAt: membership.shortcutTokenLastUsedAt ?? undefined,
  };
}

export async function configureShortcutIntegration(
  access: ShortcutAccess,
  input: ConfigureShortcutInput,
) {
  requireEditor(access.role);
  const db = getDatabase();
  const token = `${tokenPrefix}${randomBytes(32).toString("base64url")}`;
  const now = new Date();
  const expiresAt = new Date(now.valueOf() + tokenLifetimeMs);
  await db.$transaction(async (tx) => {
    const [membership, account, category] = await Promise.all([
      tx.membership.findFirst({
        where: {
          workspaceId: access.workspaceId,
          userId: access.actorId,
          status: "active",
          role: { in: ["owner", "editor"] },
        },
        select: { id: true },
      }),
      tx.financialAccount.findFirst({
        where: {
          id: input.accountId,
          workspaceId: access.workspaceId,
          archivedAt: null,
        },
        select: { id: true },
      }),
      tx.category.findFirst({
        where: {
          id: input.categoryId,
          workspaceId: access.workspaceId,
          type: "expense",
          archivedAt: null,
        },
        select: { id: true },
      }),
    ]);
    if (!membership)
      throw new ShortcutIntegrationError("SHORTCUT_ACCESS_DENIED");
    if (!account)
      throw new ShortcutIntegrationError("SHORTCUT_ACCOUNT_INVALID");
    if (!category)
      throw new ShortcutIntegrationError("SHORTCUT_CATEGORY_INVALID");
    await tx.membership.update({
      where: { id: membership.id },
      data: {
        shortcutTokenHash: hashShortcutToken(token),
        shortcutTokenCreatedAt: now,
        shortcutTokenExpiresAt: expiresAt,
        shortcutTokenLastUsedAt: null,
        shortcutDefaultAccountId: account.id,
        shortcutDefaultCategoryId: category.id,
      },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: access.workspaceId,
        actorId: access.actorId,
        entityType: "ios_shortcut",
        entityId: membership.id,
        action: "configured",
        changedFields: [
          "token_hash",
          "expires_at",
          "default_account_id",
          "default_category_id",
        ],
      },
    });
  });
  return { token, expiresAt };
}

export async function revokeShortcutIntegration(access: ShortcutAccess) {
  requireEditor(access.role);
  const db = getDatabase();
  await db.$transaction(async (tx) => {
    const membership = await tx.membership.findFirst({
      where: {
        workspaceId: access.workspaceId,
        userId: access.actorId,
        status: "active",
        role: { in: ["owner", "editor"] },
      },
      select: { id: true, shortcutTokenHash: true },
    });
    if (!membership)
      throw new ShortcutIntegrationError("SHORTCUT_ACCESS_DENIED");
    if (!membership.shortcutTokenHash) return;
    await tx.membership.update({
      where: { id: membership.id },
      data: {
        shortcutTokenHash: null,
        shortcutTokenCreatedAt: null,
        shortcutTokenExpiresAt: null,
        shortcutTokenLastUsedAt: null,
        shortcutDefaultAccountId: null,
        shortcutDefaultCategoryId: null,
      },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: access.workspaceId,
        actorId: access.actorId,
        entityType: "ios_shortcut",
        entityId: membership.id,
        action: "revoked",
        changedFields: ["token_hash", "expires_at"],
      },
    });
  });
}

export async function authenticateShortcutToken(token: string) {
  if (!isShortcutTokenShape(token)) {
    throw new ShortcutIntegrationError("SHORTCUT_TOKEN_INVALID");
  }
  const membership = await getDatabase().membership.findUnique({
    where: { shortcutTokenHash: hashShortcutToken(token) },
    select: {
      id: true,
      workspaceId: true,
      userId: true,
      role: true,
      status: true,
      shortcutTokenHash: true,
      shortcutTokenExpiresAt: true,
      shortcutDefaultAccountId: true,
      shortcutDefaultCategoryId: true,
      workspace: { select: { timezone: true } },
    },
  });
  if (
    !membership ||
    membership.status !== "active" ||
    membership.role === "viewer" ||
    !membership.shortcutDefaultAccountId ||
    !membership.shortcutDefaultCategoryId
  ) {
    throw new ShortcutIntegrationError("SHORTCUT_TOKEN_INVALID");
  }
  if (
    !membership.shortcutTokenExpiresAt ||
    membership.shortcutTokenExpiresAt <= new Date()
  ) {
    throw new ShortcutIntegrationError("SHORTCUT_TOKEN_EXPIRED");
  }
  return membership;
}

export async function markShortcutUsed(
  membershipId: string,
  tokenHash: string,
) {
  await getDatabase().membership.updateMany({
    where: { id: membershipId, shortcutTokenHash: tokenHash },
    data: { shortcutTokenLastUsedAt: new Date() },
  });
}

export function shortcutErrorMessage(error: unknown) {
  if (error instanceof ShortcutIntegrationError) {
    const messages = {
      SHORTCUT_ACCESS_DENIED:
        "Kamu tidak memiliki izin untuk mengatur integrasi ini.",
      SHORTCUT_ACCOUNT_INVALID: "Pilih akun aktif dalam ruang ini.",
      SHORTCUT_CATEGORY_INVALID:
        "Pilih kategori pengeluaran aktif dalam ruang ini.",
      SHORTCUT_TOKEN_INVALID: "Token Shortcut tidak valid atau sudah dicabut.",
      SHORTCUT_TOKEN_EXPIRED:
        "Token Shortcut sudah kedaluwarsa. Buat token baru.",
    } as const;
    return messages[error.code];
  }
  if (error instanceof FinanceDomainError) return "Draf belum dapat dibuat.";
  return "Integrasi iPhone belum dapat diproses.";
}
