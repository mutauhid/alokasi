import { randomUUID } from "node:crypto";
import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  Banknote,
  CalendarCheck2,
  CheckCircle2,
  CreditCard,
  Landmark,
  Wallet,
  WalletCards,
} from "lucide-react";
import { listAccounts } from "@/modules/accounts/service";
import { getAccountReconciliationOverview } from "@/modules/reconciliations/service";
import {
  CreateAccountDialog,
  ManageAccountSheet,
  type AccountKind,
} from "@/components/account-v2-panels";
import { ReconciliationSheet } from "@/components/reconciliation-sheet";
import { SensitiveAmount } from "@/components/amount-privacy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  const totalBalance = active.reduce(
    (total, account) => total + account.balance,
    0n,
  );
  const neverReconciled = active.filter(
    (account) => !account.lastReconciliation,
  ).length;
  const displayDate = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="accounts-v2 space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[25px] font-semibold leading-tight tracking-[-.8px] sm:text-[27px]">
            Akun
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Kelola seluruh sumber dana dalam satu pandangan.
          </p>
        </div>
        {canManage && (
          <CreateAccountDialog workspaceId={workspaceId} today={todayValue} />
        )}
      </header>

      {status && messages[status] && (
        <p
          role={error ? "alert" : "status"}
          className={cn(
            "rounded-xl border p-3 text-sm",
            error
              ? "border-destructive/25 bg-destructive/10 text-destructive"
              : "border-primary/20 bg-primary/[0.07]",
          )}
        >
          {messages[status]}
        </p>
      )}

      {active.length > 0 ? (
        <section
          aria-label="Ringkasan akun"
          className="grid grid-cols-2 gap-3 lg:grid-cols-3"
        >
          <Card className="accounts-v2-card accounts-v2-kpi-featured col-span-2 gap-0 overflow-hidden rounded-2xl py-0 lg:col-span-1">
            <CardContent className="min-h-[7.5rem] p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <WalletCards className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Total saldo akun aktif
                  </p>
                  <SensitiveAmount
                    className={cn(
                      "accounts-v2-balance mt-2 block text-2xl font-semibold tracking-[-0.04em] sm:text-[1.7rem]",
                      totalBalance < 0n && "text-destructive",
                    )}
                  >
                    {rupiah(totalBalance)}
                  </SensitiveAmount>
                </div>
              </div>
            </CardContent>
          </Card>
          <SummaryCard
            label="Akun aktif"
            value={`${active.length} akun`}
            icon={Landmark}
          />
          <SummaryCard
            label="Belum dicocokkan"
            value={`${neverReconciled} akun`}
            icon={AlertTriangle}
            warning={neverReconciled > 0}
          />
        </section>
      ) : (
        <Card className="accounts-v2-card gap-0 rounded-2xl py-0 shadow-none">
          <CardContent className="flex flex-col items-center px-5 py-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Wallet className="size-7" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Belum ada akun aktif</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Tambahkan bank, e-wallet, atau tunai untuk mulai mencatat saldo
              dan transaksi.
            </p>
            {canManage && (
              <div className="mt-5 w-full max-w-xs">
                <CreateAccountDialog
                  workspaceId={workspaceId}
                  today={todayValue}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {active.length > 0 && (
        <section className="accounts-v2-card overflow-hidden rounded-2xl border bg-card shadow-none">
          <div className="border-b px-4 py-4 sm:px-5">
            <h2 className="font-semibold sm:text-lg">Daftar akun</h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Rekening, e-wallet, dan sumber dana lainnya yang kamu kelola.
            </p>
          </div>
          <ul className="divide-y px-3 sm:px-4">
            {active.map((account) => {
              const detail = typeDetails[account.type];
              const Icon = detail.icon;
              const latest = account.lastReconciliation;
              const reconciliationLabel = latest
                ? latest.needsReview
                  ? "Perlu diperiksa kembali"
                  : `Dicocokkan ${displayDate.format(latest.reconciliationDate)}`
                : "Belum pernah dicocokkan";
              const tone = latest
                ? latest.needsReview
                  ? "warning"
                  : "ok"
                : "neutral";
              return (
                <li
                  key={account.id}
                  className="relative grid min-w-0 gap-4 py-4 lg:grid-cols-[minmax(11rem,1.25fr)_minmax(10rem,.85fr)_minmax(12rem,1fr)_auto_auto] lg:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3 pr-14 lg:pr-0">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{account.name}</p>
                      <Badge variant="outline" className="mt-1.5">
                        {detail.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Saldo saat ini
                    </p>
                    <SensitiveAmount
                      className={cn(
                        "accounts-v2-balance mt-1 block break-words text-xl font-semibold tracking-[-0.03em]",
                        account.balance < 0n && "text-destructive",
                      )}
                    >
                      {rupiah(account.balance)}
                    </SensitiveAmount>
                  </div>
                  <div className="min-w-0 rounded-xl bg-muted/45 p-3 lg:bg-transparent lg:p-0">
                    <p
                      className={cn(
                        "flex items-center gap-2 text-xs font-medium",
                        tone === "warning" &&
                          "text-amber-700 dark:text-amber-300",
                        tone === "ok" && "text-primary",
                        tone === "neutral" && "text-muted-foreground",
                      )}
                    >
                      {tone === "ok" ? (
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      ) : (
                        <AlertTriangle
                          className="size-3.5"
                          aria-hidden="true"
                        />
                      )}
                      {reconciliationLabel}
                    </p>
                    {latest && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Terakhir dicocokkan pada{" "}
                        {displayDate.format(latest.reconciliationDate)}
                      </p>
                    )}
                  </div>
                  <Button
                    asChild
                    variant="secondary"
                    className="min-h-11 w-full rounded-xl lg:w-auto"
                  >
                    <Link
                      href={`/accounts?workspaceId=${encodeURIComponent(workspaceId)}&reconcileAccountId=${account.id}&reconcileDate=${todayValue}`}
                    >
                      <CalendarCheck2 className="size-4" aria-hidden="true" />
                      {canReconcile ? "Cocokkan saldo" : "Lihat rekonsiliasi"}
                    </Link>
                  </Button>
                  {canManage && (
                    <div className="absolute right-0 top-4 lg:static">
                      <ManageAccountSheet
                        workspaceId={workspaceId}
                        account={{
                          id: account.id,
                          name: account.name,
                          type: account.type as AccountKind,
                          balanceLabel: rupiah(account.balance),
                          balanceNegative: account.balance < 0n,
                          version: account.version,
                          reconciliationLabel,
                          reconciliationTone: tone,
                        }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {archived.length > 0 && (
        <details className="accounts-v2-card group rounded-2xl border bg-card shadow-none">
          <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Archive className="size-4.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                Akun diarsipkan
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {archived.length} akun · Histori tetap tersedia sebagai catatan.
              </span>
            </span>
            <span className="text-xs text-muted-foreground group-open:hidden">
              Tampilkan
            </span>
            <span className="hidden text-xs text-muted-foreground group-open:inline">
              Sembunyikan
            </span>
          </summary>
          <ul className="divide-y border-t px-4 sm:px-5">
            {archived.map((account) => (
              <li
                key={account.id}
                className="flex min-w-0 items-center justify-between gap-4 py-3 text-sm"
              >
                <span className="min-w-0 truncate">{account.name}</span>
                <SensitiveAmount className="shrink-0 text-muted-foreground">
                  {rupiah(account.balance)}
                </SensitiveAmount>
              </li>
            ))}
          </ul>
        </details>
      )}

      {reconciliation && (
        <ReconciliationSheet
          workspaceId={workspaceId}
          account={{
            id: reconciliation.account.id,
            name: reconciliation.account.name,
            type: (accounts.find(
              (account) => account.id === reconciliation.account.id,
            )?.type ?? "bank") as AccountKind,
            openingDate: reconciliation.account.openingDate
              .toISOString()
              .slice(0, 10),
            archived: Boolean(reconciliation.account.archivedAt),
          }}
          selectedDate={selectedDateValue}
          selectedDateLabel={displayDate.format(selectedDate)}
          today={todayValue}
          recordedBalance={reconciliation.recordedBalance?.toString() ?? null}
          recordedBalanceLabel={
            reconciliation.recordedBalance === null
              ? null
              : rupiah(reconciliation.recordedBalance)
          }
          canReconcile={canReconcile}
          idempotencyKey={randomUUID()}
          history={reconciliation.history.map((item) => ({
            id: item.id,
            dateLabel: displayDate.format(item.reconciliationDate),
            recordedBalanceLabel: rupiah(item.recordedBalance),
            actualBalanceLabel: rupiah(item.actualBalance),
            differenceLabel: rupiah(item.difference),
            differenceIsZero: item.difference === 0n,
            adjustmentLabel:
              item.adjustmentAmount === 0n
                ? null
                : rupiah(item.adjustmentAmount),
            note: item.note,
            creatorLabel:
              item.creator.user.displayName ??
              item.creator.user.email ??
              "Anggota",
            statusLabel: item.needsReview
              ? "Perlu diperiksa kembali"
              : item.resolution === "adjusted"
                ? "Disesuaikan"
                : "Cocok",
            needsReview: item.needsReview,
          }))}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  warning = false,
}: {
  label: string;
  value: string;
  icon: typeof Landmark;
  warning?: boolean;
}) {
  return (
    <Card className="accounts-v2-card gap-0 rounded-2xl py-0 shadow-none">
      <CardContent className="min-h-[7.5rem] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">
            {label}
          </p>
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-11",
              warning
                ? "bg-amber-500/12 text-amber-600 dark:text-amber-300"
                : "bg-primary/12 text-primary",
            )}
          >
            <Icon className="size-4.5 sm:size-5" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-2 text-lg font-semibold tracking-[-0.03em] sm:text-2xl">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
