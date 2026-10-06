import { Dashboard } from "@/components/dashboard";
import { AccountsSection } from "@/components/accounts-section";
import { SettingsSection } from "@/components/settings-section";
import { TransactionsSection } from "@/components/transactions-section";
import { BudgetsSection } from "@/components/budgets-section";
import { ReportsSection } from "@/components/reports-section";
import { MembersSection } from "@/components/members-section";
import type { ReportQuery } from "@/modules/reports/service";
import type { Section } from "@/lib/navigation";
import type { WorkspaceAccess } from "@/modules/workspaces/service";

export function SectionContent({
  section,
  access,
  today,
  error,
  success,
  reportQuery,
  selectedPeriodId,
  reconcileAccountId,
  reconcileDate,
  transactionView = "history",
}: {
  section: Section;
  access: WorkspaceAccess;
  today: Date;
  error?: string;
  success?: string;
  reportQuery: ReportQuery;
  selectedPeriodId: string;
  reconcileAccountId?: string;
  reconcileDate?: string;
  transactionView?: "history" | "reminders";
}) {
  switch (section) {
    case "dashboard":
      return (
        <Dashboard
          workspaceId={access.workspaceId}
          today={today}
          periodId={selectedPeriodId}
        />
      );
    case "transactions":
      return (
        <TransactionsSection
          access={access}
          today={today}
          error={error}
          success={success}
          view={transactionView}
        />
      );
    case "budgets":
      return (
        <BudgetsSection
          workspaceId={access.workspaceId}
          canManage={access.role === "owner"}
          role={access.role}
          today={today}
          periodId={selectedPeriodId}
          error={error}
          success={success}
        />
      );
    case "accounts":
      return (
        <AccountsSection
          workspaceId={access.workspaceId}
          canManage={access.role === "owner"}
          role={access.role}
          today={today}
          reconcileAccountId={reconcileAccountId}
          reconcileDate={reconcileDate}
          error={error}
          success={success}
        />
      );
    case "reports":
      return (
        <ReportsSection
          workspaceId={access.workspaceId}
          canExport={access.role !== "viewer"}
          today={today}
          query={reportQuery}
        />
      );
    case "members":
      return <MembersSection access={access} error={error} success={success} />;
    case "settings":
      return (
        <SettingsSection
          access={access}
          today={today}
          error={error}
          success={success}
        />
      );
  }
}
