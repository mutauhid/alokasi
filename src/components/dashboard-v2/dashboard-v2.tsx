import { Info } from "lucide-react";
import { DebtActivityCard, RecentTransactionsCard } from "./activity";
import { BudgetCard, ReminderCard } from "./budget-reminders";
import { CashFlowCard, DebtSummaryCard } from "./cashflow-debt";
import { KpiGrid, RecurringAlert } from "./overview";
import type { DashboardOverview } from "./shared";

export function DashboardV2({
  data,
  workspaceId,
  today,
}: {
  data: DashboardOverview;
  workspaceId: string;
  today: Date;
}) {
  return (
    <div className="dashboard-v2 dashboard-motion min-w-0 space-y-5 sm:space-y-6">
      <KpiGrid data={data} workspaceId={workspaceId} />

      {!data.isActivePeriod ? (
        <div className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Info
            className="mt-0.5 size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <p>
            Periode historis aktif. Total saldo tetap menunjukkan posisi
            sekarang; grafik, budget, dan transaksi mengikuti periode yang
            dipilih.
          </p>
        </div>
      ) : null}

      <RecurringAlert data={data} workspaceId={workspaceId} today={today} />

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.85fr)]">
        <CashFlowCard data={data} workspaceId={workspaceId} />
        <DebtSummaryCard data={data} workspaceId={workspaceId} today={today} />
      </div>

      <div className="grid min-w-0 gap-5 xl:items-start xl:grid-cols-[minmax(19rem,0.8fr)_minmax(0,1.2fr)]">
        <div className="min-w-0 space-y-5">
          <BudgetCard data={data} workspaceId={workspaceId} />
          <ReminderCard data={data} workspaceId={workspaceId} today={today} />
        </div>
        <RecentTransactionsCard data={data} workspaceId={workspaceId} />
      </div>

      <DebtActivityCard data={data} workspaceId={workspaceId} />
    </div>
  );
}
