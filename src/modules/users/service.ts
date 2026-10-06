import "server-only";

import { getDatabase } from "@/server/db/client";
import { deleteWorkspaceData } from "@/modules/workspaces/delete-data";
import { UserDomainError } from "./errors";

export async function getAccountDeletionSummary(actorId: string) {
  const db = getDatabase();
  const user = await db.user.findFirst({
    where: { id: actorId, disabledAt: null },
    select: {
      email: true,
      personalWorkspace: {
        select: {
          id: true,
          _count: {
            select: {
              accounts: true,
              categories: true,
              receiptDrafts: true,
              recurringTransactionTemplates: true,
              balanceReconciliations: true,
            },
          },
        },
      },
    },
  });
  if (!user?.email || !user.personalWorkspace) {
    throw new UserDomainError("ACCOUNT_ACCESS_DENIED");
  }
  const [ownedShared, sharedMemberships, transactionCount, budgetCount] =
    await Promise.all([
      db.workspace.findMany({
        where: {
          type: "shared",
          memberships: {
            some: { userId: actorId, role: "owner", status: "active" },
          },
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.membership.count({
        where: {
          userId: actorId,
          status: "active",
          workspace: { type: "shared" },
        },
      }),
      db.transaction.count({
        where: { workspaceId: user.personalWorkspace.id },
      }),
      db.budget.count({
        where: { workspaceId: user.personalWorkspace.id },
      }),
    ]);
  return {
    email: user.email,
    ownedShared,
    sharedMemberships,
    personal: {
      accounts: user.personalWorkspace._count.accounts,
      categories: user.personalWorkspace._count.categories,
      receiptDrafts: user.personalWorkspace._count.receiptDrafts,
      recurringTemplates:
        user.personalWorkspace._count.recurringTransactionTemplates,
      reconciliations: user.personalWorkspace._count.balanceReconciliations,
      transactions: transactionCount,
      budgets: budgetCount,
    },
  };
}

export async function getUserProfile(actorId: string) {
  const profile = await getDatabase().user.findFirst({
    where: { id: actorId, disabledAt: null },
    select: { email: true, displayName: true },
  });
  if (!profile?.email) throw new UserDomainError("ACCOUNT_ACCESS_DENIED");
  return profile;
}

export async function updateApplicationProfile(input: {
  actorId: string;
  authSubject: string;
  displayName: string;
}) {
  const updated = await getDatabase().user.updateMany({
    where: {
      id: input.actorId,
      authSubject: input.authSubject,
      disabledAt: null,
    },
    data: { displayName: input.displayName },
  });
  if (updated.count !== 1) {
    throw new UserDomainError("ACCOUNT_ACCESS_DENIED");
  }
}

export async function deleteApplicationAccount(input: {
  actorId: string;
  authSubject: string;
  confirmationEmail: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return getDatabase().$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM app.users
        WHERE id = ${input.actorId}::uuid
        FOR UPDATE
      `;
      const user = await tx.user.findFirst({
        where: {
          id: input.actorId,
          authSubject: input.authSubject,
          disabledAt: null,
        },
        select: {
          email: true,
          personalWorkspace: { select: { id: true } },
        },
      });
      if (!user?.email || !user.personalWorkspace) {
        throw new UserDomainError("ACCOUNT_ACCESS_DENIED");
      }
      if (user.email.toLocaleLowerCase("en-US") !== input.confirmationEmail) {
        throw new UserDomainError("ACCOUNT_EMAIL_MISMATCH");
      }
      const ownedShared = await tx.membership.count({
        where: {
          userId: input.actorId,
          role: "owner",
          status: "active",
          workspace: { type: "shared" },
        },
      });
      if (ownedShared > 0) {
        throw new UserDomainError("ACCOUNT_OWNS_SHARED_WORKSPACE");
      }

      const sharedMemberships = await tx.membership.findMany({
        where: {
          userId: input.actorId,
          workspace: { type: "shared" },
        },
        select: { id: true, workspaceId: true },
      });
      const membershipIds = sharedMemberships.map((item) => item.id);
      if (membershipIds.length > 0) {
        await tx.workspace.updateMany({
          where: { ownershipTransferToMembershipId: { in: membershipIds } },
          data: {
            ownershipTransferToMembershipId: null,
            ownershipTransferRequestedAt: null,
            ownershipTransferExpiresAt: null,
            version: { increment: 1 },
          },
        });
        await tx.receiptDraft.deleteMany({
          where: {
            createdBy: input.actorId,
            workspaceId: {
              in: sharedMemberships.map((item) => item.workspaceId),
            },
          },
        });
        await tx.membership.updateMany({
          where: { id: { in: membershipIds }, status: "active" },
          data: { status: "revoked", version: { increment: 1 } },
        });
      }

      await deleteWorkspaceData(tx, user.personalWorkspace.id);
      await tx.user.update({
        where: { id: input.actorId },
        data: {
          authSubject: null,
          email: null,
          displayName: null,
          disabledAt: now,
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
}
