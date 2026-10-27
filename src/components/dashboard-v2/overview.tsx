import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Scale,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { SensitiveAmount } from "@/components/amount-privacy";
import { calendarDayDifference } from "@/modules/recurring/domain";
import { sectionHref } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import {
  DashboardPanel,
  reportHref,
  rupiah,
  shortPeriod,
  type DashboardOverview,
} from "./shared";

function KpiCard({
  title,
  value,
  note,
  icon: Icon,
  href,
  tone,
  featured = false,
}: {
  title: string;
  value: bigint;
  note: string;
  icon: LucideIcon;
  href: string;
  tone: "primary" | "danger" | "neutral";
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "dashboard-v2-card dashboard-v2-kpi group relative min-w-0 overflow-hidden rounded-2xl border bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-5 xl:p-6",
        featured && "dashboard-v2-kpi-featured border-primary/35",
      )}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="min-h-8 text-[11px] font-medium leading-4 text-muted-foreground sm:min-h-0 sm:text-sm">
            {title}
          </p>
          <SensitiveAmount
            className={cn(
              "mt-2 block truncate text-lg font-semibold tracking-[-0.035em] sm:mt-3 sm:text-2xl xl:text-[1.7rem]",
              tone === "primary" && "text-primary",
              tone === "danger" && "text-destructive",
            )}
          >
            {rupiah(value)}
          </SensitiveAmount>
          <p className="mt-2 truncate text-[10px] text-muted-foreground sm:mt-3 sm:text-xs">
            {note}
          </p>
        </div>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl border bg-secondary/65 text-foreground transition-colors group-hover:border-primary/35 group-hover:text-primary sm:size-10",
            featured && "border-primary/30 bg-primary/15 text-primary",
          )}
        >
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export function KpiGrid({
  data,
  workspaceId,
}: {
  data: DashboardOverview;
  workspaceId: string;
}) {
  const periodLabel = shortPeriod(
    data.period.startDate,
    data.period.endDateExclusive,
  );
  const report = reportHref(workspaceId, data.period);

  return (
    <div className="dashboard-motion-grid grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <KpiCard
        title="Total saldo"
        value={data.totalBalance}
        note={`${data.accounts.length} akun aktif`}
        icon={Wallet}
        href={sectionHref("accounts", workspaceId)}
        tone="neutral"
        featured
      />
      <KpiCard
        title="Pemasukan periode ini"
        value={data.income}
        note={periodLabel}
        icon={ArrowDownLeft}
        href={reportHref(workspaceId, data.period, { type: "income" })}
        tone="primary"
      />
      <KpiCard
        title="Pengeluaran periode ini"
        value={data.expense}
        note={periodLabel}
        icon={ArrowUpRight}
        href={reportHref(workspaceId, data.period, { type: "expense" })}
        tone="danger"
      />
      <KpiCard
        title="Arus kas bersih"
        value={data.netCashFlow}
        note="Pemasukan dikurangi pengeluaran"
        icon={Scale}
        href={report}
        tone={data.netCashFlow < 0n ? "danger" : "primary"}
      />
    </div>
  );
}

export function RecurringAlert({
  data,
  workspaceId,
  today,
}: {
  data: DashboardOverview;
  workspaceId: string;
  today: Date;
}) {
  if (data.recurringReminders.length === 0) return null;
  const closest = data.recurringReminders[0];
  const difference = calendarDayDifference(today, closest.nextDueDate);
  const status =
    difference < 0 ? "overdue" : difference === 0 ? "today" : "upcoming";
  const dueLabel =
    difference < 0
      ? `terlambat ${Math.abs(difference)} hari`
      : difference === 0
        ? "jatuh tempo hari ini"
        : difference === 1
          ? "jatuh tempo besok"
          : `jatuh tempo dalam ${difference} hari`;
  const alertTitle =
    status === "overdue"
      ? "Transaksi berulang sudah terlambat"
      : status === "today"
        ? "Transaksi berulang jatuh tempo hari ini"
        : "Transaksi berulang akan jatuh tempo";
  const statusClass =
    status === "overdue"
      ? "border-destructive/35 bg-destructive/10 text-destructive"
      : status === "today"
        ? "border-amber-500/40 bg-amber-500/12 text-amber-700 dark:text-amber-300"
        : "border-primary/30 bg-primary/10 text-primary";

  return (
    <DashboardPanel
      className={`dashboard-v2-alert dashboard-v2-alert-${status} ${
        status === "overdue"
          ? "border-destructive/35"
          : status === "today"
            ? "border-amber-500/35"
            : "border-primary/25"
      }`}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${statusClass}`}
          >
            <CalendarClock className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{alertTitle}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <span className="text-sm font-medium text-foreground">
                {closest.name}
              </span>{" "}
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}
              >
                {dueLabel}
              </span>
              <SensitiveAmount
                className={`text-sm font-semibold ${closest.type === "expense" ? "text-destructive" : "text-primary"}`}
              >
                {closest.type === "expense" ? "−" : "+"}
                {rupiah(closest.amount)}
              </SensitiveAmount>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              Saldo belum berubah sampai transaksi dikonfirmasi.
            </p>
          </div>
        </div>
        <Link
          href={`/transactions/reminders?workspaceId=${encodeURIComponent(workspaceId)}`}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border bg-background/65 px-4 text-sm font-semibold outline-none hover:bg-secondary/55 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Periksa pengingat
        </Link>
      </div>
    </DashboardPanel>
  );
}
