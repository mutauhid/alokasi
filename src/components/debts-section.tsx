import { listActiveAccountOptions } from "@/modules/accounts/service";
import { getDebtOverview } from "@/modules/debts/service";
import type { WorkspaceAccess } from "@/modules/workspaces/service";
import { DebtsPanel, type DebtPanelItem } from "@/components/debts-panel";
import { Card, CardContent } from "@/components/ui/card";

function dateValue(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? null;
}

export async function DebtsSection({
  access,
  today,
  error,
}: {
  access: WorkspaceAccess;
  today: Date;
  error?: string;
}) {
  if (access.workspaceType !== "personal") {
    return (
      <Card className="shadow-none">
        <CardContent className="py-10 text-center">
          <p className="font-semibold">
            Utang & piutang tersedia di ruang pribadi
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Pindah ke Ruang pribadi agar kewajiban personal tidak tercampur
            dengan keuangan bersama.
          </p>
        </CardContent>
      </Card>
    );
  }

  const [overview, accounts] = await Promise.all([
    getDebtOverview(access.workspaceId, today),
    listActiveAccountOptions(access.workspaceId),
  ]);
  const items: DebtPanelItem[] = overview.items.map((item) => ({
    id: item.id,
    kind: item.kind,
    origin: item.origin,
    counterparty: item.counterparty,
    title: item.title,
    principalAmount: item.principalAmount.toString(),
    paidAmount: item.paidAmount.toString(),
    outstandingAmount: item.outstandingAmount.toString(),
    startDate: dateValue(item.startDate)!,
    dueDate: dateValue(item.dueDate),
    accountName: item.account?.name ?? null,
    note: item.note,
    status: item.status,
    payments: item.payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount.toString(),
      paymentDate: dateValue(payment.paymentDate)!,
      accountName: payment.account.name,
      note: payment.note,
    })),
  }));

  return (
    <DebtsPanel
      workspaceId={access.workspaceId}
      today={dateValue(today)!}
      canManage={access.role !== "viewer"}
      accounts={accounts}
      items={items}
      totals={{
        debt: overview.totalDebt.toString(),
        receivable: overview.totalReceivable.toString(),
        overdue: overview.overdueCount,
      }}
      error={error}
    />
  );
}
