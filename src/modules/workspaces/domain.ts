import { z } from "zod";

const normalizedText = (maximum: number) =>
  z
    .string()
    .transform((value) => value.normalize("NFC").trim().replace(/\s+/gu, " "))
    .pipe(z.string().min(1).max(maximum));

export const workspaceIdInput = z.uuid();

export const createSharedWorkspaceInput = z.object({
  name: normalizedText(100),
});

export const createInvitationInput = z.object({
  workspaceId: workspaceIdInput,
  email: z
    .email()
    .transform((value) => value.trim().toLocaleLowerCase("en-US")),
  role: z.enum(["editor", "viewer"]),
});

export const changeMemberRoleInput = z.object({
  workspaceId: workspaceIdInput,
  membershipId: z.uuid(),
  version: z.coerce.number().int().positive(),
  role: z.enum(["editor", "viewer"]),
});

export const revokeEntityInput = z.object({
  workspaceId: workspaceIdInput,
  id: z.uuid(),
  version: z.coerce.number().int().positive().optional(),
});

export const requestOwnershipTransferInput = z.object({
  workspaceId: workspaceIdInput,
  membershipId: z.uuid(),
  workspaceVersion: z.coerce.number().int().positive(),
});

export const ownershipTransferDecisionInput = z.object({
  workspaceId: workspaceIdInput,
  workspaceVersion: z.coerce.number().int().positive(),
  membershipVersion: z.coerce.number().int().positive().optional(),
});

export const leaveWorkspaceInput = z.object({
  workspaceId: workspaceIdInput,
  membershipVersion: z.coerce.number().int().positive(),
});

export const deleteWorkspaceInput = z.object({
  workspaceId: workspaceIdInput,
  workspaceVersion: z.coerce.number().int().positive(),
  confirmationName: z.string().min(1).max(100),
  password: z.string().min(1).max(256),
});
