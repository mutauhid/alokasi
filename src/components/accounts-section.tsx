import { randomUUID } from "node:crypto";
import Link from "next/link";
import {
  Banknote,
  CalendarCheck2,
  CreditCard,
  Landmark,
  Plus,
  Scale,
  Wallet,
  X,
} from "lucide-react";
import {
  archiveAccountAction,
  createAccountAction,
  renameAccountAction,
} from "@/app/(workspace)/actions";
import { listAccounts } from "@/modules/accounts/service";
import { getAccountReconciliationOverview } from "@/modules/reconciliations/service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReconciliationForm } from "@/components/reconciliation-form";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-xs";

const typeDetails = {
  bank: { label: "Bank", icon: Landmark },
  ewallet: { label: "E-wallet", icon: CreditCard },
  cash: { label: "Tunai", icon: Banknote },
} as const;

const messages: Record<string, string> = {
  "account-invalid": "Periksa nama, jenis, saldo awal, dan tanggal mulai.",
  "account-conflict": "Akun sudah berubah. Muat ulang lalu coba kembali.",
  "account-not-zero": "Akun hanya dapat diarsipkan ketika saldonya Rp0.",
  "account-recurring-active":
    "Nonaktifkan template transaksi berulang yang memakai akun ini terlebih dahulu.",
  "account-failed": "Perubahan akun belum dapat disimpan.",
  "account-created": "Akun berhasil dibuat.",
  "account-renamed": "Nama akun berhasil diperbarui.",
  "account-archived": "Akun berhasil diarsipkan.",
  "reconciliation-invalid":
    "Periksa akun, tanggal, saldo aktual, dan catatan rekonsiliasi.",
  "reconciliation-access": "Kamu tidak memiliki izin untuk mencocokkan saldo.",
  "reconciliation-account": "Akun tidak tersedia atau sudah diarsipkan.",
  "reconciliation-future": "Tanggal rekonsiliasi tidak boleh di masa depan.",
  "reconciliation-before-account":
    "Tanggal rekonsiliasi mendahului tanggal mulai akun.",
  "reconciliation-difference":
    "Saldo masih berbeda. Perbaiki transaksi atau pilih penyesuaian saldo.",
  "reconciliation-already-matches":
    "Saldo sudah cocok dan tidak memerlukan penyesuaian.",
  "reconciliation-range": "Selisih saldo melebihi batas penyimpanan.",
  "reconciliation-idempotency":
    "Permintaan rekonsiliasi duplikat memiliki isi berbeda.",
  "reconciliation-failed": "Rekonsiliasi belum dapat disimpan.",
  "reconciliation-created":
    "Rekonsiliasi tersimpan dan saldo telah diperbarui bila disesuaikan.",
};

