import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChartNoAxesCombined,
  ChartPie,
  CalendarClock,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { budgetPercent, budgetStatus } from "@/modules/finance/domain";
import { getDashboardOverview } from "@/modules/dashboard/service";
import { sectionHref } from "@/lib/navigation";
import { calendarDayDifference } from "@/modules/recurring/domain";

function rupiah(value: bigint) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function transactionLabel(transaction: { title: string }) {
  return transaction.title;
}

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function reportHref(
  workspaceId: string,
  period: { startDate: Date; endDateExclusive: Date },
  filters: { type?: "income" | "expense"; categoryId?: string } = {},
) {
  const params = new URLSearchParams({
    workspaceId,
    from: dateValue(period.startDate),
    to: dateValue(new Date(period.endDateExclusive.valueOf() - 86_400_000)),
  });
  if (filters.type) params.set("type", filters.type);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  return `/reports?${params.toString()}`;
}

function shortPeriod(start: Date, endExclusive: Date) {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return `${formatter.format(start)}–${formatter.format(
    new Date(endExclusive.valueOf() - 86_400_000),
  )}`;
}

export async function Dashboard({
  workspaceId,
  today,
  periodId,
}: {
  workspaceId: string;
  today: Date;
  periodId: string;
}) {
  const data = await getDashboardOverview(workspaceId, today, periodId);
  const cashFlowMaximum =
    data.income > data.expense ? data.income : data.expense;
  const incomeWidth =
    cashFlowMaximum > 0n ? Number((data.income * 100n) / cashFlowMaximum) : 0;
  const expenseWidth =
    cashFlowMaximum > 0n ? Number((data.expense * 100n) / cashFlowMaximum) : 0;
  const totalBudgetPercent = budgetPercent(
    data.budget.budgetedActual,
    data.budget.totalLimit,
  );
  const trendMaximum = data.trend.reduce((maximum, item) => {
    const itemMaximum = item.income > item.expense ? item.income : item.expense;
    return itemMaximum > maximum ? itemMaximum : maximum;
  }, 0n);
  const trendHeight = (value: bigint) => {
    if (value <= 0n || trendMaximum <= 0n) return 0;
    const percent = Math.max(4, Number((value * 100n) / trendMaximum));
    return Math.round((percent * 128) / 100);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          {
            title: "Total saldo saat ini",
            value: data.totalBalance,
            note: `${data.accounts.length} akun aktif`,
            icon: Wallet,
            featured: true,
            href: null,
          },
          {
            title: "Pemasukan periode",
            value: data.income,
            note: "Tidak termasuk saldo awal",
            icon: ArrowDownLeft,
            href: reportHref(workspaceId, data.period, { type: "income" }),
          },
          {
            title: "Pengeluaran periode",
            value: data.expense,
            note: "Transfer internal tidak dihitung",
            icon: ArrowUpRight,
            href: reportHref(workspaceId, data.period, { type: "expense" }),
          },
        ].map(({ title, value, note, icon: Icon, featured, href }) => (
          <Card
            key={title}
            className={
              featured
                ? "gap-0 border-primary bg-primary py-5 text-primary-foreground shadow-none"
                : "gap-0 py-5 shadow-none"
            }
          >
            <CardContent className="px-5">
              <div className="flex items-center justify-between gap-2 text-xs font-medium">
                <span>{title}</span>
                <Icon className="size-[17px] opacity-75" aria-hidden="true" />
              </div>
              <p className="my-3 text-[28px] font-semibold leading-none tracking-tight">
                {rupiah(value)}
              </p>
              <p
                className={
                  featured
                    ? "text-xs opacity-85"
                    : "text-xs text-muted-foreground"
                }
              >
                {note}
              </p>
              {href && (
                <Link
                  href={href}
                  className="mt-3 inline-flex text-xs font-medium text-primary hover:underline"
                >
                  Lihat transaksi →
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!data.isActivePeriod && (
        <p className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
          Kamu sedang melihat periode historis. Total saldo tetap menunjukkan
          saldo saat ini; kartu periode, grafik, budget, dan transaksi mengikuti
          periode yang dipilih.
        </p>
      )}

      {data.recurringReminders.length > 0 && (
        <Card className="gap-0 border-primary/30 bg-primary/5 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="size-4 text-primary" />
                Pengingat transaksi berulang
              </CardTitle>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Jatuh tempo atau akan jatuh tempo dalam tujuh hari. Saldo belum
                berubah.
              </p>
            </div>
            <Link
              className="text-xs font-medium text-primary hover:underline"
              href={sectionHref("transactions", workspaceId)}
            >
              Periksa →
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {data.recurringReminders.map((reminder) => {
                const difference = calendarDayDifference(
                  today,
                  reminder.nextDueDate,
                );
                return (
                  <li
                    key={reminder.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{reminder.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {difference < 0
                          ? `Terlambat ${Math.abs(difference)} hari`
                          : difference === 0
                            ? "Jatuh tempo hari ini"
                            : `Dalam ${difference} hari`}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${reminder.type === "expense" ? "text-destructive" : "text-primary"}`}
                    >
                      {reminder.type === "expense" ? "−" : "+"}
                      {rupiah(reminder.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="gap-0 shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Tren enam periode</CardTitle>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Pemasukan dan pengeluaran hingga periode yang dipilih
            </p>
          </div>
          <div className="flex gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-primary" /> Pemasukan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-destructive" /> Pengeluaran
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {data.trend.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada histori periode untuk ditampilkan.
            </p>
          ) : (
            <div
              className="grid h-52 items-end gap-2"
              style={{
                gridTemplateColumns: `repeat(${data.trend.length}, minmax(0, 1fr))`,
              }}
              aria-label="Grafik pemasukan dan pengeluaran per periode"
            >
              {data.trend.map((item) => (
                <div
                  key={item.id}
                  className="flex h-full min-w-0 flex-col justify-end"
                >
                  <div className="flex h-32 items-end justify-center gap-1 sm:gap-2">
                    <div
                      className="w-3 rounded-t bg-primary sm:w-5"
                      style={{ height: `${trendHeight(item.income)}px` }}
                      title={`Pemasukan ${rupiah(item.income)}`}
                    />
                    <div
                      className="w-3 rounded-t bg-destructive sm:w-5"
                      style={{ height: `${trendHeight(item.expense)}px` }}
                      title={`Pengeluaran ${rupiah(item.expense)}`}
                    />
                  </div>
                  <p className="mt-2 truncate text-center text-[10px] text-muted-foreground sm:text-xs">
                    {shortPeriod(item.startDate, item.endDateExclusive)}
                  </p>
                  <p className="mt-1 min-h-4 text-center text-[10px] font-medium text-primary">
                    {item.isActive
                      ? "Berjalan"
                      : item.isTransition
                        ? "Transisi"
                        : ""}
                  </p>
                  <span className="sr-only">
                    {shortPeriod(item.startDate, item.endDateExclusive)}:
                    pemasukan {rupiah(item.income)}, pengeluaran{" "}
                    {rupiah(item.expense)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card className="gap-0 shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Arus kas periode ini</CardTitle>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Perbandingan pemasukan dan pengeluaran pada batas periode yang
                sama
              </p>
            </div>
            <ChartNoAxesCombined
              className="size-[18px] text-muted-foreground"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Pemasukan</span>
                <span>{rupiah(data.income)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${incomeWidth}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Pengeluaran</span>
                <span>{rupiah(data.expense)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-destructive"
                  style={{ width: `${expenseWidth}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between border-t pt-4 text-sm">
              <span className="text-muted-foreground">Arus kas bersih</span>
              <span
                className={
                  data.netCashFlow < 0n
                    ? "font-medium text-destructive"
                    : "font-medium"
                }
              >
                {rupiah(data.netCashFlow)}
              </span>
            </div>
            {data.largestCategories.length > 0 && (
              <div className="border-t pt-4">
                <p className="mb-3 text-xs font-medium">Pengeluaran terbesar</p>
                <ul className="space-y-2 text-xs">
                  {data.largestCategories.map((category) => (
                    <li
                      key={category.id}
                      className="flex justify-between gap-3"
                    >
                      <Link
                        href={reportHref(workspaceId, data.period, {
                          type: "expense",
                          categoryId: category.id,
                        })}
                        className="text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {category.name}
                      </Link>
                      <span>{rupiah(category.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Budget periode ini</CardTitle>
            <Link
              className="text-xs font-medium text-primary hover:underline"
              href={`${sectionHref("budgets", workspaceId)}&periodId=${encodeURIComponent(data.period.id)}`}
            >
              Lihat budget →
            </Link>
          </CardHeader>
          <CardContent>
            {data.budget.items.length === 0 ? (
              <div className="py-9 text-center">
                <ChartPie
                  className="mx-auto mb-3 size-7 text-primary"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">Belum ada budget</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Buat limit per kategori untuk memantau realisasi.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-2xl font-semibold">
                      {totalBudgetPercent.toString()}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rupiah(data.budget.budgetedActual)} dari{" "}
                      {rupiah(data.budget.totalLimit)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      totalBudgetPercent >= 100n ? "destructive" : "outline"
                    }
                  >
                    {budgetStatus(
                      data.budget.budgetedActual,
                      data.budget.totalLimit,
                    )}
                  </Badge>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      totalBudgetPercent >= 100n
                        ? "h-full bg-destructive"
                        : "h-full bg-primary"
                    }
                    style={{
                      width: `${Number(totalBudgetPercent > 100n ? 100n : totalBudgetPercent)}%`,
                    }}
                  />
                </div>
                <div className="space-y-2 border-t pt-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sisa alokasi</span>
                    <span>{rupiah(data.budget.remaining)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Pengeluaran tanpa budget
                    </span>
                    <span>{rupiah(data.budget.unbudgeted)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card className="gap-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Transaksi terbaru</CardTitle>
            <Link
              className="text-xs font-medium text-primary hover:underline"
              href={reportHref(workspaceId, data.period)}
            >
              Lihat semua →
            </Link>
          </CardHeader>
          <CardContent>
            {data.latestTransactions.length === 0 ? (
              <div className="py-8 text-center">
                <ReceiptText className="mx-auto mb-3 size-7 text-primary" />
                <p className="text-sm font-medium">
                  Belum ada transaksi periode ini
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {data.latestTransactions.map((transaction) => (
                  <li
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {transactionLabel(transaction)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {transaction.note || transaction.account.name}
                      </p>
                    </div>
                    <span
                      className={
                        transaction.type === "expense"
                          ? "text-sm font-medium text-destructive"
                          : "text-sm font-medium"
                      }
                    >
                      {transaction.type === "expense"
                        ? "−"
                        : transaction.type === "income"
                          ? "+"
                          : ""}
                      {rupiah(transaction.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Akun keuangan</CardTitle>
            <Link
              className="text-xs font-medium text-primary hover:underline"
              href={sectionHref("accounts", workspaceId)}
            >
              Lihat akun →
            </Link>
          </CardHeader>
          <CardContent>
            {data.accounts.length === 0 ? (
              <div className="py-8 text-center">
                <Wallet className="mx-auto mb-3 size-7 text-primary" />
                <p className="text-sm font-medium">Belum ada akun aktif</p>
              </div>
            ) : (
              <ul className="divide-y">
                {data.accounts.map((account) => (
                  <li
                    key={account.id}
                    className="flex justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm text-muted-foreground">
                      {account.name}
                    </span>
                    <span className="text-sm font-medium">
                      {rupiah(account.balance)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
