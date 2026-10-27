import Link from "next/link";
import { HandCoins } from "lucide-react";
import {
  SensitiveAmount,
  SensitiveChartBar,
} from "@/components/amount-privacy";
import { calendarDayDifference } from "@/modules/recurring/domain";
import { sectionHref } from "@/lib/navigation";
import {
  DashboardPanel,
  PanelHeading,
  compactRupiah,
  displayDate,
  reportHref,
  rupiah,
  shortPeriod,
  type DashboardOverview,
} from "./shared";
import { buildCashFlowScale, scalePosition } from "./chart-scale";

function dueLabel(today: Date, dueDate: Date) {
  const difference = calendarDayDifference(today, dueDate);
  if (difference < 0) return `Terlambat ${Math.abs(difference)} hari`;
  if (difference === 0) return "Jatuh tempo hari ini";
  if (difference === 1) return "Jatuh tempo besok";
  return `Dalam ${difference} hari`;
}

export function CashFlowCard({
  data,
  workspaceId,
}: {
  data: DashboardOverview;
  workspaceId: string;
}) {
  const scale = buildCashFlowScale(
    data.trend.flatMap((item) => [item.income, item.expense]),
  );
  const zeroPosition = scale ? scalePosition(0n, scale) : 0;
  const barStyle = (value: bigint) => {
    if (!scale || value === 0n)
      return { bottom: `${zeroPosition}%`, height: 0 };
    const valuePosition = scalePosition(value, scale);
    return {
      bottom: `${Math.min(valuePosition, zeroPosition)}%`,
      height: `${Math.max(1.5, Math.abs(valuePosition - zeroPosition))}%`,
    };
  };

  return (
    <DashboardPanel className={data.debts ? "" : "xl:col-span-2"}>
      <PanelHeading
        title="Arus kas"
        description="Perbandingan pemasukan dan pengeluaran enam periode terakhir."
        href={reportHref(workspaceId, data.period)}
        linkLabel="Buka laporan"
      />
      <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" /> Pemasukan
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500" /> Pengeluaran
            </span>
          </div>
          <span className="rounded-lg border bg-secondary/35 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {shortPeriod(data.period.startDate, data.period.endDateExclusive)}
          </span>
        </div>

        {!scale ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-secondary/15 text-center">
            <p className="text-sm font-medium">Belum ada arus kas</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
              Seluruh periode bernilai Rp0. Grafik akan tampil setelah ada
              pemasukan atau pengeluaran.
            </p>
          </div>
        ) : (
          <figure aria-label="Grafik pemasukan dan pengeluaran per periode">
            <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
              <div className="relative h-44" aria-hidden="true">
                {scale.ticks.map((tick, index) => {
                  const position = scalePosition(tick, scale);
                  return (
                    <span
                      key={tick.toString()}
                      className="absolute right-0 text-[10px] font-medium text-muted-foreground sm:text-[11px]"
                      style={{
                        top: `${100 - position}%`,
                        transform:
                          index === 0
                            ? "none"
                            : index === scale.ticks.length - 1
                              ? "translateY(-100%)"
                              : "translateY(-50%)",
                      }}
                    >
                      <SensitiveAmount placeholder="•••">
                        {compactRupiah(tick)}
                      </SensitiveAmount>
                    </span>
                  );
                })}
              </div>
              <div className="relative h-44 border-b border-l">
                {scale.ticks.map((tick) => (
                  <span
                    key={tick.toString()}
                    className={`dashboard-v2-chart-line pointer-events-none absolute inset-x-0 border-t ${tick === 0n ? "border-foreground/35" : "border-border/70"}`}
                    style={{ bottom: `${scalePosition(tick, scale)}%` }}
                    aria-hidden="true"
                  />
                ))}
                <div
                  className="absolute inset-0 grid gap-1 sm:gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${data.trend.length}, minmax(0, 1fr))`,
                  }}
                >
                  {data.trend.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex h-full min-w-0 justify-center gap-1 sm:gap-2"
                    >
                      <div className="relative h-full w-3 sm:w-5">
                        <SensitiveChartBar
                          className={`dashboard-chart-bar absolute inset-x-0 rounded-sm bg-primary ${item.income < 0n ? "dashboard-chart-bar-negative" : ""}`}
                          style={{
                            ...barStyle(item.income),
                            animationDelay: `${index * 70}ms`,
                          }}
                          label={`Pemasukan ${shortPeriod(item.startDate, item.endDateExclusive)}`}
                          value={rupiah(item.income)}
                        />
                      </div>
                      <div className="relative h-full w-3 sm:w-5">
                        <SensitiveChartBar
                          className={`dashboard-chart-bar absolute inset-x-0 rounded-sm bg-amber-500 ${item.expense < 0n ? "dashboard-chart-bar-negative" : ""}`}
                          style={{
                            ...barStyle(item.expense),
                            animationDelay: `${index * 70 + 45}ms`,
                          }}
                          label={`Pengeluaran ${shortPeriod(item.startDate, item.endDateExclusive)}`}
                          value={rupiah(item.expense)}
                        />
                      </div>
                      <span className="sr-only">
                        Pemasukan{" "}
                        <SensitiveAmount>{rupiah(item.income)}</SensitiveAmount>
                        , pengeluaran{" "}
                        <SensitiveAmount>
                          {rupiah(item.expense)}
                        </SensitiveAmount>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <span aria-hidden="true" />
              <div
                className="mt-3 grid gap-1 sm:gap-2"
                style={{
                  gridTemplateColumns: `repeat(${data.trend.length}, minmax(0, 1fr))`,
                }}
              >
                {data.trend.map((item) => {
                  const [periodStart, periodEnd] = shortPeriod(
                    item.startDate,
                    item.endDateExclusive,
                  ).split("–");
                  return (
                    <p
                      key={item.id}
                      className="min-w-0 text-center text-[9px] font-medium leading-4 text-muted-foreground sm:text-[11px]"
                    >
                      <span className="block sm:inline">{periodStart}</span>
                      <span className="block sm:inline">
                        <span aria-hidden="true">–</span>
                        {periodEnd}
                      </span>
                    </p>
                  );
                })}
              </div>
            </div>
            <figcaption className="sr-only">
              Skala nominal menyesuaikan nilai terbesar pada periode yang
              ditampilkan.
            </figcaption>
          </figure>
        )}

        <div className="mt-5 grid grid-cols-1 gap-2 border-t pt-4 sm:grid-cols-3">
          {[
            {
              label: "Pemasukan",
              value: data.income,
              href: reportHref(workspaceId, data.period, { type: "income" }),
              className: "text-primary",
            },
            {
              label: "Pengeluaran",
              value: data.expense,
              href: reportHref(workspaceId, data.period, { type: "expense" }),
              className: "text-destructive",
            },
            {
              label: "Arus kas bersih",
              value: data.netCashFlow,
              href: reportHref(workspaceId, data.period),
              className:
                data.netCashFlow < 0n ? "text-destructive" : "text-primary",
            },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-xl p-2 outline-none hover:bg-secondary/45 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="block text-[11px] text-muted-foreground">
                {item.label}
              </span>
              <SensitiveAmount
                className={`mt-1 block truncate text-sm font-semibold ${item.className}`}
              >
                {rupiah(item.value)}
              </SensitiveAmount>
            </Link>
          ))}
        </div>
      </div>
    </DashboardPanel>
  );
}

