"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import {
  telegramIntegrationAction,
  type TelegramActionState,
} from "@/app/(workspace)/telegram-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutomationGuideDialog } from "@/components/automation-guide-dialog";

type Option = { id: string; name: string };

export function TelegramIntegrationCard({
  workspaceId,
  accounts,
  expenseCategories,
  incomeCategories,
  initialState,
}: {
  workspaceId: string;
  accounts: Option[];
  expenseCategories: Option[];
  incomeCategories: Option[];
  initialState: TelegramActionState;
}) {
  const [state, action, pending] = useActionState(
    telegramIntegrationAction,
    initialState,
  );
  return (
    <Card id="integrasi-telegram" className="scroll-mt-5 shadow-none">
      <CardHeader>
        <Send className="mb-2 size-5 text-primary" aria-hidden="true" />
        <CardTitle>Catat lewat Telegram</CardTitle>
        <p className="text-sm text-muted-foreground">
          Kirim “beli kopi 25rb bca” untuk pengeluaran atau “pemasukan: gaji 5jt
          bca” untuk pemasukan. Bot meminta konfirmasi sebelum saldo berubah.
          Kategori pengeluaran disarankan dari riwayat dan kata kunci.
        </p>
        <div className="pt-2">
          <AutomationGuideDialog kind="telegram" workspaceId={workspaceId} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(state.error || state.message) && (
          <p
            role={state.error ? "alert" : "status"}
            className="rounded-lg bg-secondary p-3 text-sm"
          >
            {state.error ?? state.message}
          </p>
        )}
        {state.configured && (
          <p className="rounded-lg border p-3 text-sm">
            {state.linked ? "Terhubung" : "Menunggu tautan dibuka"} · Akun:{" "}
            {state.accountName ??
              accounts.find((item) => item.id === state.accountId)?.name ??
              "Akun"}{" "}
            · Pengeluaran:{" "}
            {state.categoryName ??
              expenseCategories.find((item) => item.id === state.categoryId)
                ?.name ??
              "Kategori"}
            {" · Pemasukan: "}
            {state.incomeCategoryName ??
              incomeCategories.find(
                (item) => item.id === state.incomeCategoryId,
              )?.name ??
              "Belum diatur"}
          </p>
        )}
        {state.link && (
          <a
            href={state.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-all rounded-lg border border-primary/40 p-3 text-sm text-primary underline"
          >
            Buka bot dan hubungkan Telegram
          </a>
        )}
        {state.configured && (
          <form
            action={action}
            className="rounded-xl border bg-secondary/35 p-4"
          >
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="intent" value="budget-alerts" />
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={state.budgetAlertsEnabled}
                disabled={!state.linked || pending}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">
                  Peringatan budget 80% dan 100%
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Dikirim sekali per kategori dan periode ke Telegram Anda
                  setelah pengeluaran tersimpan.
                </span>
              </span>
            </label>
            <Button
              type="submit"
              variant="outline"
              disabled={!state.linked || pending}
              className="mt-3"
            >
              Simpan notifikasi
            </Button>
            {!state.linked && (
              <p className="mt-2 text-xs text-muted-foreground">
                Selesaikan koneksi bot untuk mengaktifkan notifikasi.
              </p>
            )}
          </form>
        )}
        <form action={action} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="intent" value="configure" />
          <label className="text-sm font-medium">
            Akun default
            <select
              name="accountId"
              defaultValue={state.accountId ?? ""}
              required
              className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">Pilih akun</option>
              {accounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Kategori pengeluaran default
            <select
              name="categoryId"
              defaultValue={state.categoryId ?? ""}
              required
              className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">Pilih kategori</option>
              {expenseCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Kategori pemasukan default
            <select
              name="incomeCategoryId"
              defaultValue={state.incomeCategoryId ?? ""}
              required
              className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">Pilih kategori</option>
              {incomeCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="submit"
            disabled={
              pending ||
              !accounts.length ||
              !expenseCategories.length ||
              !incomeCategories.length
            }
            className="min-h-11 sm:col-span-2"
          >
            {pending
              ? "Menyiapkan..."
              : state.configured
                ? "Atur ulang dan buat tautan baru"
                : "Hubungkan Telegram"}
          </Button>
        </form>
        {(!expenseCategories.length || !incomeCategories.length) && (
          <p className="text-xs text-destructive">
            Tambahkan minimal satu kategori pengeluaran dan satu kategori
            pemasukan aktif sebelum menghubungkan Telegram.
          </p>
        )}
        {state.configured && (
          <form action={action}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="intent" value="revoke" />
            <Button type="submit" variant="outline" disabled={pending}>
              Putuskan Telegram
            </Button>
          </form>
        )}
        <p className="text-xs text-muted-foreground">
          Satu akun Telegram terhubung ke satu ruang. Gunakan chat pribadi
          dengan bot. Pesan yang belum dikonfirmasi tidak masuk saldo, budget,
          atau laporan.
        </p>
      </CardContent>
    </Card>
  );
}
