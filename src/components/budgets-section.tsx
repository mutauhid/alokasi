import { ChartPie, Plus } from "lucide-react";
import {
  copyBudgetsAction,
  createBudgetAction,
  updateBudgetAction,
} from "@/app/(workspace)/actions";
import { getBudgetOverview } from "@/modules/budgets/service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteBudgetButton } from "@/components/delete-budget-button";
import { budgetPercent, budgetStatus } from "@/modules/finance/domain";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-xs";

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
  const status = error ?? success;
  return (
    <div className="space-y-5">
      {status && messages[status] && (
        <p
          role={error ? "alert" : "status"}
          className={
            error
              ? "rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              : "rounded-lg bg-secondary p-3 text-sm"
          }
        >
          {messages[status]}
        </p>
      )}
      {!overview.isActivePeriod && (
        <p className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
          Mode riwayat bersifat baca saja. Realisasi dan limit di bawah memakai
          batas periode yang dipilih; ubah kembali ke periode aktif untuk
          mengelola budget.
        </p>
      )}
      {!canManage && overview.isActivePeriod && (
        <p className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
          {role === "editor"
            ? "Editor dapat melihat realisasi budget dan menambahkan transaksi. Pembuatan atau perubahan budget dikelola oleh Owner ruang."
            : "Viewer dapat melihat realisasi budget. Pembuatan atau perubahan budget dikelola oleh Owner ruang."}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-none">
          <CardContent>
            <p className="text-xs text-muted-foreground">Total limit</p>
            <p className="mt-2 text-xl font-semibold">
              {rupiah(overview.totalLimit)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent>
            <p className="text-xs text-muted-foreground">Realisasi berbudget</p>
            <p className="mt-2 text-xl font-semibold">
              {rupiah(overview.budgetedActual)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent>
            <p className="text-xs text-muted-foreground">Belum dianggarkan</p>
            <p className="mt-2 text-xl font-semibold">
              {rupiah(overview.unbudgeted)}
            </p>
          </CardContent>
        </Card>
      </div>
      {canEdit && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Buat budget</CardTitle>
            <p className="text-sm text-muted-foreground">
              Periode{" "}
              {periodLabel(
                overview.period.startDate,
                overview.period.endDateExclusive,
              )}
            </p>
          </CardHeader>
          <CardContent>
            {overview.availableCategories.length === 0 ? (
              <p className="rounded-lg bg-muted p-4 text-sm">
                Semua kategori pengeluaran aktif sudah memiliki budget.
              </p>
            ) : (
              <form
                action={createBudgetAction}
                className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
              >
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <label className="text-sm font-medium">
                  Kategori
                  <select name="categoryId" required className={inputClass}>
                    <option value="">Pilih kategori</option>
                    {overview.availableCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Limit rupiah
                  <input
                    name="limitAmount"
                    type="number"
                    min="1"
                    step="1"
                    required
                    className={inputClass}
                  />
                </label>
                <div className="flex items-end">
                  <Button type="submit" className="min-h-11 w-full">
                    <Plus /> Buat budget
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
      {canEdit && overview.previousPeriod && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Salin budget periode sebelumnya</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pratinjau dari{" "}
              {periodLabel(
                overview.previousPeriod.startDate,
                overview.previousPeriod.endDateExclusive,
              )}
              . Budget yang sudah ada tidak akan ditimpa.
            </p>
          </CardHeader>
          <CardContent>
            {overview.copyItems.length === 0 ? (
              <p className="rounded-lg bg-muted p-4 text-sm">
                Periode sebelumnya belum memiliki budget untuk disalin.
              </p>
            ) : (
              <form action={copyBudgetsAction} className="space-y-4">
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <input
                  type="hidden"
                  name="sourcePeriodId"
                  value={overview.previousPeriod.id}
                />
                <input
                  type="hidden"
                  name="targetPeriodId"
                  value={overview.period.id}
                />
                <ul className="divide-y rounded-xl border px-4">
                  {overview.copyItems.map((item) => (
                    <li
                      key={item.categoryId}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <label className="flex min-w-0 items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          name="categoryIds"
                          value={item.categoryId}
                          defaultChecked={item.eligible}
                          disabled={!item.eligible}
                          className="size-4 accent-primary"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {item.categoryName}
                          </span>
                          {item.reason && (
                            <span className="block text-xs text-muted-foreground">
                              {item.reason}
                            </span>
                          )}
                        </span>
                      </label>
                      <span className="shrink-0 text-sm font-medium">
                        {rupiah(item.limitAmount)}
                      </span>
                    </li>
                  ))}
                </ul>
                {overview.copyItems.some((item) => item.eligible) ? (
                  <Button type="submit">Salin kategori terpilih</Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Semua budget periode sebelumnya sudah ada atau kategorinya
                    telah diarsipkan.
                  </p>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      )}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Budget per kategori</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sisa budget adalah sisa alokasi dan boleh bernilai negatif.
          </p>
        </CardHeader>
        <CardContent>
          {overview.items.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <ChartPie
                className="mb-3 size-7 text-primary"
                aria-hidden="true"
              />
              <p className="font-medium">Belum ada budget</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Buat budget kategori pertama untuk mulai memantau realisasi.
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {overview.items.map((item) => {
                const percent = budgetPercent(item.actual, item.limitAmount);
                const width = Number(percent > 100n ? 100n : percent);
                const remaining = item.limitAmount - item.actual;
                return (
                  <li key={item.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.category.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {rupiah(item.actual)} dari {rupiah(item.limitAmount)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          percent >= 100n
                            ? "destructive"
                            : percent >= 80n
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {budgetStatus(item.actual, item.limitAmount)}
                      </Badge>
                    </div>
                    <div
                      className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
                      aria-label={`Realisasi ${percent.toString()} persen`}
                    >
                      <div
                        className={`h-full rounded-full ${percent >= 100n ? "bg-destructive" : "bg-primary"}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <div className="mt-3 flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {percent.toString()}%
                      </span>
                      <span
                        className={remaining < 0n ? "text-destructive" : ""}
                      >
                        {remaining < 0n
                          ? `Lebih ${rupiah(-remaining)}`
                          : `Sisa ${rupiah(remaining)}`}
                      </span>
                    </div>
                    {canEdit && (
                      <details className="mt-4 rounded-lg border p-3 text-sm">
                        <summary className="cursor-pointer font-medium">
                          Ubah budget
                        </summary>
                        <div className="mt-3 space-y-3">
                          <form
                            action={updateBudgetAction}
                            className="space-y-3"
                          >
                            <input
                              type="hidden"
                              name="workspaceId"
                              value={workspaceId}
                            />
                            <input type="hidden" name="id" value={item.id} />
                            <input
                              type="hidden"
                              name="version"
                              value={item.version}
                            />
                            <input
                              aria-label={`Limit baru ${item.category.name}`}
                              name="limitAmount"
                              type="number"
                              min="1"
                              step="1"
                              required
                              defaultValue={item.limitAmount.toString()}
                              className={inputClass}
                            />
                            <Button
                              type="submit"
                              variant="secondary"
                              className="w-full"
                            >
                              Simpan limit
                            </Button>
                          </form>
                          <DeleteBudgetButton
                            workspaceId={workspaceId}
                            id={item.id}
                            version={item.version}
                          />
                        </div>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
