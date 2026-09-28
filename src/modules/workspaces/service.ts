import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { VerifiedIdentity } from "@/server/auth/identity";
import { getDatabase } from "@/server/db/client";
import { provisionPersonalWorkspace } from "./provision-personal";
import { WorkspaceDomainError } from "./errors";
import { deleteWorkspaceData } from "./delete-data";

export type WorkspaceRole = "owner" | "editor" | "viewer";
export type WorkspaceAccess = {
  workspaceId: string;
  actorId: string;
  role: WorkspaceRole;
  timezone: string;
  workspaceType: "personal" | "shared";
};

async function findActiveUserContext(authSubject: string) {
  return getDatabase().user.findUnique({
    where: { authSubject },
    include: {
      personalWorkspace: { select: { id: true } },
      memberships: {
        where: { status: "active" },
        include: { workspace: true },
        orderBy: [{ workspace: { type: "asc" } }, { joinedAt: "asc" }],
      },
    },
  });
}

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
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getWorkspaceContext(
  identity: VerifiedIdentity,
  requestedWorkspaceId?: string,
) {
  const db = getDatabase();
  let user = await findActiveUserContext(identity.subject);
  if (user?.disabledAt)
    throw new WorkspaceDomainError("WORKSPACE_ACCESS_DENIED");
  if (!user?.personalWorkspace) {
    await provisionPersonalWorkspace(identity);
    user = await findActiveUserContext(identity.subject);
  }
  if (!user || user.disabledAt || !user.personalWorkspace) {
    throw new WorkspaceDomainError("WORKSPACE_ACCESS_DENIED");
  }
  const personalWorkspaceId = user.personalWorkspace.id;
  const personalMembership = user.memberships.find(
    (item) =>
      item.workspaceId === personalWorkspaceId &&
      item.role === "owner" &&
      item.workspace.type === "personal",
  );
  if (!personalMembership) {
    throw new WorkspaceDomainError("WORKSPACE_ACCESS_DENIED");
  }
  if (
    user.email !== identity.email ||
    user.displayName !== identity.displayName
  ) {
    const updated = await db.user.update({
      where: { id: user.id },
      data: { email: identity.email, displayName: identity.displayName },
      select: { email: true, displayName: true },
    });
    user = { ...user, ...updated };
  }
  const memberships = user.memberships;
  const selected = requestedWorkspaceId
    ? memberships.find((item) => item.workspaceId === requestedWorkspaceId)
    : memberships.find((item) => item.workspace.type === "personal");
  if (!selected) throw new WorkspaceDomainError("WORKSPACE_ACCESS_DENIED");
  return {
    user,
    workspace: selected.workspace,
    membership: selected,
    workspaces: memberships.map((item) => ({
      id: item.workspace.id,
      name: item.workspace.name,
      type: item.workspace.type,
      role: item.role,
    })),
  };
}

export async function requireWorkspaceAccess(
  identity: VerifiedIdentity,
  workspaceId: string,
  allowedRoles: WorkspaceRole[] = ["owner", "editor", "viewer"],
): Promise<WorkspaceAccess> {
  const context = await getWorkspaceContext(identity, workspaceId);
  if (!allowedRoles.includes(context.membership.role)) {
    throw new WorkspaceDomainError("WORKSPACE_ROLE_DENIED");
  }
  return {
    workspaceId: context.workspace.id,
    actorId: context.user.id,
    role: context.membership.role,
    timezone: context.workspace.timezone,
    workspaceType: context.workspace.type,
  };
}

export async function createSharedWorkspace(
  actorId: string,
  input: { name: string; timezone: string; now?: Date },
) {
  const db = getDatabase();
  const { start, end } = monthBounds(input.now ?? new Date());
  return db.$transaction(async (tx) => {
    const actor = await tx.user.findFirst({
      where: { id: actorId, disabledAt: null },
      select: { id: true },
    });
    if (!actor) throw new WorkspaceDomainError("WORKSPACE_ACCESS_DENIED");
    const workspace = await tx.workspace.create({
      data: {
        name: input.name,
        type: "shared",
        timezone: input.timezone,
        memberships: {
          create: { userId: actorId, role: "owner", status: "active" },
        },
      },
    });
    await tx.category.createMany({
      data: defaultCategories.map(([name, type]) => ({
        workspaceId: workspace.id,
        name,
        nameKey: name.toLocaleLowerCase("id-ID"),
        type,
      })),
    });
    await tx.cycleSetting.create({
      data: {
        workspaceId: workspace.id,
        startDay: 1,
        effectiveDate: start,
        version: 1,
      },
    });
    await tx.budgetPeriod.create({
      data: {
        workspaceId: workspace.id,
        startDate: start,
        endDateExclusive: end,
        cycleSettingVersion: 1,
      },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: workspace.id,
        actorId,
        entityType: "workspace",
        entityId: workspace.id,
        action: "created",
        changedFields: ["name", "type", "timezone", "currency"],
      },
    });
    return workspace;
  });
}

