import type { CSSProperties } from "react";
import {
  ChartPie,
  Copy,
  Info,
  MoreHorizontal,
  PiggyBank,
  ReceiptText,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { updateBudgetAction } from "@/app/(workspace)/actions";
import { SensitiveAmount } from "@/components/amount-privacy";
import { CopyBudgetsSheet } from "@/components/copy-budgets-sheet";
import { CreateBudgetDialog } from "@/components/create-budget-dialog";
import { DeleteBudgetButton } from "@/components/delete-budget-button";
import { TransactionActions } from "@/components/transaction-actions";
import { TransactionCategoryIcon } from "@/components/transaction-category-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { PeriodSelect } from "@/components/period-select";
import { budgetPercent, budgetStatus } from "@/modules/finance/domain";
import { getBudgetOverview } from "@/modules/budgets/service";

const inputClass =
  "min-h-12 w-full rounded-xl border bg-background px-3 text-sm shadow-xs";

const messages: Record<string, string> = {
  "budget-invalid": "Pilih kategori dan masukkan limit rupiah lebih dari nol.",
  "budget-category":
    "Kategori pengeluaran tidak tersedia atau sudah diarsipkan.",
  "budget-duplicate":
    "Kategori tersebut sudah memiliki budget pada periode ini.",
  "budget-conflict": "Budget sudah berubah. Muat ulang lalu coba kembali.",
  "budget-period": "Periode budget belum dapat disiapkan.",
  "budget-failed": "Perubahan budget belum dapat disimpan.",
  "budget-created": "Budget berhasil dibuat.",
  "budget-updated": "Budget berhasil diperbarui.",
  "budget-deleted": "Budget dihapus; transaksi tetap tersimpan.",
  "budget-copy-invalid": "Pilih minimal satu kategori yang dapat disalin.",
  "budget-copy-source": "Periode sumber tidak lagi tersedia untuk disalin.",
  "budget-copy-target": "Periode aktif sudah berubah. Muat ulang halaman.",
  "budget-copy-conflict":
    "Salah satu kategori sudah memiliki budget. Muat ulang pratinjau.",
  "budget-copied": "Budget terpilih berhasil disalin ke periode aktif.",
};

export function rupiah(value: bigint) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function periodLabel(start: Date, endExclusive: Date) {
  const end = new Date(endExclusive.valueOf() - 86_400_000);
  const format = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${format.format(start)}–${format.format(end)}`;
}

function statusClass(status: ReturnType<typeof budgetStatus>) {
  if (status === "Terlampaui" || status === "Habis") {
    return "border-destructive/25 bg-destructive/10 text-destructive";
  }
  if (status === "Hampir habis") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-primary/20 bg-primary/10 text-primary";
}

function CopyButton({
  enabled,
  workspaceId,
  sourcePeriodId,
  targetPeriodId,
  sourcePeriod,
  items,
}: {
  enabled: boolean;
  workspaceId: string;
  sourcePeriodId?: string;
  targetPeriodId: string;
  sourcePeriod?: string;
  items: Array<{
    categoryId: string;
    categoryName: string;
    limitAmount: bigint;
    eligible: boolean;
    reason: string | null;
  }>;
}) {
  if (!enabled || !sourcePeriodId || !sourcePeriod) {
    return (
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full rounded-xl sm:w-auto"
        disabled
        title="Belum ada periode sebelumnya yang dapat disalin"
      >
        <Copy className="size-4" aria-hidden="true" />
        Salin periode
      </Button>
    );
  }
  return (
    <CopyBudgetsSheet
      workspaceId={workspaceId}
      sourcePeriodId={sourcePeriodId}
      targetPeriodId={targetPeriodId}
      sourcePeriod={sourcePeriod}
      items={items.map((item) => ({
        ...item,
        limitAmount: item.limitAmount.toString(),
      }))}
    />
  );
}

export async function BudgetsSection({
  workspaceId,
  canManage,
  role,
  today,
  periodId,
  error,
  success,
}: {
  workspaceId: string;
  canManage: boolean;
  role: "owner" | "editor" | "viewer";
  today: Date;
  periodId: string;
  error?: string;
  success?: string;
}) {
  const overview = await getBudgetOverview(workspaceId, today, periodId, {
    includeCopyPreview: true,
  });
  const canEdit = canManage && overview.isActivePeriod;
  const statusMessage = error ?? success;
  const selectedPeriod = periodLabel(
    overview.period.startDate,
    overview.period.endDateExclusive,
  );
  const previousPeriod = overview.previousPeriod
    ? periodLabel(
        overview.previousPeriod.startDate,
        overview.previousPeriod.endDateExclusive,
      )
    : undefined;
  const totalPercent = budgetPercent(
    overview.budgetedActual,
    overview.totalLimit,
  );
  const totalVisualPercent = Number(totalPercent > 100n ? 100n : totalPercent);
  const totalStatus = budgetStatus(
    overview.budgetedActual,
    overview.totalLimit,
  );
  const copyProps = {
    enabled: Boolean(overview.previousPeriod),
    workspaceId,
    sourcePeriodId: overview.previousPeriod?.id,
    targetPeriodId: overview.period.id,
    sourcePeriod: previousPeriod,
    items: overview.copyItems,
  };

  return (
    <div className="budget-v2 space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-[27px] font-semibold leading-tight tracking-[-0.8px]">
            Budget
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pantau dan kelola anggaranmu dengan lebih jelas.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <form action="/budgets" method="get" className="flex gap-2">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <div className="min-w-0 flex-1 sm:min-w-64">
              <PeriodSelect
                name="periodId"
                defaultValue={overview.period.id}
                ariaLabel="Periode budget yang ditampilkan"
                options={overview.periods.map((period) => ({
                  value: period.id,
                  label: `${periodLabel(period.startDate, period.endDateExclusive)}${period.id === overview.activePeriod.id ? " · aktif" : ""}${period.isTransition ? " · transisi" : ""}`,
                }))}
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              className="min-h-11 rounded-xl"
            >
              Tampilkan
            </Button>
          </form>
          {canEdit && <CopyButton {...copyProps} />}
          {canEdit && (
            <CreateBudgetDialog
              workspaceId={workspaceId}
              period={selectedPeriod}
              categories={overview.availableCategories}
            />
          )}
        </div>
      </header>

      {statusMessage && messages[statusMessage] && (
        <p
          role={error ? "alert" : "status"}
          className={
            error
              ? "rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
              : "rounded-xl border border-primary/20 bg-primary/8 p-3 text-sm"
          }
        >
          {messages[statusMessage]}
        </p>
      )}
      {!overview.isActivePeriod && (
        <p className="rounded-xl border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
          Mode riwayat bersifat baca saja. Realisasi dan limit mengikuti periode
          yang dipilih; kembali ke periode aktif untuk mengelola budget.
        </p>
      )}
      {!canManage && overview.isActivePeriod && (
        <p className="rounded-xl border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
          {role === "editor"
            ? "Editor dapat melihat realisasi budget dan menambahkan transaksi. Pembuatan atau perubahan budget dikelola oleh Owner ruang."
            : "Viewer dapat melihat realisasi budget. Pembuatan atau perubahan budget dikelola oleh Owner ruang."}
        </p>
      )}

      <section
        aria-label="Ringkasan budget"
        className="grid gap-3 md:grid-cols-3"
      >
        <article className="budget-v2-card budget-v2-kpi budget-v2-kpi-featured relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="min-h-10 text-sm font-medium text-muted-foreground">
                Total limit
              </p>
              <p className="mt-3 break-words text-2xl font-semibold tracking-[-0.04em] sm:text-[1.8rem]">
                <SensitiveAmount>{rupiah(overview.totalLimit)}</SensitiveAmount>
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {selectedPeriod}
              </p>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
              <WalletCards className="size-5" aria-hidden="true" />
            </span>
          </div>
        </article>
        <article className="budget-v2-card budget-v2-kpi rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="min-h-10 text-sm font-medium text-muted-foreground">
                Realisasi berbudget
              </p>
              <p className="mt-3 break-words text-2xl font-semibold tracking-[-0.04em] sm:text-[1.8rem]">
                <SensitiveAmount>
                  {rupiah(overview.budgetedActual)}
                </SensitiveAmount>
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {totalPercent.toString()}% dari total limit
              </p>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
              <ChartPie className="size-5" aria-hidden="true" />
            </span>
          </div>
        </article>
        <article className="budget-v2-card budget-v2-kpi rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="min-h-10 text-sm font-medium text-muted-foreground">
                Belum dianggarkan
              </p>
              <p className="mt-3 break-words text-2xl font-semibold tracking-[-0.04em] sm:text-[1.8rem]">
                <SensitiveAmount>{rupiah(overview.unbudgeted)}</SensitiveAmount>
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Pengeluaran di luar kategori berbudget
              </p>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-muted/55 text-muted-foreground">
              <ReceiptText className="size-5" aria-hidden="true" />
            </span>
          </div>
        </article>
      </section>

      <section className="budget-v2-card grid gap-6 rounded-3xl border bg-card p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,.65fr)] lg:p-7">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em]">
                Ringkasan penggunaan budget
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Perbandingan limit dan realisasi pada periode terpilih.
              </p>
            </div>
            {overview.totalLimit > 0n && (
              <Badge
                className={`border ${statusClass(totalStatus)}`}
                title={`Status penggunaan budget: ${totalStatus}`}
              >
                Status: {totalStatus}
              </Badge>
            )}
          </div>
          <div className="mt-6 grid items-center gap-6 sm:grid-cols-[11rem_minmax(0,1fr)]">
            <div
              className="budget-v2-summary-ring mx-auto flex size-40 items-center justify-center rounded-full"
              style={
                {
                  "--budget-v2-progress": `${totalVisualPercent}%`,
                  "--budget-v2-ring-color":
                    totalPercent >= 100n
                      ? "var(--destructive)"
                      : "var(--primary)",
                } as CSSProperties
              }
              role="img"
              aria-label={`Realisasi budget ${totalPercent.toString()} persen`}
            >
              <div className="flex size-[7.25rem] flex-col items-center justify-center rounded-full border bg-card text-center shadow-sm">
                <strong className="text-2xl tracking-[-0.04em]">
                  {totalPercent.toString()}%
                </strong>
                <span className="mt-1 text-[11px] text-muted-foreground">
                  terpakai
                </span>
              </div>
            </div>
            <dl className="divide-y rounded-2xl border px-4">
              <div className="flex items-center justify-between gap-4 py-3.5">
                <dt className="text-sm text-muted-foreground">Realisasi</dt>
                <dd className="text-right text-sm font-semibold">
                  <SensitiveAmount>
                    {rupiah(overview.budgetedActual)}
                  </SensitiveAmount>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3.5">
                <dt className="text-sm text-muted-foreground">
                  {overview.remaining < 0n ? "Melebihi limit" : "Sisa budget"}
                </dt>
                <dd
                  className={`text-right text-sm font-semibold ${overview.remaining < 0n ? "text-destructive" : "text-primary"}`}
                >
                  <SensitiveAmount>
                    {rupiah(
                      overview.remaining < 0n
                        ? -overview.remaining
                        : overview.remaining,
                    )}
                  </SensitiveAmount>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3.5">
                <dt className="text-sm text-muted-foreground">
                  Belum dianggarkan
                </dt>
                <dd className="text-right text-sm font-semibold">
                  <SensitiveAmount>
                    {rupiah(overview.unbudgeted)}
                  </SensitiveAmount>
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <aside className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/7 p-4 sm:p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Info className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">
              Tentang pengeluaran tanpa budget
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Nilai belum dianggarkan adalah pengeluaran pada kategori yang
              tidak memiliki limit di periode ini. Nilai tersebut bukan saldo
              yang bebas digunakan.
            </p>
          </div>
        </aside>
      </section>

      <section aria-labelledby="budget-category-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="budget-category-heading" className="text-lg font-semibold">
              Budget per kategori
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sisa budget adalah sisa alokasi dan dapat bernilai negatif.
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {overview.items.length} kategori
          </span>
        </div>
        {overview.items.length === 0 ? (
          <div className="budget-v2-card flex flex-col items-center rounded-3xl border bg-card px-5 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PiggyBank className="size-7" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-semibold">Belum ada budget</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Buat budget kategori pertama untuk mulai memantau realisasi
              pengeluaran pada periode ini.
            </p>
            {canEdit && (
              <div className="mt-5">
                <CreateBudgetDialog
                  workspaceId={workspaceId}
                  period={selectedPeriod}
                  categories={overview.availableCategories}
                />
              </div>
            )}
          </div>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {overview.items.map((item) => {
              const percent = budgetPercent(item.actual, item.limitAmount);
              const visualPercent = Number(percent > 100n ? 100n : percent);
              const remaining = item.limitAmount - item.actual;
              const itemStatus = budgetStatus(item.actual, item.limitAmount);
              const trigger = (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-xl"
                  aria-label={`Kelola budget ${item.category.name}`}
                >
                  <MoreHorizontal className="size-5" aria-hidden="true" />
                </Button>
              );
              const editContent = (
                <form
                  key={`edit-${item.id}`}
                  action={updateBudgetAction}
                  className="space-y-4 rounded-2xl border p-4"
                >
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="version" value={item.version} />
                  <label className="block text-sm font-semibold">
                    Limit baru
                    <RupiahInput
                      name="limitAmount"
                      required
                      defaultValue={item.limitAmount.toString()}
                      className={`${inputClass} mt-2`}
                    />
                  </label>
                  <Button type="submit" className="min-h-11 w-full rounded-xl">
                    Simpan perubahan
                  </Button>
                </form>
              );
              const deleteAction = (
                <DeleteBudgetButton
                  key={`delete-${item.id}`}
                  workspaceId={workspaceId}
                  id={item.id}
                  version={item.version}
                  iconOnly
                />
              );
              return (
                <li
                  key={item.id}
                  className="budget-v2-card rounded-3xl border bg-card p-5"
                >
                  <div className="flex items-start gap-3">
                    <TransactionCategoryIcon
                      categoryName={item.category.name}
                      type="expense"
                      className="size-12 rounded-2xl"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold">
                            {item.category.name}
                          </h3>
                          <Badge
                            className={`mt-1.5 border ${statusClass(itemStatus)}`}
                            title={`Status budget ${item.category.name}: ${itemStatus}`}
                          >
                            {itemStatus}
                          </Badge>
                        </div>
                        {canEdit && (
                          <TransactionActions
                            title={item.category.name}
                            heading="Detail budget"
                            trigger={trigger}
                            triggerLabel={`Kelola budget ${item.category.name}`}
                            editContent={editContent}
                            editHeading="Ubah budget"
                            editLabel={`Ubah budget ${item.category.name}`}
                            deleteAction={deleteAction}
                            presentation="drawer"
                          >
                            <dl className="grid gap-4 rounded-2xl border p-4 sm:grid-cols-2">
                              <div>
                                <dt className="text-xs text-muted-foreground">
                                  Limit
                                </dt>
                                <dd className="mt-1 font-semibold">
                                  <SensitiveAmount>
                                    {rupiah(item.limitAmount)}
                                  </SensitiveAmount>
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs text-muted-foreground">
                                  Realisasi
                                </dt>
                                <dd className="mt-1 font-semibold">
                                  <SensitiveAmount>
                                    {rupiah(item.actual)}
                                  </SensitiveAmount>
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs text-muted-foreground">
                                  Persentase
                                </dt>
                                <dd className="mt-1 font-semibold">
                                  {percent.toString()}%
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs text-muted-foreground">
                                  Status
                                </dt>
                                <dd className="mt-1 font-semibold">
                                  {itemStatus}
                                </dd>
                              </div>
                            </dl>
                          </TransactionActions>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-lg font-semibold tracking-[-0.02em]">
                      <SensitiveAmount>{rupiah(item.actual)}</SensitiveAmount>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      dari{" "}
                      <SensitiveAmount>
                        {rupiah(item.limitAmount)}
                      </SensitiveAmount>
                    </p>
                  </div>
                  <div
                    className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label={`Realisasi budget ${item.category.name}`}
                    aria-valuenow={visualPercent}
                    aria-valuemin={0}
                    aria-valuetext={`${percent.toString()} persen`}
                  >
                    <div
                      className={`h-full rounded-full transition-[width] ${percent >= 100n ? "bg-destructive" : percent >= 80n ? "bg-amber-500" : "bg-primary"}`}
                      style={{ width: `${visualPercent}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold">{percent.toString()}%</span>
                    <span
                      className={
                        remaining < 0n
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      {remaining < 0n ? "Lebih " : "Sisa "}
                      <SensitiveAmount>
                        {rupiah(remaining < 0n ? -remaining : remaining)}
                      </SensitiveAmount>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {canEdit && overview.previousPeriod && (
        <section className="budget-v2-card flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold">
                Gunakan rencana periode sebelumnya
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Salin kategori pilihan dari {previousPeriod} tanpa menimpa
                budget yang sudah dibuat.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <CopyButton {...copyProps} />
          </div>
        </section>
      )}
    </div>
  );
}
