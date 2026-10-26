"use server";

import { revalidatePath } from "next/cache";
import { requireVerifiedIdentity } from "@/server/auth/identity";
import { requireWorkspaceAccess } from "@/modules/workspaces/service";
import {
  configureTelegram,
  revokeTelegram,
  TelegramInputError,
  updateTelegramBudgetAlerts,
} from "@/modules/telegram-integration/service";

export type TelegramActionState = {
  configured: boolean;
  linked?: boolean;
  accountName?: string;
  categoryName?: string;
  incomeCategoryName?: string;
  accountId?: string;
  categoryId?: string;
  incomeCategoryId?: string;
  link?: string;
  budgetAlertsEnabled?: boolean;
  message?: string;
  error?: string;
};

function value(form: FormData, key: string) {
  const item = form.get(key);
  return typeof item === "string" ? item : "";
}

export async function telegramIntegrationAction(
  previous: TelegramActionState,
  form: FormData,
): Promise<TelegramActionState> {
  const identity = await requireVerifiedIdentity();
  const access = await requireWorkspaceAccess(
    identity,
    value(form, "workspaceId"),
    ["owner", "editor"],
  );
  try {
    if (value(form, "intent") === "budget-alerts") {
      const enabled = value(form, "enabled") === "on";
      await updateTelegramBudgetAlerts(access, enabled);
      revalidatePath("/settings");
      return {
        ...previous,
        budgetAlertsEnabled: enabled,
        message: enabled
          ? "Notifikasi budget Telegram diaktifkan."
          : "Notifikasi budget Telegram dinonaktifkan.",
        error: undefined,
      };
    }
    if (value(form, "intent") === "revoke") {
      await revokeTelegram(access);
      revalidatePath("/settings");
      return {
        configured: false,
        budgetAlertsEnabled: false,
        message:
          "Telegram diputuskan. Bot tidak lagi dapat mencatat transaksi.",
      };
    }
    const accountId = value(form, "accountId");
    const categoryId = value(form, "categoryId");
    const incomeCategoryId = value(form, "incomeCategoryId");
    const username = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/u, "");
    if (
      !username ||
      !/^[A-Za-z][A-Za-z0-9_]{4,31}$/u.test(username) ||
      !process.env.TELEGRAM_BOT_TOKEN ||
      !process.env.TELEGRAM_WEBHOOK_SECRET
    )
      return {
        ...previous,
        error: "Konfigurasi bot Telegram belum lengkap di server.",
      };
    const code = await configureTelegram(
      access,
      accountId,
      categoryId,
      incomeCategoryId,
    );
    revalidatePath("/settings");
    return {
      configured: true,
      linked: false,
      accountId,
      categoryId,
      incomeCategoryId,
      link: `https://t.me/${username}?start=${code}`,
      message:
        "Buka tautan ini di Telegram dalam 15 menit. Coba pengeluaran: beli kopi 25rb bca, atau pemasukan: gaji 5jt bca.",
    };
  } catch (error) {
    return {
      ...previous,
      error:
        error instanceof TelegramInputError
          ? error.message
          : "Pengaturan Telegram belum dapat disimpan.",
    };
  }
}