export async function getMembersOverview(access: WorkspaceAccess) {
  const db = getDatabase();
  const [workspace, members, invitations, activity] = await Promise.all([
    db.workspace.findUniqueOrThrow({
      where: { id: access.workspaceId },
      select: {
        version: true,
        ownershipTransferToMembershipId: true,
        ownershipTransferRequestedAt: true,
        ownershipTransferExpiresAt: true,
      },
    }),
    db.membership.findMany({
      where: { workspaceId: access.workspaceId },
      include: { user: { select: { displayName: true, email: true } } },
      orderBy: [{ status: "asc" }, { joinedAt: "asc" }],
    }),
    access.role === "owner"
      ? db.invitation.findMany({
          where: { workspaceId: access.workspaceId },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
    db.auditEvent.findMany({
      where: { workspaceId: access.workspaceId },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: 20,
    }),
  ]);
  return { workspace, members, invitations, activity };
}

export async function getWorkspaceDeletionSummary(access: WorkspaceAccess) {
  if (access.role !== "owner" || access.workspaceType !== "shared") {
    throw new WorkspaceDomainError("WORKSPACE_DELETE_NOT_ALLOWED");
  }
  const db = getDatabase();
  const [workspace, transactionCount, budgetCount] = await Promise.all([
    db.workspace.findUniqueOrThrow({
      where: { id: access.workspaceId },
      select: {
        name: true,
        version: true,
        _count: {
          select: {
            memberships: true,
            accounts: true,
            categories: true,
            receiptDrafts: true,
          },
        },
      },
    }),
    db.transaction.count({ where: { workspaceId: access.workspaceId } }),
    db.budget.count({ where: { workspaceId: access.workspaceId } }),
  ]);
  return {
    name: workspace.name,
    version: workspace.version,
    members: workspace._count.memberships,
    accounts: workspace._count.accounts,
    categories: workspace._count.categories,
    receiptDrafts: workspace._count.receiptDrafts,
    transactions: transactionCount,
    budgets: budgetCount,
  };
}

export async function deleteSharedWorkspace(
  access: WorkspaceAccess,
  input: { workspaceVersion: number; confirmationName: string },
) {
  if (access.role !== "owner" || access.workspaceType !== "shared") {
    throw new WorkspaceDomainError("WORKSPACE_DELETE_NOT_ALLOWED");
  }
  return getDatabase().$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM app.workspaces
        WHERE id = ${access.workspaceId}::uuid
        FOR UPDATE
      `;
      const workspace = await tx.workspace.findFirst({
        where: {
          id: access.workspaceId,
          type: "shared",
          version: input.workspaceVersion,
        },
        select: { id: true, name: true },
      });
      if (!workspace) {
        throw new WorkspaceDomainError("WORKSPACE_DELETE_CONFLICT");
      }
      const owner = await tx.membership.findFirst({
        where: {
          workspaceId: access.workspaceId,
          userId: access.actorId,
          role: "owner",
          status: "active",
        },
        select: { id: true },
      });
      if (!owner) {
        throw new WorkspaceDomainError("WORKSPACE_DELETE_NOT_ALLOWED");
      }
      if (input.confirmationName !== workspace.name) {
        throw new WorkspaceDomainError("WORKSPACE_DELETE_NAME_MISMATCH");
      }

      await deleteWorkspaceData(tx, access.workspaceId);
    },
    { isolationLevel: "Serializable" },
  );
}

export async function createInvitation(
  access: WorkspaceAccess,
  input: { email: string; role: "editor" | "viewer" },
) {
  if (access.role !== "owner" || access.workspaceType !== "shared") {
    throw new WorkspaceDomainError("INVITATION_NOT_ALLOWED");
  }
  const db = getDatabase();
  const existingMember = await db.membership.findFirst({
    where: {
      workspaceId: access.workspaceId,
      status: "active",
      user: { email: { equals: input.email, mode: "insensitive" } },
    },
  });
  if (existingMember) throw new WorkspaceDomainError("MEMBER_ALREADY_ACTIVE");
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const invitation = await db.$transaction(async (tx) => {
    await tx.invitation.updateMany({
      where: {
        workspaceId: access.workspaceId,
        invitedEmail: { equals: input.email, mode: "insensitive" },
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: now },
    });
    const created = await tx.invitation.create({
      data: {
        workspaceId: access.workspaceId,
        createdBy: access.actorId,
        invitedEmail: input.email,
        role: input.role,
        tokenHash: hashToken(token),
        createdAt: now,
        expiresAt: new Date(now.valueOf() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: access.workspaceId,
        actorId: access.actorId,
        entityType: "invitation",
        entityId: created.id,
        action: "created",
        changedFields: ["invited_email", "role", "expires_at"],
      },
    });
    return created;
  });
  return { invitation, token };
}

export async function getInvitationPreview(token: string) {
  return getDatabase().invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { workspace: { select: { name: true, type: true } } },
  });
}

export async function acceptInvitation(
  identity: VerifiedIdentity,
  token: string,
) {
  const personal = await provisionPersonalWorkspace(identity);
  const db = getDatabase();
  const tokenHash = hashToken(token);
  return db.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({
      where: { tokenHash },
      include: { workspace: { select: { type: true } } },
    });
    if (
      !invitation ||
      invitation.workspace.type !== "shared" ||
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt <= new Date()
    ) {
      throw new WorkspaceDomainError("INVITATION_INVALID");
    }
    if (
      invitation.invitedEmail.toLocaleLowerCase("en-US") !==
      identity.email.toLocaleLowerCase("en-US")
    ) {
      throw new WorkspaceDomainError("INVITATION_EMAIL_MISMATCH");
    }
    const acceptedAt = new Date();
    const claimed = await tx.invitation.updateMany({
      where: {
        id: invitation.id,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: acceptedAt },
      },
      data: { acceptedAt },
    });
    if (claimed.count !== 1)
      throw new WorkspaceDomainError("INVITATION_INVALID");
    const membership = await tx.membership.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId: personal.user.id,
        },
      },
      create: {
        workspaceId: invitation.workspaceId,
        userId: personal.user.id,
        role: invitation.role,
        status: "active",
      },
      update: {
        role: invitation.role,
        status: "active",
        version: { increment: 1 },
      },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: invitation.workspaceId,
        actorId: personal.user.id,
        entityType: "membership",
        entityId: membership.id,
        action: "joined",
        changedFields: ["role", "status", "joined_at"],
      },
    });
    return invitation.workspaceId;
  });
}

export async function revokeInvitation(
  access: WorkspaceAccess,
  invitationId: string,
) {
  if (access.role !== "owner")
    throw new WorkspaceDomainError("WORKSPACE_ROLE_DENIED");
  return getDatabase().$transaction(async (tx) => {
    const result = await tx.invitation.updateMany({
      where: {
        id: invitationId,
        workspaceId: access.workspaceId,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    if (result.count !== 1)
      throw new WorkspaceDomainError("INVITATION_CONFLICT");
    await tx.auditEvent.create({
      data: {
        workspaceId: access.workspaceId,
        actorId: access.actorId,
        entityType: "invitation",
        entityId: invitationId,
        action: "revoked",
        changedFields: ["revoked_at"],
      },
    });
  });
}

export async function changeMemberRole(
  access: WorkspaceAccess,
  input: {
    membershipId: string;
    version: number;
    role: "editor" | "viewer";
  },
) {
  if (access.role !== "owner")
    throw new WorkspaceDomainError("WORKSPACE_ROLE_DENIED");
  return getDatabase().$transaction(async (tx) => {
    const result = await tx.membership.updateMany({
      where: {
        id: input.membershipId,
        workspaceId: access.workspaceId,
        status: "active",
        role: { not: "owner" },
        version: input.version,
      },
      data: { role: input.role, version: { increment: 1 } },
    });
    if (result.count !== 1)
      throw new WorkspaceDomainError("MEMBERSHIP_CONFLICT");
    await tx.auditEvent.create({
      data: {
        workspaceId: access.workspaceId,
        actorId: access.actorId,
        entityType: "membership",
        entityId: input.membershipId,
        action: "role_changed",
        changedFields: ["role", "version"],
      },
    });
  });
}

export async function revokeMember(
  access: WorkspaceAccess,
  input: { membershipId: string; version: number },
) {
  if (access.role !== "owner" || access.workspaceType !== "shared")
    throw new WorkspaceDomainError("WORKSPACE_ROLE_DENIED");
  return getDatabase().$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id FROM app.workspaces
      WHERE id = ${access.workspaceId}::uuid
      FOR UPDATE
    `;
    const workspace = await tx.workspace.findUniqueOrThrow({
      where: { id: access.workspaceId },
      select: { ownershipTransferToMembershipId: true },
    });
    const result = await tx.membership.updateMany({
      where: {
        id: input.membershipId,
        workspaceId: access.workspaceId,
        status: "active",
        role: { not: "owner" },
        version: input.version,
      },
      data: { status: "revoked", version: { increment: 1 } },
    });
    if (result.count !== 1)
      throw new WorkspaceDomainError("MEMBERSHIP_CONFLICT");
    if (workspace.ownershipTransferToMembershipId === input.membershipId) {
      await tx.workspace.update({
        where: { id: access.workspaceId },
        data: {
          ownershipTransferToMembershipId: null,
          ownershipTransferRequestedAt: null,
          ownershipTransferExpiresAt: null,
          version: { increment: 1 },
        },
      });
    }
    await tx.auditEvent.create({
      data: {
        workspaceId: access.workspaceId,
        actorId: access.actorId,
        entityType: "membership",
        entityId: input.membershipId,
        action: "revoked",
        changedFields: ["status", "version"],
      },
    });
  });
}

