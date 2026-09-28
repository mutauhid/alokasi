import "server-only";

import type { VerifiedIdentity } from "@/server/auth/identity";
import { getDatabase } from "@/server/db/client";

const defaultCategories = [
  ["Gaji", "income"],
  ["Pendapatan lain", "income"],
  ["Refund", "income"],
  ["Makan & minum", "expense"],
  ["Transportasi", "expense"],
  ["Tagihan", "expense"],
  ["Belanja", "expense"],
  ["Kesehatan", "expense"],
] as const;

function monthBounds(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  return { start, end };
}

export async function provisionPersonalWorkspace(
  identity: VerifiedIdentity,
  now = new Date(),
) {
  if (!identity.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");
  const db = getDatabase();
  const { start, end } = monthBounds(now);
  return db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { authSubject: identity.subject },
      select: { disabledAt: true },
    });
    if (existing?.disabledAt) throw new Error("ACCOUNT_DISABLED");
    const user = await tx.user.upsert({
      where: { authSubject: identity.subject },
      create: {
        authSubject: identity.subject,
        email: identity.email,
        displayName: identity.displayName,
      },
      update: {
        email: identity.email,
        displayName: identity.displayName,
      },
    });
    const workspace = await tx.workspace.upsert({
      where: { personalOwnerId: user.id },
      create: {
        name: "Ruang pribadi",
        type: "personal",
        personalOwnerId: user.id,
        memberships: {
          create: { userId: user.id, role: "owner", status: "active" },
        },
      },
      update: {},
    });
    await tx.category.createMany({
      data: defaultCategories.map(([name, type]) => ({
        workspaceId: workspace.id,
        name,
        nameKey: name.toLocaleLowerCase("id-ID"),
        type,
      })),
      skipDuplicates: true,
    });
    await tx.cycleSetting.upsert({
      where: {
        workspaceId_version: { workspaceId: workspace.id, version: 1 },
      },
      create: {
        workspaceId: workspace.id,
        startDay: 1,
        effectiveDate: start,
        version: 1,
      },
      update: {},
    });
    await tx.budgetPeriod.upsert({
      where: {
        workspaceId_startDate: { workspaceId: workspace.id, startDate: start },
      },
      create: {
        workspaceId: workspace.id,
        startDate: start,
        endDateExclusive: end,
        cycleSettingVersion: 1,
      },
      update: {},
    });
    return { user, workspace };
  });
}

export async function getPersonalContext(identity: VerifiedIdentity) {
  const db = getDatabase();
  const context = await db.user.findUnique({
    where: { authSubject: identity.subject },
    include: { personalWorkspace: true },
  });
  if (!context || context.disabledAt || !context.personalWorkspace) {
    return provisionPersonalWorkspace(identity);
  }
  const membership = await db.membership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: context.personalWorkspace.id,
        userId: context.id,
      },
    },
  });
  if (
    !membership ||
    membership.status !== "active" ||
    membership.role !== "owner"
  ) {
    throw new Error("PERSONAL_WORKSPACE_ACCESS_INVALID");
  }
  return { user: context, workspace: context.personalWorkspace };
}
