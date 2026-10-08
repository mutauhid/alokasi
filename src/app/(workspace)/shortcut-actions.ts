"use server";

import { revalidatePath } from "next/cache";
import { configureShortcutInput } from "@/modules/shortcut-integration/domain";
import type { ShortcutIntegrationState } from "@/modules/shortcut-integration/domain";
import {
  configureShortcutIntegration,
  revokeShortcutIntegration,
  shortcutErrorMessage,
} from "@/modules/shortcut-integration/service";
import { requireWorkspaceAccess } from "@/modules/workspaces/service";
import { appOrigin } from "@/server/auth/http";
import { requireVerifiedIdentity } from "@/server/auth/identity";

function text(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export async function shortcutIntegrationAction(
  previous: ShortcutIntegrationState,
  form: FormData,
): Promise<ShortcutIntegrationState> {
  const identity = await requireVerifiedIdentity();
  const access = await requireWorkspaceAccess(
    identity,
    text(form, "workspaceId"),
    ["owner", "editor"],
  );
  if (text(form, "intent") === "revoke") {
    try {
      await revokeShortcutIntegration(access);
      revalidatePath("/settings");
      return {
        configured: false,
        message: "Token iPhone dicabut. Shortcut lama tidak dapat digunakan.",
      };
    } catch (error) {
      return { ...previous, error: shortcutErrorMessage(error) };
    }
  }

  const input = configureShortcutInput.safeParse({
    accountId: text(form, "accountId"),
    categoryId: text(form, "categoryId"),
  });
  if (!input.success) {
    return { ...previous, error: "Pilih akun dan kategori default." };
  }
  try {
    const configured = await configureShortcutIntegration(access, input.data);
    revalidatePath("/settings");
    return {
      configured: true,
      token: configured.token,
      endpoint: `${appOrigin()}/api/integrations/ios-shortcut/receipt-drafts`,
      expiresAt: configured.expiresAt.toISOString(),
      message:
        "Token dibuat. Salin sekarang karena token tidak dapat ditampilkan lagi.",
    };
  } catch (error) {
    return { ...previous, error: shortcutErrorMessage(error) };
  }
}