export async function requestOwnershipTransfer(
  access: WorkspaceAccess,
  input: {
    membershipId: string;
    workspaceVersion: number;
    now?: Date;
  },
) {
  if (access.role !== "owner" || access.workspaceType !== "shared") {
    throw new WorkspaceDomainError("OWNERSHIP_TRANSFER_NOT_ALLOWED");
  }
  const now = input.now ?? new Date();
  return getDatabase().$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id FROM app.workspaces
      WHERE id = ${access.workspaceId}::uuid
      FOR UPDATE
    `;
    const workspace = await tx.workspace.findFirst({
      where: {
        id: access.workspaceId,
        type: "shared",
        version: input.workspaceVersion,
        ownershipTransferToMembershipId: null,
      },
      select: { id: true },
    });
    const target = await tx.membership.findFirst({
      where: {
        id: input.membershipId,
        workspaceId: access.workspaceId,
        status: "active",
        role: { not: "owner" },
        userId: { not: access.actorId },
      },
      select: { id: true },
    });
    if (!workspace || !target) {
      throw new WorkspaceDomainError("OWNERSHIP_TRANSFER_CONFLICT");
    }
    const updated = await tx.workspace.updateMany({
      where: {
        id: access.workspaceId,
        version: input.workspaceVersion,
        ownershipTransferToMembershipId: null,
      },
      data: {
        ownershipTransferToMembershipId: target.id,
        ownershipTransferRequestedAt: now,
        ownershipTransferExpiresAt: new Date(
          now.valueOf() + 7 * 24 * 60 * 60 * 1000,
        ),
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new WorkspaceDomainError("OWNERSHIP_TRANSFER_CONFLICT");
    }
    await tx.auditEvent.create({
      data: {
        workspaceId: access.workspaceId,
        actorId: access.actorId,
        entityType: "workspace",
        entityId: access.workspaceId,
        action: "ownership_transfer_requested",
        changedFields: [
          "ownership_transfer_to_membership_id",
          "ownership_transfer_requested_at",
          "ownership_transfer_expires_at",
          "version",
        ],
      },
    });
  });
}

export async function cancelOwnershipTransfer(
  access: WorkspaceAccess,
  input: { workspaceVersion: number },
) {
  if (access.role !== "owner" || access.workspaceType !== "shared") {
    throw new WorkspaceDomainError("OWNERSHIP_TRANSFER_NOT_ALLOWED");
  }
  return getDatabase().$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id FROM app.workspaces
      WHERE id = ${access.workspaceId}::uuid
      FOR UPDATE
    `;
    const updated = await tx.workspace.updateMany({
      where: {
        id: access.workspaceId,
        type: "shared",
        version: input.workspaceVersion,
        ownershipTransferToMembershipId: { not: null },
      },
      data: {
        ownershipTransferToMembershipId: null,
        ownershipTransferRequestedAt: null,
        ownershipTransferExpiresAt: null,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new WorkspaceDomainError("OWNERSHIP_TRANSFER_CONFLICT");
    }
    await tx.auditEvent.create({
      data: {
        workspaceId: access.workspaceId,
        actorId: access.actorId,
        entityType: "workspace",
        entityId: access.workspaceId,
        action: "ownership_transfer_cancelled",
        changedFields: [
          "ownership_transfer_to_membership_id",
          "ownership_transfer_requested_at",
          "ownership_transfer_expires_at",
          "version",
        ],
      },
    });
  });
}

