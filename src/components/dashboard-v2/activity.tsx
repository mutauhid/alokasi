import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleCheckBig,
  HandCoins,
  ReceiptText,
} from "lucide-react";
import { SensitiveAmount } from "@/components/amount-privacy";
import { TransactionCategoryIcon } from "@/components/transaction-category-icon";
import { sectionHref } from "@/lib/navigation";
import {
  DashboardPanel,
  PanelHeading,
  displayDate,
  reportHref,
  rupiah,
  type DashboardOverview,
} from "./shared";

export function RecentTransactionsCard({
  data,
  workspaceId,
}: {
  data: DashboardOverview;
  workspaceId: string;
}) {
  return (
    <DashboardPanel className="self-start">
      <PanelHeading
        title="Transaksi terbaru periode ini"
        description="Daftar transaksi paling baru."
        href={reportHref(workspaceId, data.period)}
      />
      <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        {data.latestTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <ReceiptText
              className="mx-auto size-7 text-primary"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium">
              Belum ada transaksi periode ini
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Transaksi baru akan muncul di sini.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {data.latestTransactions.slice(0, 5).map((transaction) => (
              <li
                key={transaction.id}
                className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 py-4 first:pt-0 last:pb-0"
              >
                <TransactionCategoryIcon
                  categoryName={transaction.category?.name ?? null}
                  type={transaction.type}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {transaction.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
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
                <SensitiveAmount
                  className={`shrink-0 text-right text-sm font-semibold ${
                    transaction.type === "expense"
                      ? "text-destructive"
                      : transaction.type === "income"
                        ? "text-primary"
                        : ""
                  }`}
                >
                  {transaction.type === "expense"
                    ? "−"
                    : transaction.type === "income"
                      ? "+"
                      : ""}
                  {rupiah(transaction.amount)}
                </SensitiveAmount>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardPanel>
  );
}

export function DebtActivityCard({
  data,
  workspaceId,
}: {
  data: DashboardOverview;
  workspaceId: string;
}) {
  if (!data.debts) return null;

  return (
    <DashboardPanel>
      <PanelHeading
        title="Aktivitas utang & piutang terbaru"
        description="Pencatatan pokok dan pembayaran terbaru."
        href={sectionHref("debts", workspaceId)}
        linkLabel="Buka ledger"
      />
      <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        {data.debts.latestActivities.length === 0 ? (
          <div className="py-10 text-center">
            <HandCoins
              className="mx-auto size-7 text-primary"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium">
              Belum ada aktivitas utang atau piutang
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pencatatan dan pembayaran akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <div className="hidden grid-cols-[8.5rem_minmax(0,1fr)_8.5rem_9rem_9rem] gap-4 border-b bg-secondary/30 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground md:grid">
              <span>Tipe</span>
              <span>Deskripsi</span>
              <span>Status</span>
              <span>Tanggal</span>
              <span className="text-right">Nominal</span>
            </div>
            <ul className="divide-y">
              {data.debts.latestActivities.map((activity) => {
                const ActivityIcon =
                  activity.activity === "payment"
                    ? CircleCheckBig
                    : activity.kind === "debt"
                      ? ArrowDownLeft
                      : ArrowUpRight;
                const kindLabel =
                  activity.kind === "debt" ? "Utang" : "Piutang";
                const statusLabel =
                  activity.activity === "payment" ? "Pembayaran" : "Pencatatan";
                const kindClass =
                  activity.kind === "debt"
                    ? "border-destructive/25 bg-destructive/10 text-destructive"
                    : "border-primary/25 bg-primary/10 text-primary";
                return (
                  <li
                    key={activity.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-4 md:grid-cols-[8.5rem_minmax(0,1fr)_8.5rem_9rem_9rem] md:items-center md:gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${kindClass}`}
                      >
                        <ActivityIcon className="size-4" aria-hidden="true" />
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${kindClass}`}
                      >
                        {kindLabel}
                      </span>
                    </div>
                    <div className="col-span-2 min-w-0 md:col-span-1">
                      <p className="truncate text-sm font-semibold">
                        {activity.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {activity.counterparty}
                        <span className="md:hidden">
                          {" "}
                          · {displayDate(activity.activityDate)}
                        </span>
                      </p>
                    </div>
                    <span className="w-fit rounded-full border bg-secondary/45 px-2.5 py-1 text-[10px] font-semibold text-foreground">
                      {statusLabel}
                    </span>
                    <time className="hidden text-sm text-muted-foreground md:block">
                      {displayDate(activity.activityDate)}
                    </time>
                    <SensitiveAmount className="col-start-2 row-start-1 self-center text-right text-sm font-semibold text-foreground md:col-start-5 md:row-start-auto">
                      {rupiah(activity.amount)}
                    </SensitiveAmount>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </DashboardPanel>
  );
}
