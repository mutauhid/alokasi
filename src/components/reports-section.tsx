import Link from "next/link";
import { Download, Search } from "lucide-react";
import { getReportOverview, type ReportQuery } from "@/modules/reports/service";
import { budgetPercent, budgetStatus } from "@/modules/finance/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionCategoryIcon } from "@/components/transaction-category-icon";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-xs";

const typeDetails = {
  income: { label: "Pemasukan", sign: "+" },
  expense: { label: "Pengeluaran", sign: "−" },
  transfer: { label: "Transfer", sign: "" },
} as const;

function rupiah(value: bigint) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function displayDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function exportHref(filters: {
  workspaceId: string;
  fromValue: string;
  toValue: string;
  type: string | null;
  accountId: string | null;
  categoryId: string | null;
  query: string | null;
}) {
  const params = new URLSearchParams({
    workspaceId: filters.workspaceId,
    from: filters.fromValue,
    to: filters.toValue,
  });
  if (filters.type) params.set("type", filters.type);
  if (filters.accountId) params.set("accountId", filters.accountId);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.query) params.set("query", filters.query);
  return `/api/reports/transactions.csv?${params.toString()}`;
}

export async function ReportsSection({
  workspaceId,
  canExport,
  today,
  query,
}: {
  workspaceId: string;
  canExport: boolean;
  today: Date;
  query: ReportQuery;
}) {
  const report = await getReportOverview(workspaceId, today, query);

  return (
    <div className="space-y-5">
      {!report.valid && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          Filter tidak valid. Laporan dikembalikan ke periode aktif.
        </p>
      )}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Filter laporan</CardTitle>
          <p className="text-sm text-muted-foreground">
            Rentang bebas hanya memfilter laporan dan tidak mengubah periode
            atau limit budget.
          </p>
        </CardHeader>
        <CardContent>
          <form
            action="/reports"
            method="get"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-6"
          >
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <label className="text-sm font-medium">
              Dari
              <input
                className={inputClass}
                type="date"
                name="from"
                required
                defaultValue={report.filters.fromValue}
              />
            </label>
            <label className="text-sm font-medium">
              Sampai
              <input
                className={inputClass}
                type="date"
                name="to"
                required
                defaultValue={report.filters.toValue}
              />
            </label>
            <label className="text-sm font-medium">
              Jenis
              <select
                className={inputClass}
                name="type"
                defaultValue={report.filters.type ?? ""}
              >
                <option value="">Semua jenis</option>
                <option value="income">Pemasukan</option>
                <option value="expense">Pengeluaran</option>
                <option value="transfer">Transfer</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Akun
              <select
                className={inputClass}
                name="accountId"
                defaultValue={report.filters.accountId ?? ""}
              >
                <option value="">Semua akun</option>
                {report.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                    {account.archivedAt ? " (arsip)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Kategori
              <select
                className={inputClass}
                name="categoryId"
                defaultValue={report.filters.categoryId ?? ""}
              >
                <option value="">Semua kategori</option>
                {report.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ·{" "}
                    {category.type === "income" ? "Pemasukan" : "Pengeluaran"}
                    {category.archivedAt ? " (arsip)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Pencarian
              <span className="relative block">
                <Search
                  className="pointer-events-none absolute left-3 top-[18px] size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  className={`${inputClass} pl-9`}
                  type="search"
                  name="query"
                  maxLength={100}
                  placeholder="Judul, catatan, akun, kategori"
                  defaultValue={report.filters.query ?? ""}
                />
              </span>
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-6">
              <Button type="submit">Terapkan filter</Button>
              <Button asChild variant="outline">
                <Link
                  href={`/reports?workspaceId=${encodeURIComponent(workspaceId)}`}
                >
                  Reset
                </Link>
              </Button>
              {canExport && (
                <Button asChild variant="secondary">
                  <a
                    href={exportHref({ ...report.filters, workspaceId })}
                    download
                  >
                    <Download />
                    Ekspor CSV
                  </a>
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Pemasukan", value: report.income },
          { label: "Pengeluaran", value: report.expense },
          { label: "Arus kas bersih", value: report.netCashFlow },
          { label: "Transfer internal", value: report.transfer },
        ].map(({ label, value }) => (
          <Card key={label} className="shadow-none">
            <CardContent>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p
                className={`mt-2 text-xl font-semibold ${label === "Pengeluaran" || (label === "Arus kas bersih" && value < 0n) ? "text-destructive" : ""}`}
              >
                {rupiah(value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Pengeluaran per kategori</CardTitle>
            <p className="text-sm text-muted-foreground">
              Rincian mengikuti filter laporan.
            </p>
          </CardHeader>
          <CardContent>
            {report.categoryTotals.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Tidak ada pengeluaran pada filter ini.
              </p>
            ) : (
              <ul className="divide-y">
                {report.categoryTotals.map((category) => (
                  <li
                    key={category.name}
                    className="flex justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm text-muted-foreground">
                      {category.name}
                    </span>
                    <span className="text-sm font-medium">
                      {rupiah(category.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Budget versus aktual</CardTitle>
            <p className="text-sm text-muted-foreground">
              Hanya ditampilkan untuk periode aktif tanpa filter tambahan.
            </p>
          </CardHeader>
          <CardContent>
            {!report.isPeriodView ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Reset filter untuk melihat perbandingan budget periode aktif.
              </p>
            ) : report.budget.items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Belum ada budget pada periode ini.
              </p>
            ) : (
              <ul className="divide-y">
                {report.budget.items.map((item) => {
                  const percent = budgetPercent(item.actual, item.limitAmount);
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {item.category.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {rupiah(item.actual)} dari {rupiah(item.limitAmount)}{" "}
                          · {percent.toString()}%
                        </p>
                      </div>
                      <Badge
                        variant={percent >= 100n ? "destructive" : "outline"}
                      >
                        {budgetStatus(item.actual, item.limitAmount)}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Transaksi dalam laporan</CardTitle>
          <p className="text-sm text-muted-foreground">
            {report.transactions.length} transaksi cocok dengan filter.
          </p>
        </CardHeader>
        <CardContent>
          {report.transactions.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Tidak ada transaksi yang cocok.
            </p>
          ) : (
            <ul className="divide-y">
              {report.transactions.map((transaction) => {
                const detail = typeDetails[transaction.type];
                return (
                  <li
                    key={transaction.id}
                    className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto]"
                  >
                    <TransactionCategoryIcon
                      categoryName={transaction.category?.name ?? null}
                      type={transaction.type}
                      className="size-9 rounded-lg"
                    />
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium leading-snug">
                        {transaction.title}
                      </p>
                      <p className="mt-1 break-words text-xs text-muted-foreground">
                        {displayDate(transaction.transactionDate)} ·{" "}
                        {transaction.account.name}
                        {transaction.destinationAccount
                          ? ` → ${transaction.destinationAccount.name}`
                          : ""}
                        {transaction.category
                          ? ` · ${transaction.category.name}`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`col-start-2 justify-self-end whitespace-nowrap text-sm font-semibold sm:col-start-3 sm:row-start-1 ${transaction.type === "expense" ? "text-destructive" : transaction.type === "income" ? "text-primary" : ""}`}
                    >
                      {detail.sign}
                      {rupiah(transaction.amount)}
                    </span>
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