export async function acceptOwnershipTransfer(
  access: WorkspaceAccess,
  input: {
    workspaceVersion: number;
    membershipVersion: number;
    now?: Date;
  },
) {
  if (access.role === "owner" || access.workspaceType !== "shared") {
    throw new WorkspaceDomainError("OWNERSHIP_TRANSFER_NOT_ALLOWED");
  }
  const now = input.now ?? new Date();
  return getDatabase().$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id FROM app.workspaces
      WHERE id = ${access.workspaceId}::uuid
      FOR UPDATE
    `;
    const target = await tx.membership.findFirst({
      where: {
        workspaceId: access.workspaceId,
        userId: access.actorId,
        status: "active",
        role: { not: "owner" },
        version: input.membershipVersion,
      },
      select: { id: true },
    });
    const workspace = target
      ? await tx.workspace.findFirst({
          where: {
            id: access.workspaceId,
            type: "shared",
            version: input.workspaceVersion,
            ownershipTransferToMembershipId: target.id,
            ownershipTransferExpiresAt: { gt: now },
          },
          select: { id: true },
        })
      : null;
    const currentOwner = workspace
      ? await tx.membership.findFirst({
          where: {
            workspaceId: access.workspaceId,
            status: "active",
            role: "owner",
          },
          select: { id: true, version: true },
        })
      : null;
    if (!target || !workspace || !currentOwner) {
      throw new WorkspaceDomainError("OWNERSHIP_TRANSFER_CONFLICT");
    }
    const demoted = await tx.membership.updateMany({
      where: {
        id: currentOwner.id,
        workspaceId: access.workspaceId,
        status: "active",
        role: "owner",
        version: currentOwner.version,
      },
      data: { role: "editor", version: { increment: 1 } },
    });
    const promoted = await tx.membership.updateMany({
      where: {
        id: target.id,
        workspaceId: access.workspaceId,
        status: "active",
        role: { not: "owner" },
        version: input.membershipVersion,
      },
      data: { role: "owner", version: { increment: 1 } },
    });
    const cleared = await tx.workspace.updateMany({
      where: {
        id: access.workspaceId,
        version: input.workspaceVersion,
        ownershipTransferToMembershipId: target.id,
      },
      data: {
        ownershipTransferToMembershipId: null,
        ownershipTransferRequestedAt: null,
        ownershipTransferExpiresAt: null,
        version: { increment: 1 },
      },
    });
    if (demoted.count !== 1 || promoted.count !== 1 || cleared.count !== 1) {
      throw new WorkspaceDomainError("OWNERSHIP_TRANSFER_CONFLICT");
    }
    await tx.auditEvent.create({
      data: {
        workspaceId: access.workspaceId,
        actorId: access.actorId,
        entityType: "workspace",
        entityId: access.workspaceId,
        action: "ownership_transferred",
        changedFields: ["owner_membership", "ownership_transfer", "version"],
      },
    });
  });
}

export async function leaveSharedWorkspace(
  access: WorkspaceAccess,
  input: { membershipVersion: number },
) {
  if (access.workspaceType !== "shared") {
    throw new WorkspaceDomainError("WORKSPACE_LEAVE_NOT_ALLOWED");
  }
  if (access.role === "owner") {
    throw new WorkspaceDomainError("OWNER_TRANSFER_REQUIRED");
  }
  return getDatabase().$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id FROM app.workspaces
      WHERE id = ${access.workspaceId}::uuid
      FOR UPDATE
    `;
    const member = await tx.membership.findFirst({
      where: {
        workspaceId: access.workspaceId,
        userId: access.actorId,
        status: "active",
        role: { not: "owner" },
        version: input.membershipVersion,
      },
      select: { id: true },
    });
    if (!member) throw new WorkspaceDomainError("MEMBERSHIP_CONFLICT");
    const workspace = await tx.workspace.findUniqueOrThrow({
      where: { id: access.workspaceId },
      select: { ownershipTransferToMembershipId: true },
    });
    const updated = await tx.membership.updateMany({
      where: {
        id: member.id,
        workspaceId: access.workspaceId,
        version: input.membershipVersion,
        status: "active",
        role: { not: "owner" },
      },
      data: { status: "revoked", version: { increment: 1 } },
    });
    if (updated.count !== 1) {
      throw new WorkspaceDomainError("MEMBERSHIP_CONFLICT");
    }
    if (workspace.ownershipTransferToMembershipId === member.id) {
      await tx.workspace.update({
        where: { id: access.workspaceId },
        data: {
          ownershipTransferToMembershipId: null,
          ownershipTransferRequestedAt: null,
          ownershipTransferExpiresAt: null,
          version: { increment: 1 },
        },
      });
    }
    await tx.auditEvent.create({
      data: {
        workspaceId: access.workspaceId,
        actorId: access.actorId,
        entityType: "membership",
        entityId: member.id,
        action: "left",
        changedFields: ["status", "version"],
      },
    });
  });
}
