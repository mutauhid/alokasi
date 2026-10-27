"use server";

import { revalidatePath } from "next/cache";
import { normalizeRupiahInput } from "@/lib/rupiah-input";
import { requireWorkspaceAccess } from "@/modules/workspaces/service";
import { parseClockMinutes } from "@/modules/web-push/domain";
import { updateWebPushPreference } from "@/modules/web-push/service";
import { requireVerifiedIdentity } from "@/server/auth/identity";

export type WebPushActionState = { message?: string; error?: string };

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function checked(form: FormData, key: string) {
  return text(form, key) === "on";
}

export async function webPushPreferenceAction(
  _previous: WebPushActionState,
  form: FormData,
): Promise<WebPushActionState> {
  const identity = await requireVerifiedIdentity();
  const workspaceId = text(form, "workspaceId");
  const access = await requireWorkspaceAccess(identity, workspaceId);
  const lowBalanceEnabled = checked(form, "lowBalanceEnabled");
  const normalizedThreshold = normalizeRupiahInput(
    text(form, "lowBalanceThreshold"),
  );
  const quietEnabled = checked(form, "quietHoursEnabled");
  const quietHoursStart = quietEnabled
    ? parseClockMinutes(text(form, "quietHoursStart"))
    : null;
  const quietHoursEnd = quietEnabled
    ? parseClockMinutes(text(form, "quietHoursEnd"))
    : null;
  if (
    (lowBalanceEnabled &&
      (!normalizedThreshold || BigInt(normalizedThreshold) <= 0n)) ||
    (quietEnabled && (quietHoursStart === null || quietHoursEnd === null))
  ) {
    return { error: "Periksa batas saldo dan jam tenang yang diisi." };
  }
  try {
    await updateWebPushPreference(access, {
      budgetAlertsEnabled: checked(form, "budgetAlertsEnabled"),
      weeklySummaryEnabled: checked(form, "weeklySummaryEnabled"),
      recurringRemindersEnabled: checked(form, "recurringRemindersEnabled"),
      lowBalanceEnabled,
      lowBalanceThreshold:
        lowBalanceEnabled && normalizedThreshold
          ? BigInt(normalizedThreshold)
          : null,
      staleDraftsEnabled: checked(form, "staleDraftsEnabled"),
      sharedActivityEnabled: checked(form, "sharedActivityEnabled"),
      debtDueRemindersEnabled: checked(form, "debtDueRemindersEnabled"),
      quietHoursStart,
      quietHoursEnd,
      hideSensitiveContent: checked(form, "hideSensitiveContent"),
    });
    revalidatePath("/settings");
    return { message: "Pengaturan notifikasi Web Push berhasil disimpan." };
  } catch {
    return { error: "Pengaturan notifikasi belum dapat disimpan." };
  }
}
