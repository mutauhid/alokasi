"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Smartphone, Trash2 } from "lucide-react";
import { shortcutIntegrationAction } from "@/app/(workspace)/shortcut-actions";
import type { ShortcutIntegrationState } from "@/modules/shortcut-integration/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Option = { id: string; name: string };
const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-xs";

export function ShortcutIntegrationCard({
  workspaceId,
  accounts,
  categories,
  initialState,
}: {
  workspaceId: string;
  accounts: Option[];
  categories: Option[];
  initialState: ShortcutIntegrationState;
}) {
  const [state, action, pending] = useActionState(
    shortcutIntegrationAction,
    initialState,
  );
  const [copied, setCopied] = useState<"token" | "endpoint">();

  async function copy(value: string, kind: "token" | "endpoint") {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <Smartphone className="mb-2 size-5 text-primary" aria-hidden="true" />
        <CardTitle>Shortcut iPhone</CardTitle>
        <p className="text-sm text-muted-foreground">
          Ketuk belakang iPhone untuk mengambil screenshot, membaca teks, dan
          membuka draf konfirmasi di Alokasi.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-background/50 p-4 text-sm">
          <p className="font-medium">Privasi alur</p>
          <p className="mt-1 text-muted-foreground">
            Screenshot tidak diunggah. Apple Shortcuts mengirim teks OCR ke
            server Alokasi untuk diparsing sementara; teks mentah tidak disimpan
            atau dicatat pada log aplikasi.
          </p>
        </div>

        {(state.error || state.message) && (
          <p
            role={state.error ? "alert" : "status"}
            className={
              state.error
                ? "rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                : "rounded-lg bg-secondary p-3 text-sm"
            }
          >
            {state.error ?? state.message}
          </p>
        )}

        {state.token && state.endpoint && (
          <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold">
              Simpan dua nilai ini sekarang
            </p>
            {[
              {
                label: "Endpoint",
                value: state.endpoint,
                kind: "endpoint" as const,
              },
              { label: "Token", value: state.token, kind: "token" as const },
            ].map((item) => (
              <div key={item.kind}>
                <p className="mb-1 text-xs text-muted-foreground">
                  {item.label}
                </p>
                <div className="flex gap-2">
                  <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-background p-2 text-xs">
                    {item.value}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => copy(item.value, item.kind)}
                  >
                    {copied === item.kind ? <Check /> : <Copy />}
                    <span className="sr-only">Salin {item.label}</span>
                  </Button>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Token hanya tampil sekali. Membuat token baru otomatis
              menonaktifkan token lama.
            </p>
          </div>
        )}

        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="intent" value="configure" />
          <label className="text-sm font-medium">
            Akun default
            <select name="accountId" required className={inputClass}>
              <option value="">Pilih akun</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Kategori default
            <select name="categoryId" required className={inputClass}>
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="submit"
            disabled={pending || !accounts.length || !categories.length}
            className="min-h-11 sm:col-span-2"
          >
            {pending
              ? "Menyiapkan…"
              : state.configured
                ? "Buat ulang token"
                : "Buat token Shortcut"}
          </Button>
        </form>

        {state.configured && !state.token && (
          <div className="rounded-xl border p-4 text-sm">
            <p className="font-medium">Integrasi aktif</p>
            <p className="mt-1 text-muted-foreground">
              Default: {state.accountName ?? "akun tidak tersedia"} ·{" "}
              {state.categoryName ?? "kategori tidak tersedia"}
            </p>
            {state.expiresAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Berlaku sampai{" "}
                {new Date(state.expiresAt).toLocaleDateString("id-ID")}.
              </p>
            )}
            {state.lastUsedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Terakhir digunakan{" "}
                {new Date(state.lastUsedAt).toLocaleString("id-ID")}.
              </p>
            )}
          </div>
        )}

        {state.configured && (
          <form action={action}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="intent" value="revoke" />
            <Button type="submit" variant="outline" disabled={pending}>
              <Trash2 /> Cabut token
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
