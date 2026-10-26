import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  ChartPie,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { budgetPercent, budgetStatus } from "@/modules/finance/domain";
import { getDashboardOverview } from "@/modules/dashboard/service";
import { sectionHref } from "@/lib/navigation";
import { calendarDayDifference } from "@/modules/recurring/domain";
import { TransactionCategoryIcon } from "@/components/transaction-category-icon";
import {
  SensitiveAmount,
  SensitiveChartBar,
} from "@/components/amount-privacy";

function rupiah(value: bigint) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
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

function displayDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
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
  const trendMaximum = data.trend.reduce((maximum, item) => {
    const itemMaximum = item.income > item.expense ? item.income : item.expense;
    return itemMaximum > maximum ? itemMaximum : maximum;
  }, 0n);
  const trendHeight = (value: bigint) => {
    if (value <= 0n || trendMaximum <= 0n) return 0;
    const percent = Math.max(4, Number((value * 100n) / trendMaximum));
    return Math.round((percent * 144) / 100);
  };

  return (
    <div className="dashboard-motion space-y-5">
      <div className="dashboard-motion-grid grid gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          {
            title: "Total saldo",
            value: data.totalBalance,
            note: `${data.accounts.length} akun aktif`,
            icon: Wallet,
            href: sectionHref("accounts", workspaceId),
          },
          {
            title: "Pemasukan periode ini",
            value: data.income,
            note: shortPeriod(
              data.period.startDate,
              data.period.endDateExclusive,
            ),
            icon: ArrowDownLeft,
            href: reportHref(workspaceId, data.period, { type: "income" }),
          },
          {
            title: "Pengeluaran periode ini",
            value: data.expense,
            note: `${data.latestTransactions.length} transaksi terbaru ditampilkan`,
            icon: ArrowUpRight,
            href: reportHref(workspaceId, data.period, { type: "expense" }),
          },
        ].map(({ title, value, note, icon: Icon, href }) => (
          <Card key={title} className="gap-0 py-5 shadow-none">
            <CardContent className="px-5">
              <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
                <span>{title}</span>
                <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Icon className="size-[17px]" aria-hidden="true" />
                </span>
              </div>
              <p className="my-3 text-[28px] font-semibold leading-none tracking-tight">
                <SensitiveAmount>{rupiah(value)}</SensitiveAmount>
              </p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{note}</p>
                <Link
                  href={href}
                  className="shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  Lihat
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!data.isActivePeriod && (
        <p className="rounded-xl border bg-card p-3 text-sm text-muted-foreground">
          Kamu sedang melihat periode historis. Total saldo tetap menunjukkan
          saldo saat ini; grafik, budget, dan transaksi mengikuti periode yang
          dipilih.
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
                Jatuh tempo dalam tujuh hari. Saldo belum berubah.
              </p>
            </div>
            <Link
              className="text-xs font-medium text-primary hover:underline"
              href={`/transactions/reminders?workspaceId=${encodeURIComponent(workspaceId)}`}
            >
              Periksa →
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {data.recurringReminders.slice(0, 3).map((reminder) => {
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
                      <SensitiveAmount>
                        {rupiah(reminder.amount)}
                      </SensitiveAmount>
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <Card className="gap-0 shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Arus kas</CardTitle>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Pemasukan dan pengeluaran pada enam periode terakhir
              </p>
            </div>
            <Badge variant="outline">
              {shortPeriod(data.period.startDate, data.period.endDateExclusive)}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-primary" /> Pemasukan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-amber-600" /> Pengeluaran
              </span>
            </div>
            {data.trend.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Belum ada histori periode untuk ditampilkan.
              </p>
            ) : (
              <div
                className="grid h-52 items-end gap-2 border-b bg-[repeating-linear-gradient(to_top,transparent_0,transparent_47px,var(--border)_48px,transparent_49px)]"
                style={{
                  gridTemplateColumns: `repeat(${data.trend.length}, minmax(0, 1fr))`,
                }}
                aria-label="Grafik pemasukan dan pengeluaran per periode"
              >
                {data.trend.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex h-full min-w-0 flex-col justify-end"
                  >
                    <div className="flex h-36 items-end justify-center gap-1 sm:gap-2">
                      <SensitiveChartBar
                        className="dashboard-chart-bar w-3 rounded-t bg-primary sm:w-5"
                        style={{
                          height: `${trendHeight(item.income)}px`,
                          animationDelay: `${index * 70}ms`,
                        }}
                        label="Pemasukan"
                        value={rupiah(item.income)}
                      />
                      <SensitiveChartBar
                        className="dashboard-chart-bar w-3 rounded-t bg-amber-600 sm:w-5"
                        style={{
                          height: `${trendHeight(item.expense)}px`,
                          animationDelay: `${index * 70 + 45}ms`,
                        }}
                        label="Pengeluaran"
                        value={rupiah(item.expense)}
                      />
                    </div>
                    <p className="mt-2 truncate text-center text-[10px] text-muted-foreground sm:text-xs">
                      {shortPeriod(item.startDate, item.endDateExclusive)}
                    </p>
                    <span className="sr-only">
                      Pemasukan{" "}
                      <SensitiveAmount>{rupiah(item.income)}</SensitiveAmount>,
                      pengeluaran{" "}
                      <SensitiveAmount>{rupiah(item.expense)}</SensitiveAmount>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 grid gap-3 border-t pt-4 sm:grid-cols-3">
              <div>
                <p className="text-[11px] text-muted-foreground">Pemasukan</p>
                <p className="mt-1 text-sm font-semibold">
                  <SensitiveAmount>{rupiah(data.income)}</SensitiveAmount>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Pengeluaran</p>
                <p className="mt-1 text-sm font-semibold text-destructive">
                  <SensitiveAmount>{rupiah(data.expense)}</SensitiveAmount>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">
                  Arus kas bersih
                </p>
                <p
                  className={`mt-1 text-sm font-semibold ${data.netCashFlow < 0n ? "text-destructive" : "text-primary"}`}
                >
                  <SensitiveAmount>{rupiah(data.netCashFlow)}</SensitiveAmount>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Budget periode ini</CardTitle>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Pantau realisasi kategori utama
              </p>
            </div>
            <Link
              className="text-xs font-medium text-primary hover:underline"
              href={`${sectionHref("budgets", workspaceId)}&periodId=${encodeURIComponent(data.period.id)}`}
            >
              Lihat semua →
            </Link>
          </CardHeader>
          <CardContent>
            {data.budget.items.length === 0 ? (
              <div className="py-12 text-center">
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
              <div className="space-y-5">
                {data.budget.items.slice(0, 4).map((item, index) => {
                  const percent = budgetPercent(item.actual, item.limitAmount);
                  const width = Number(percent > 100n ? 100n : percent);
                  return (
                    <div key={item.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <Link
                          href={reportHref(workspaceId, data.period, {
                            type: "expense",
                            categoryId: item.categoryId,
                          })}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {item.category.name}
                        </Link>
                        <span>{percent.toString()}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`dashboard-progress-fill h-full rounded-full ${percent >= 80n ? "bg-amber-600" : "bg-primary"}`}
                          style={{
                            width: `${width}%`,
                            animationDelay: `${120 + index * 70}ms`,
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        <SensitiveAmount>{rupiah(item.actual)}</SensitiveAmount>{" "}
                        /{" "}
                        <SensitiveAmount>
                          {rupiah(item.limitAmount)}
                        </SensitiveAmount>{" "}
                        · {budgetStatus(item.actual, item.limitAmount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Transaksi terbaru</CardTitle>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Aktivitas terbaru pada periode yang dipilih
            </p>
          </div>
          <Link
            className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-accent"
            href={reportHref(workspaceId, data.period)}
          >
            Lihat semua →
          </Link>
        </CardHeader>
        <CardContent>
          {data.latestTransactions.length === 0 ? (
            <div className="py-10 text-center">
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
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]"
                >
                  <TransactionCategoryIcon
                    categoryName={transaction.category?.name ?? null}
                    type={transaction.type}
                  />
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium">
                      {transaction.title}
                    </p>
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {transaction.account.name}
                      {transaction.destinationAccount
                        ? ` → ${transaction.destinationAccount.name}`
                        : ""}
                      {transaction.category
                        ? ` · ${transaction.category.name}`
                        : ""}
                      {` · ${displayDate(transaction.transactionDate)}`}
                    </p>
                  </div>
                  <span
                    className={`col-start-2 justify-self-end text-sm font-semibold sm:col-start-3 sm:row-start-1 ${transaction.type === "expense" ? "text-destructive" : transaction.type === "income" ? "text-primary" : ""}`}
                  >
                    {transaction.type === "expense"
                      ? "−"
                      : transaction.type === "income"
                        ? "+"
                        : ""}
                    <SensitiveAmount>
                      {rupiah(transaction.amount)}
                    </SensitiveAmount>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