export function DebtSummaryCard({
  data,
  workspaceId,
  today,
}: {
  data: DashboardOverview;
  workspaceId: string;
  today: Date;
}) {
  if (!data.debts) return null;

  return (
    <DashboardPanel>
      <PanelHeading
        title="Ringkasan utang & piutang"
        description="Posisi berjalan di luar arus kas dan budget."
        href={sectionHref("debts", workspaceId)}
      />
      <div className="space-y-4 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-secondary/25 p-4">
            <p className="text-xs text-muted-foreground">Sisa utang</p>
            <SensitiveAmount className="mt-2 block truncate text-lg font-semibold text-destructive">
              {rupiah(data.debts.totalDebt)}
            </SensitiveAmount>
          </div>
          <div className="rounded-xl border bg-secondary/25 p-4">
            <p className="text-xs text-muted-foreground">Sisa piutang</p>
            <SensitiveAmount className="mt-2 block truncate text-lg font-semibold text-primary">
              {rupiah(data.debts.totalReceivable)}
            </SensitiveAmount>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
          <span className="text-muted-foreground">Catatan terlambat</span>
          <span
            className={
              data.debts.overdueCount > 0
                ? "font-semibold text-destructive"
                : "font-semibold"
            }
          >
            {data.debts.overdueCount}
          </span>
        </div>

        {data.debts.nearestDue ? (
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-primary">
              <HandCoins className="size-4" aria-hidden="true" />
              Jatuh tempo terdekat
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {data.debts.nearestDue.title}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {data.debts.nearestDue.counterparty}
                </p>
              </div>
              <SensitiveAmount className="shrink-0 text-sm font-semibold">
                {rupiah(data.debts.nearestDue.outstandingAmount)}
              </SensitiveAmount>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {dueLabel(today, data.debts.nearestDue.dueDate)} ·{" "}
              {displayDate(data.debts.nearestDue.dueDate)}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-5 text-center">
            <p className="text-sm font-medium">Tidak ada jatuh tempo aktif</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Semua catatan telah selesai atau belum memiliki tanggal.
            </p>
          </div>
        )}
      </div>
    </DashboardPanel>
  );
}
