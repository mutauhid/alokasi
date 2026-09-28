"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  reauthenticateWithPassword,
  requireVerifiedIdentity,
} from "@/server/auth/identity";
import {
  changeMemberRoleInput,
  createInvitationInput,
  createSharedWorkspaceInput,
  deleteWorkspaceInput,
  leaveWorkspaceInput,
  ownershipTransferDecisionInput,
  requestOwnershipTransferInput,
  revokeEntityInput,
} from "@/modules/workspaces/domain";
import {
  acceptInvitation,
  acceptOwnershipTransfer,
  cancelOwnershipTransfer,
  changeMemberRole,
  createInvitation,
  createSharedWorkspace,
  deleteSharedWorkspace,
  leaveSharedWorkspace,
  requireWorkspaceAccess,
  requestOwnershipTransfer,
  revokeInvitation,
  revokeMember,
} from "@/modules/workspaces/service";
import { WorkspaceDomainError } from "@/modules/workspaces/errors";
import { getPersonalContext } from "@/modules/workspaces/provision-personal";

function text(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function membersHref(
  workspaceId: string,
  key: "error" | "success",
  value: string,
) {
  return `/members?workspaceId=${encodeURIComponent(workspaceId)}&${key}=${value}`;
}

function localDate(timeZone: string) {
  const value = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${value}T00:00:00.000Z`);
}

export async function createSharedWorkspaceAction(form: FormData) {
  const input = createSharedWorkspaceInput.safeParse({
    name: text(form, "name"),
  });
  if (!input.success) redirect("/members?error=workspace-invalid");
  const identity = await requireVerifiedIdentity();
  const personal = await getPersonalContext(identity);
  let workspace;
  try {
    workspace = await createSharedWorkspace(personal.user.id, {
      name: input.data.name,
      timezone: personal.workspace.timezone,
      now: localDate(personal.workspace.timezone),
    });
  } catch {
    redirect("/members?error=workspace-failed");
  }
  revalidatePath("/members");
  redirect(
    `/members?workspaceId=${encodeURIComponent(workspace.id)}&success=workspace-created`,
  );
}

export type InvitationActionState = {
  error?: string;
  invitationPath?: string;
};

export async function createInvitationAction(
  _state: InvitationActionState,
  form: FormData,
): Promise<InvitationActionState> {
  const input = createInvitationInput.safeParse({
    workspaceId: text(form, "workspaceId"),
    email: text(form, "email"),
    role: text(form, "role"),
  });
  if (!input.success) return { error: "Periksa email dan peran undangan." };
  const identity = await requireVerifiedIdentity();
  try {
    const access = await requireWorkspaceAccess(
      identity,
      input.data.workspaceId,
      ["owner"],
    );
    const result = await createInvitation(access, input.data);
    revalidatePath("/members");
    return { invitationPath: `/invitations/${result.token}` };
  } catch (error) {
    if (
      error instanceof WorkspaceDomainError &&
      error.code === "MEMBER_ALREADY_ACTIVE"
    ) {
      return { error: "Email tersebut sudah menjadi anggota aktif." };
    }
    return { error: "Undangan belum dapat dibuat." };
  }
}

export async function revokeInvitationAction(form: FormData) {
  const input = revokeEntityInput.safeParse({
    workspaceId: text(form, "workspaceId"),
    id: text(form, "id"),
  });
  if (!input.success) redirect("/members?error=invitation-invalid");
  const identity = await requireVerifiedIdentity();
  try {
    const access = await requireWorkspaceAccess(
      identity,
      input.data.workspaceId,
      ["owner"],
    );
    await revokeInvitation(access, input.data.id);
  } catch {
    redirect(
      membersHref(input.data.workspaceId, "error", "invitation-conflict"),
    );
  }
  revalidatePath("/members");
  redirect(
    membersHref(input.data.workspaceId, "success", "invitation-revoked"),
  );
}

export async function changeMemberRoleAction(form: FormData) {
  const input = changeMemberRoleInput.safeParse({
    workspaceId: text(form, "workspaceId"),
    membershipId: text(form, "membershipId"),
    version: text(form, "version"),
    role: text(form, "role"),
  });
  if (!input.success) redirect("/members?error=member-invalid");
  const identity = await requireVerifiedIdentity();
  try {
    const access = await requireWorkspaceAccess(
      identity,
      input.data.workspaceId,
      ["owner"],
    );
    await changeMemberRole(access, input.data);
  } catch {
    redirect(membersHref(input.data.workspaceId, "error", "member-conflict"));
  }
  revalidatePath("/members");
  redirect(
    membersHref(input.data.workspaceId, "success", "member-role-changed"),
  );
}

export async function revokeMemberAction(form: FormData) {
  const input = revokeEntityInput.safeParse({
    workspaceId: text(form, "workspaceId"),
    id: text(form, "membershipId"),
    version: text(form, "version"),
  });
  if (!input.success || !input.data.version)
    redirect("/members?error=member-invalid");
  const identity = await requireVerifiedIdentity();
  try {
    const access = await requireWorkspaceAccess(
      identity,
      input.data.workspaceId,
      ["owner"],
    );
    await revokeMember(access, {
      membershipId: input.data.id,
      version: input.data.version,
    });
  } catch {
    redirect(membersHref(input.data.workspaceId, "error", "member-conflict"));
  }
  revalidatePath("/members");
  redirect(membersHref(input.data.workspaceId, "success", "member-revoked"));
}

export async function requestOwnershipTransferAction(form: FormData) {
  const input = requestOwnershipTransferInput.safeParse({
    workspaceId: text(form, "workspaceId"),
    membershipId: text(form, "membershipId"),
    workspaceVersion: text(form, "workspaceVersion"),
  });
  if (!input.success) redirect("/members?error=ownership-transfer-invalid");
  const identity = await requireVerifiedIdentity();
  try {
    const access = await requireWorkspaceAccess(
      identity,
      input.data.workspaceId,
      ["owner"],
    );
    await requestOwnershipTransfer(access, input.data);
  } catch {
    redirect(
      membersHref(
        input.data.workspaceId,
        "error",
        "ownership-transfer-conflict",
      ),
    );
  }
  revalidatePath("/members");
  redirect(
    membersHref(
      input.data.workspaceId,
      "success",
      "ownership-transfer-requested",
    ),
  );
}

export async function cancelOwnershipTransferAction(form: FormData) {
  const input = ownershipTransferDecisionInput.safeParse({
    workspaceId: text(form, "workspaceId"),
    workspaceVersion: text(form, "workspaceVersion"),
  });
  if (!input.success) redirect("/members?error=ownership-transfer-invalid");
  const identity = await requireVerifiedIdentity();
  try {
    const access = await requireWorkspaceAccess(
      identity,
      input.data.workspaceId,
      ["owner"],
    );
    await cancelOwnershipTransfer(access, input.data);
  } catch {
    redirect(
      membersHref(
        input.data.workspaceId,
        "error",
        "ownership-transfer-conflict",
      ),
    );
  }
  revalidatePath("/members");
  redirect(
    membersHref(
      input.data.workspaceId,
      "success",
      "ownership-transfer-cancelled",
    ),
  );
}

export async function acceptOwnershipTransferAction(form: FormData) {
  const input = ownershipTransferDecisionInput.safeParse({
    workspaceId: text(form, "workspaceId"),
    workspaceVersion: text(form, "workspaceVersion"),
    membershipVersion: text(form, "membershipVersion"),
  });
  if (!input.success || !input.data.membershipVersion) {
    redirect("/members?error=ownership-transfer-invalid");
  }
  const identity = await requireVerifiedIdentity();
  try {
    const access = await requireWorkspaceAccess(
      identity,
      input.data.workspaceId,
      ["editor", "viewer"],
    );
    await acceptOwnershipTransfer(access, {
      workspaceVersion: input.data.workspaceVersion,
      membershipVersion: input.data.membershipVersion,
    });
  } catch {
    redirect(
      membersHref(
        input.data.workspaceId,
        "error",
        "ownership-transfer-conflict",
      ),
    );
  }
  revalidatePath("/members");
  redirect(
    membersHref(
      input.data.workspaceId,
      "success",
      "ownership-transfer-accepted",
    ),
  );
}

export async function leaveWorkspaceAction(form: FormData) {
  const input = leaveWorkspaceInput.safeParse({
    workspaceId: text(form, "workspaceId"),
    membershipVersion: text(form, "membershipVersion"),
  });
  if (!input.success) redirect("/members?error=member-invalid");
  const identity = await requireVerifiedIdentity();
  const personal = await getPersonalContext(identity);
  try {
    const access = await requireWorkspaceAccess(
      identity,
      input.data.workspaceId,
    );
    await leaveSharedWorkspace(access, input.data);
  } catch (error) {
    const code =
      error instanceof WorkspaceDomainError &&
      error.code === "OWNER_TRANSFER_REQUIRED"
        ? "owner-transfer-required"
        : "member-conflict";
    redirect(membersHref(input.data.workspaceId, "error", code));
  }
  revalidatePath("/members");
  redirect(membersHref(personal.workspace.id, "success", "workspace-left"));
}

export async function deleteSharedWorkspaceAction(form: FormData) {
  const input = deleteWorkspaceInput.safeParse({
    workspaceId: text(form, "workspaceId"),
    workspaceVersion: text(form, "workspaceVersion"),
    confirmationName: text(form, "confirmationName"),
    password: text(form, "password"),
  });
  if (!input.success) redirect("/members?error=workspace-delete-invalid");
  const identity = await requireVerifiedIdentity();
  const personal = await getPersonalContext(identity);
  let access;
  try {
    access = await requireWorkspaceAccess(identity, input.data.workspaceId, [
      "owner",
    ]);
  } catch {
    redirect(
      membersHref(input.data.workspaceId, "error", "workspace-delete-conflict"),
    );
  }
  if (!(await reauthenticateWithPassword(identity, input.data.password))) {
    redirect(
      membersHref(input.data.workspaceId, "error", "workspace-delete-auth"),
    );
  }
  try {
    await deleteSharedWorkspace(access, {
      workspaceVersion: input.data.workspaceVersion,
      confirmationName: input.data.confirmationName,
    });
  } catch (error) {
    const code =
      error instanceof WorkspaceDomainError &&
      error.code === "WORKSPACE_DELETE_NAME_MISMATCH"
        ? "workspace-delete-name"
        : "workspace-delete-conflict";
    redirect(membersHref(input.data.workspaceId, "error", code));
  }
  revalidatePath("/dashboard");
  revalidatePath("/members");
  redirect(membersHref(personal.workspace.id, "success", "workspace-deleted"));
}

export async function acceptInvitationAction(form: FormData) {
  const token = text(form, "token");
  if (!token) redirect("/dashboard");
  const identity = await requireVerifiedIdentity();
  let workspaceId: string;
  try {
    workspaceId = await acceptInvitation(identity, token);
  } catch (error) {
    const code =
      error instanceof WorkspaceDomainError &&
      error.code === "INVITATION_EMAIL_MISMATCH"
        ? "email-mismatch"
        : "invalid";
    redirect(`/invitations/${encodeURIComponent(token)}?error=${code}`);
  }
  revalidatePath("/dashboard");
  redirect(
    `/dashboard?workspaceId=${encodeURIComponent(workspaceId)}&success=invitation-accepted`,
  );
}
