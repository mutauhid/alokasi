"use server";

import { redirect } from "next/navigation";
import {
  changePasswordInput,
  deleteAccountInput,
  updateProfileInput,
} from "@/modules/users/domain";
import { UserDomainError } from "@/modules/users/errors";
import {
  deleteApplicationAccount,
  updateApplicationProfile,
} from "@/modules/users/service";
import { requireWorkspaceAccess } from "@/modules/workspaces/service";
import { createSupabaseAdminClient } from "@/server/auth/admin";
import { getAuthAdminConfig } from "@/server/auth/config";
import {
  reauthenticateWithPassword,
  requireVerifiedIdentity,
} from "@/server/auth/identity";
import { createSupabaseServerClient } from "@/server/auth/server";

function text(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function settingsError(workspaceId: string, error: string): never {
  redirect(
    `/settings?workspaceId=${encodeURIComponent(workspaceId)}&error=${error}`,
  );
}

function settingsSuccess(workspaceId: string, success: string): never {
  redirect(
    `/settings?workspaceId=${encodeURIComponent(workspaceId)}&success=${success}`,
  );
}

async function accountMutationContext(workspaceId: string) {
  const identity = await requireVerifiedIdentity();
  let access;
  try {
    access = await requireWorkspaceAccess(identity, workspaceId);
  } catch {
    settingsError(workspaceId, "profile-access");
  }
  return { identity, access };
}

export async function updateProfileAction(form: FormData) {
  const workspaceId = text(form, "workspaceId");
  const input = updateProfileInput.safeParse({
    displayName: text(form, "displayName"),
  });
  if (!input.success) settingsError(workspaceId, "profile-invalid");
  const { identity, access } = await accountMutationContext(workspaceId);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    data: { display_name: input.data.displayName },
  });
  if (error) settingsError(workspaceId, "profile-provider-failed");
  try {
    await updateApplicationProfile({
      actorId: access.actorId,
      authSubject: identity.subject,
      displayName: input.data.displayName,
    });
  } catch {
    settingsError(workspaceId, "profile-failed");
  }
  settingsSuccess(workspaceId, "profile-updated");
}

export async function changePasswordAction(form: FormData) {
  const workspaceId = text(form, "workspaceId");
  const input = changePasswordInput.safeParse({
    currentPassword: text(form, "currentPassword"),
    newPassword: text(form, "newPassword"),
    confirmation: text(form, "confirmation"),
  });
  if (!input.success) settingsError(workspaceId, "password-invalid");
  const { identity } = await accountMutationContext(workspaceId);
  if (
    !(await reauthenticateWithPassword(identity, input.data.currentPassword))
  ) {
    settingsError(workspaceId, "password-auth");
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: input.data.newPassword,
  });
  if (error) settingsError(workspaceId, "password-failed");
  await supabase.auth.signOut({ scope: "global" }).catch(() => undefined);
  redirect("/login?passwordChanged=1");
}

export async function deleteAccountAction(form: FormData) {
  const workspaceId = text(form, "workspaceId");
  const input = deleteAccountInput.safeParse({
    confirmationEmail: text(form, "confirmationEmail"),
    password: text(form, "password"),
  });
  if (!input.success) settingsError(workspaceId, "account-delete-invalid");
  if (!getAuthAdminConfig()) {
    settingsError(workspaceId, "account-delete-unavailable");
  }

  const identity = await requireVerifiedIdentity();
  let access;
  try {
    access = await requireWorkspaceAccess(identity, workspaceId, ["owner"]);
  } catch {
    settingsError(workspaceId, "account-delete-conflict");
  }
  if (access.workspaceType !== "personal") {
    settingsError(workspaceId, "account-delete-personal-only");
  }
  if (!(await reauthenticateWithPassword(identity, input.data.password))) {
    settingsError(workspaceId, "account-delete-auth");
  }

  try {
    await deleteApplicationAccount({
      actorId: access.actorId,
      authSubject: identity.subject,
      confirmationEmail: input.data.confirmationEmail,
    });
  } catch (error) {
    const code =
      error instanceof UserDomainError
        ? error.code === "ACCOUNT_EMAIL_MISMATCH"
          ? "account-delete-email"
          : error.code === "ACCOUNT_OWNS_SHARED_WORKSPACE"
            ? "account-delete-owner"
            : "account-delete-conflict"
        : "account-delete-conflict";
    settingsError(workspaceId, code);
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "global" }).catch(() => undefined);
  let cleanupFailed = true;
  try {
    const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(
      identity.subject,
    );
    cleanupFailed = Boolean(error);
  } catch {
    cleanupFailed = true;
  }
  redirect(
    cleanupFailed
      ? "/login?accountDeletion=pending"
      : "/login?accountDeleted=1",
  );
}
