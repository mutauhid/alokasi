import Link from "next/link";
import { Download, Search } from "lucide-react";
import { getReportOverview, type ReportQuery } from "@/modules/reports/service";
import { budgetPercent, budgetStatus } from "@/modules/finance/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionCategoryIcon } from "@/components/transaction-category-icon";
import {
  SensitiveAmount,
  SensitiveChartBar,
} from "@/components/amount-privacy";

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

function buildCashFlowBuckets(
  transactions: Array<{
    type: "income" | "expense" | "transfer";
    amount: bigint;
    transactionDate: Date;
  }>,
  from: Date,
  toExclusive: Date,
) {
  const day = 86_400_000;
  const days = Math.max(
    1,
    Math.ceil((toExclusive.valueOf() - from.valueOf()) / day),
  );
  const bucketCount = Math.min(4, Math.max(1, Math.ceil(days / 7)));
  const range = toExclusive.valueOf() - from.valueOf();
  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = new Date(
      from.valueOf() + Math.floor((range * index) / bucketCount),
    );
    const endExclusive = new Date(
      from.valueOf() + Math.floor((range * (index + 1)) / bucketCount),
    );
    return {
      income: 0n,
      expense: 0n,
      start,
      endExclusive,
      label: `${formatter.format(start)}–${formatter.format(new Date(endExclusive.valueOf() - day))}`,
    };
  });
  for (const transaction of transactions) {
    const offset = transaction.transactionDate.valueOf() - from.valueOf();
    const index = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor((offset * bucketCount) / Math.max(1, range))),
    );
    if (transaction.type === "income")
      buckets[index].income += transaction.amount;
    if (transaction.type === "expense")
      buckets[index].expense += transaction.amount;
  }
  return buckets;
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
  const cashFlowBuckets = buildCashFlowBuckets(
    report.transactions,
    report.filters.from,
    report.filters.toExclusive,
  );
  const cashFlowMaximum = cashFlowBuckets.reduce((maximum, bucket) => {
    const bucketMaximum =
      bucket.income > bucket.expense ? bucket.income : bucket.expense;
    return bucketMaximum > maximum ? bucketMaximum : maximum;
  }, 0n);
  const chartHeight = (value: bigint) =>
    value > 0n && cashFlowMaximum > 0n
      ? Math.max(4, Number((value * 128n) / cashFlowMaximum))
      : 0;
  const categoryMaximum = report.categoryTotals[0]?.amount ?? 0n;

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
                <SensitiveAmount>{rupiah(value)}</SensitiveAmount>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Arus kas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Perbandingan pemasukan dan pengeluaran pada rentang filter.
            </p>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-primary" /> Pemasukan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-amber-600" /> Pengeluaran
              </span>
            </div>
            <div
              className="grid h-48 items-end gap-3 border-b bg-[repeating-linear-gradient(to_top,transparent_0,transparent_47px,var(--border)_48px,transparent_49px)]"
              style={{
                gridTemplateColumns: `repeat(${cashFlowBuckets.length}, minmax(0, 1fr))`,
              }}
              role="img"
              aria-label="Grafik arus kas sesuai rentang laporan"
            >
              {cashFlowBuckets.map((bucket, index) => (
                <div
                  key={bucket.start.toISOString()}
                  className="flex h-full min-w-0 flex-col justify-end"
                >
                  <div className="flex h-32 items-end justify-center gap-1.5 sm:gap-2">
                    <SensitiveChartBar
                      className="dashboard-chart-bar w-4 rounded-t bg-primary sm:w-6"
                      style={{
                        height: `${chartHeight(bucket.income)}px`,
                        animationDelay: `${index * 70}ms`,
                      }}
                      label="Pemasukan"
                      value={rupiah(bucket.income)}
                    />
                    <SensitiveChartBar
                      className="dashboard-chart-bar w-4 rounded-t bg-amber-600 sm:w-6"
                      style={{
                        height: `${chartHeight(bucket.expense)}px`,
                        animationDelay: `${index * 70 + 45}ms`,
                      }}
                      label="Pengeluaran"
                      value={rupiah(bucket.expense)}
                    />
                  </div>
                  <p className="mt-2 truncate text-center text-[10px] text-muted-foreground sm:text-xs">
                    {bucket.label}
                  </p>
                  <span className="sr-only">
                    {bucket.label}: pemasukan{" "}
                    <SensitiveAmount>{rupiah(bucket.income)}</SensitiveAmount>,
                    pengeluaran{" "}
                    <SensitiveAmount>{rupiah(bucket.expense)}</SensitiveAmount>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
              <ul className="space-y-4">
                {report.categoryTotals.slice(0, 6).map((category, index) => (
                  <li key={category.name} className="space-y-2">
                    <div className="flex justify-between gap-3 text-sm">
                      <span>{category.name}</span>
                      <span className="font-medium">
                        <SensitiveAmount>
                          {rupiah(category.amount)}
                        </SensitiveAmount>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="dashboard-progress-fill h-full rounded-full bg-primary"
                        style={{
                          width:
                            categoryMaximum > 0n
                              ? `${Number((category.amount * 100n) / categoryMaximum)}%`
                              : "0%",
                          animationDelay: `${120 + index * 65}ms`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none xl:col-span-2">
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
                          <SensitiveAmount>
                            {rupiah(item.actual)}
                          </SensitiveAmount>{" "}
                          dari{" "}
                          <SensitiveAmount>
                            {rupiah(item.limitAmount)}
                          </SensitiveAmount>{" "}
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
                      <SensitiveAmount>
                        {rupiah(transaction.amount)}
                      </SensitiveAmount>
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