function rupiah(value: bigint) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function AccountsSection({
  workspaceId,
  canManage,
  role,
  today,
  reconcileAccountId,
  reconcileDate,
  error,
  success,
}: {
  workspaceId: string;
  canManage: boolean;
  role: "owner" | "editor" | "viewer";
  today: Date;
  reconcileAccountId?: string;
  reconcileDate?: string;
  error?: string;
  success?: string;
}) {
  const accounts = await listAccounts(workspaceId);
  const todayValue = today.toISOString().slice(0, 10);
  const selectedDateValue =
    reconcileDate &&
    /^\d{4}-\d{2}-\d{2}$/u.test(reconcileDate) &&
    reconcileDate <= todayValue
      ? reconcileDate
      : todayValue;
  const selectedDate = new Date(`${selectedDateValue}T00:00:00.000Z`);
  const reconciliation = reconcileAccountId
    ? await getAccountReconciliationOverview(
        workspaceId,
        reconcileAccountId,
        selectedDate,
      )
    : null;
  const active = accounts.filter((account) => !account.archivedAt);
  const archived = accounts.filter((account) => account.archivedAt);
  const status = error ?? success;
  const canReconcile = role === "owner" || role === "editor";
  const displayDate = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="space-y-5">
      {status && messages[status] && (
        <p
          role="status"
          className={
            error
              ? "rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              : "rounded-lg bg-secondary p-3 text-sm"
          }
        >
          {messages[status]}
        </p>
      )}

      {reconciliation && (
        <Card className="border-primary/30 shadow-none">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Scale
                  className="mb-2 size-5 text-primary"
                  aria-hidden="true"
                />
                <CardTitle>
                  Rekonsiliasi · {reconciliation.account.name}
                </CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Bandingkan saldo catatan Alokasi dengan saldo aktual. Tidak
                  ada perubahan saldo sebelum kamu mengonfirmasi.
                </p>
              </div>
              <Button asChild variant="ghost" size="icon">
                <Link
                  href={`/accounts?workspaceId=${encodeURIComponent(workspaceId)}`}
                  aria-label="Tutup rekonsiliasi"
                >
                  <X />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              action="/accounts"
              method="get"
              className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
            >
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input
                type="hidden"
                name="reconcileAccountId"
                value={reconciliation.account.id}
              />
              <label className="text-sm font-medium">
                Tanggal pengecekan
                <input
                  type="date"
                  name="reconcileDate"
                  min={reconciliation.account.openingDate
                    .toISOString()
                    .slice(0, 10)}
                  max={todayValue}
                  defaultValue={selectedDateValue}
                  className={inputClass}
                />
              </label>
              <Button type="submit" variant="outline" className="min-h-11">
                Hitung saldo
              </Button>
            </form>

            {reconciliation.recordedBalance === null ? (
              <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
                Pilih tanggal yang sama dengan atau setelah tanggal mulai akun.
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">
                      Saldo menurut Alokasi
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {rupiah(reconciliation.recordedBalance)}
                    </p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">Per tanggal</p>
                    <p className="mt-1 text-lg font-semibold">
                      {displayDate.format(selectedDate)}
                    </p>
                  </div>
                </div>
                {canReconcile && !reconciliation.account.archivedAt ? (
                  <ReconciliationForm
                    workspaceId={workspaceId}
                    accountId={reconciliation.account.id}
                    reconciliationDate={selectedDateValue}
                    recordedBalance={reconciliation.recordedBalance.toString()}
                    idempotencyKey={randomUUID()}
                  />
                ) : (
                  <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    Rekonsiliasi baru hanya tersedia bagi Owner atau Editor pada
                    akun aktif.
                  </p>
                )}
              </>
            )}

            <section>
              <h3 className="text-sm font-semibold">Riwayat rekonsiliasi</h3>
              {reconciliation.history.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Belum ada rekonsiliasi untuk akun ini.
                </p>
              ) : (
                <ul className="mt-2 divide-y">
                  {reconciliation.history.map((item) => (
                    <li
                      key={item.id}
                      className="grid gap-2 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {displayDate.format(item.reconciliationDate)}
                          </span>
                          <Badge
                            variant={item.needsReview ? "outline" : "secondary"}
                          >
                            {item.needsReview
                              ? "Perlu diperiksa kembali"
                              : item.resolution === "adjusted"
                                ? "Disesuaikan"
                                : "Cocok"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Catatan {rupiah(item.recordedBalance)} · aktual{" "}
                          {rupiah(item.actualBalance)}
                          {item.note ? ` · ${item.note}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Oleh{" "}
                          {item.creator.user.displayName ??
                            item.creator.user.email ??
                            "Anggota"}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p
                          className={
                            item.difference === 0n
                              ? "font-medium"
                              : "font-medium text-destructive"
                          }
                        >
                          Selisih {rupiah(item.difference)}
                        </p>
                        {item.adjustmentAmount !== 0n && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Penyesuaian {rupiah(item.adjustmentAmount)}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Tambah akun keuangan</CardTitle>
            <p className="text-sm text-muted-foreground">
              Saldo awal menjadi titik mulai pencatatan dan tidak dihitung
              sebagai pemasukan.
            </p>
          </CardHeader>
          <CardContent>
            <form
              action={createAccountAction}
              className="grid gap-4 md:grid-cols-4"
            >
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <label className="text-sm font-medium md:col-span-2">
                Nama akun
                <input
                  name="name"
                  required
                  maxLength={100}
                  placeholder="Contoh: BCA utama"
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium">
                Jenis
                <select name="type" className={inputClass} defaultValue="bank">
                  <option value="bank">Bank</option>
                  <option value="ewallet">E-wallet</option>
                  <option value="cash">Tunai</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Saldo awal
                <input
                  name="openingBalance"
                  type="number"
                  step="1"
                  required
                  defaultValue="0"
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium md:col-span-2">
                Tanggal mulai
                <input
                  name="openingDate"
                  type="date"
                  required
                  max={todayValue}
                  defaultValue={todayValue}
                  className={inputClass}
                />
              </label>
              <div className="flex items-end md:col-span-2 md:justify-end">
                <Button type="submit" className="min-h-11 w-full md:w-auto">
                  <Plus /> Tambah akun
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {active.map((account) => {
          const detail = typeDetails[account.type];
          const Icon = detail.icon;
          return (
            <Card key={account.id} className="gap-4 shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <Badge variant="outline">{detail.label}</Badge>
                </div>
                <CardTitle className="mt-3">{account.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Saldo saat ini
                  </p>
                  <p
                    className={`mt-1 text-xl font-semibold ${account.balance < 0n ? "text-destructive" : ""}`}
                  >
                    {rupiah(account.balance)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-xs">
                  {account.lastReconciliation ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">
                        Terakhir dicocokkan{" "}
                        {displayDate.format(
                          account.lastReconciliation.reconciliationDate,
                        )}
                      </span>
                      <Badge
                        variant={
                          account.lastReconciliation.needsReview
                            ? "outline"
                            : "secondary"
                        }
                      >
                        {account.lastReconciliation.needsReview
                          ? "Periksa lagi"
                          : "Terverifikasi"}
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      Saldo belum pernah dicocokkan
                    </span>
                  )}
                </div>
                <Button asChild variant="secondary" className="w-full">
                  <Link
                    href={`/accounts?workspaceId=${encodeURIComponent(workspaceId)}&reconcileAccountId=${account.id}&reconcileDate=${todayValue}`}
                  >
                    <CalendarCheck2 />
                    {canReconcile ? "Cocokkan saldo" : "Lihat rekonsiliasi"}
                  </Link>
                </Button>
                {canManage && (
                  <details className="rounded-lg border p-3 text-sm">
                    <summary className="cursor-pointer font-medium">
                      Ubah nama
                    </summary>
                    <form
                      action={renameAccountAction}
                      className="mt-3 space-y-3"
                    >
                      <input
                        type="hidden"
                        name="workspaceId"
                        value={workspaceId}
                      />
                      <input type="hidden" name="id" value={account.id} />
                      <input
                        type="hidden"
                        name="version"
                        value={account.version}
                      />
                      <input
                        aria-label={`Nama baru untuk ${account.name}`}
                        name="name"
                        required
                        maxLength={100}
                        defaultValue={account.name}
                        className={inputClass}
                      />
                      <Button
                        type="submit"
                        variant="secondary"
                        className="w-full"
                      >
                        Simpan nama
                      </Button>
                    </form>
                  </details>
                )}
                {canManage && (
                  <form action={archiveAccountAction}>
                    <input
                      type="hidden"
                      name="workspaceId"
                      value={workspaceId}
                    />
                    <input type="hidden" name="id" value={account.id} />
                    <input
                      type="hidden"
                      name="version"
                      value={account.version}
                    />
                    <Button type="submit" variant="outline" className="w-full">
                      Arsipkan akun
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {active.length === 0 && (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <Wallet className="mb-3 size-7 text-primary" aria-hidden="true" />
            <p className="font-medium">Belum ada akun aktif</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Tambahkan bank, e-wallet, atau tunai untuk mulai mencatat.
            </p>
          </CardContent>
        </Card>
      )}

      {archived.length > 0 && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Akun diarsipkan</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {archived.map((account) => (
                <li
                  key={account.id}
                  className="flex justify-between gap-4 py-3 text-sm"
                >
                  <span>{account.name}</span>
                  <span className="text-muted-foreground">
                    {rupiah(account.balance)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
