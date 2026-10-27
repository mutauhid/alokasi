import type { CSSProperties } from "react";
import Link from "next/link";
import { CalendarClock, ChartPie } from "lucide-react";
import { SensitiveAmount } from "@/components/amount-privacy";
import { budgetPercent, budgetStatus } from "@/modules/finance/domain";
import { calendarDayDifference } from "@/modules/recurring/domain";
import { sectionHref } from "@/lib/navigation";
import {
  DashboardPanel,
  PanelHeading,
  reportHref,
  rupiah,
  type DashboardOverview,
} from "./shared";

export function BudgetCard({
  data,
  workspaceId,
}: {
  data: DashboardOverview;
  workspaceId: string;
}) {
  const budgetHref = `${sectionHref("budgets", workspaceId)}&periodId=${encodeURIComponent(data.period.id)}`;

  return (
    <DashboardPanel>
      <PanelHeading
        title="Budget periode ini"
        description="Pantau realisasi setiap kategori."
        href={budgetHref}
      />
      <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
        {data.budget.items.length === 0 ? (
          <div className="py-8 text-center">
            <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ChartPie className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-medium">Belum ada budget</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Buat limit kategori untuk mulai memantau pengeluaran.
            </p>
            <Link
              href={budgetHref}
              className="mt-4 inline-flex rounded-lg border px-3 py-2 text-xs font-semibold text-primary outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
            >
              Atur budget
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.budget.items.slice(0, 4).map((item) => {
              const percent = budgetPercent(item.actual, item.limitAmount);
              const visualPercent = Number(percent > 100n ? 100n : percent);
              const status = budgetStatus(item.actual, item.limitAmount);
              const statusTone =
                percent >= 100n
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : percent >= 80n
                    ? "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "border-primary/25 bg-primary/10 text-primary";
              const ringStyle = {
                "--dashboard-budget-progress": `${visualPercent * 3.6}deg`,
                "--dashboard-budget-color":
                  percent >= 100n
                    ? "var(--destructive)"
                    : percent >= 80n
                      ? "#f59e0b"
                      : "var(--primary)",
              } as CSSProperties;
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3 rounded-xl border bg-secondary/15 p-3 sm:gap-4 sm:p-4"
                >
                  <div
                    className="dashboard-v2-budget-ring flex size-16 items-center justify-center rounded-full"
                    style={ringStyle}
                    role="img"
                    aria-label={`${item.category.name}: ${percent.toString()} persen, ${status}`}
                  >
                    <span className="flex size-11 items-center justify-center rounded-full bg-card px-1 text-center text-[10px] font-bold tabular-nums">
                      {percent.toString()}%
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={reportHref(workspaceId, data.period, {
                          type: "expense",
                          categoryId: item.categoryId,
                        })}
                        className="min-w-0 truncate rounded-sm text-sm font-semibold outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {item.category.name}
                      </Link>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone}`}
                      >
                        {status}
                      </span>
                    </div>
                    <p className="mt-2 flex flex-wrap items-baseline gap-x-1 text-xs text-muted-foreground">
                      <SensitiveAmount className="font-semibold text-foreground">
                        {rupiah(item.actual)}
                      </SensitiveAmount>
                      <span>terpakai dari</span>
                      <SensitiveAmount>
                        {rupiah(item.limitAmount)}
                      </SensitiveAmount>
                    </p>
                    <div
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                      aria-hidden="true"
                    >
                      <div
                        className="dashboard-progress-fill h-full rounded-full"
                        style={{
                          width: `${visualPercent}%`,
                          backgroundColor:
                            percent >= 100n
                              ? "var(--destructive)"
                              : percent >= 80n
                                ? "#f59e0b"
                                : "var(--primary)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardPanel>
  );
}

export function ReminderCard({
  data,
  workspaceId,
  today,
}: {
  data: DashboardOverview;
  workspaceId: string;
  today: Date;
}) {
  const href = `/transactions/reminders?workspaceId=${encodeURIComponent(workspaceId)}`;
  return (
    <DashboardPanel>
      <PanelHeading
        title="Pengingat terdekat"
        description="Transaksi berulang yang perlu diperiksa."
        href={href}
      />
      <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        {data.recurringReminders.length === 0 ? (
          <div className="py-6 text-center">
            <CalendarClock
              className="mx-auto size-6 text-primary"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium">
              Tidak ada pengingat dekat
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Jadwal tujuh hari ke depan masih kosong.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {data.recurringReminders.slice(0, 3).map((reminder) => {
              const difference = calendarDayDifference(
                today,
                reminder.nextDueDate,
              );
              const label =
                difference < 0
                  ? `Terlambat ${Math.abs(difference)} hari`
                  : difference === 0
                    ? "Hari ini"
                    : difference === 1
                      ? "Besok"
                      : `${difference} hari lagi`;
              const statusClass =
                difference < 0
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : difference === 0
                    ? "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "border-primary/25 bg-primary/10 text-primary";
              return (
                <li
                  key={reminder.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {reminder.name}
                    </p>
                    <p
                      className={`mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}
                    >
                      {label}
                    </p>
                  </div>
                  <SensitiveAmount
                    className={`shrink-0 text-sm font-semibold ${reminder.type === "expense" ? "text-destructive" : "text-primary"}`}
                  >
                    {reminder.type === "expense" ? "−" : "+"}
                    {rupiah(reminder.amount)}
                  </SensitiveAmount>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DashboardPanel>
  );
}
