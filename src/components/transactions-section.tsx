import { randomUUID } from "node:crypto";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  Search,
  X,
} from "lucide-react";
import { listActiveAccountOptions } from "@/modules/accounts/service";
import { listActiveCategoryOptions } from "@/modules/categories/service";
import {
  listRecentTransactionsForSuggestions,
  listTransactionPage,
} from "@/modules/transactions/service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionForm } from "@/components/transaction-form";
import { DeleteTransactionButton } from "@/components/delete-transaction-button";
import { TransactionActions } from "@/components/transaction-actions";
import { ReceiptScanPanel } from "@/components/receipt-scan-panel";
import { RecurringTransactionsSection } from "@/components/recurring-transactions-section";
import { TransactionViewTabs } from "@/components/transaction-view-tabs";
import { Button } from "@/components/ui/button";
import type { WorkspaceAccess } from "@/modules/workspaces/service";
import { buildTransactionSuggestions } from "@/modules/transactions/suggestions";
import type { TransactionPagination } from "@/modules/transactions/pagination";
import { TransactionPageSizeControl } from "@/components/transaction-page-size-control";
import { TransactionCategoryIcon } from "@/components/transaction-category-icon";
import { AutomationGuideDialog } from "@/components/automation-guide-dialog";
import { CreateTransactionDialog } from "@/components/create-transaction-dialog";
import { getActiveReceiptDraft } from "@/modules/receipts/service";
import { receiptDraftView } from "@/modules/receipts/form-state";
import { SensitiveAmount } from "@/components/amount-privacy";
import { TransactionTools } from "@/components/transaction-tools";

const messages: Record<string, string> = {
  "transaction-invalid":
    "Periksa judul, jenis, nominal, tanggal, akun, dan kategori.",
  "transaction-future": "Tanggal transaksi tidak boleh berada di masa depan.",
  "transaction-shape":
    "Kombinasi akun dan kategori tidak sesuai jenis transaksi.",
  "transaction-account": "Akun tidak tersedia atau sudah diarsipkan.",
  "transaction-before-account":
    "Tanggal transaksi mendahului tanggal mulai akun.",
  "transaction-category": "Kategori tidak sesuai atau sudah diarsipkan.",
  "transaction-idempotency": "Permintaan duplikat memiliki isi yang berbeda.",
  "transaction-conflict":
    "Transaksi sudah berubah. Muat ulang lalu coba kembali.",
  "transaction-failed": "Transaksi belum dapat disimpan.",
  "transaction-created": "Transaksi berhasil disimpan.",
  "transaction-updated": "Transaksi berhasil diperbarui.",
  "transaction-deleted":
    "Transaksi berhasil dihapus dan saldo telah diperbarui.",
  "receipt-submitted":
    "Draf struk telah diperiksa dan disimpan sebagai satu pengeluaran.",
};

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

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function displayDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function localToday(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function transactionPageHref(
  workspaceId: string,
  page: number,
  pageSize: number,
  filters: Pick<TransactionPagination, "search" | "dateFrom" | "dateTo">,
) {
  const query = new URLSearchParams({
    workspaceId,
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  if (filters.search) query.set("search", filters.search);
  if (filters.dateFrom) query.set("from", filters.dateFrom);
  if (filters.dateTo) query.set("to", filters.dateTo);
  return `/transactions?${query.toString()}`;
}

export async function TransactionsSection({
  access,
  today,
  error,
  success,
  view = "history",
  pagination,
  openCreateTransaction = false,
  openReceiptScan = false,
}: {
  access: WorkspaceAccess;
  today: Date;
  error?: string;
  success?: string;
  view?: "history" | "reminders";
  pagination: TransactionPagination;
  openCreateTransaction?: boolean;
  openReceiptScan?: boolean;
}) {
  if (view === "reminders") {
    return (
      <RecurringTransactionsSection
        access={access}
        today={today}
        error={error}
        success={success}
      />
    );
  }

  const [
    accounts,
    categories,
    transactionPage,
    suggestionSource,
    activeReceiptDraft,
  ] = await Promise.all([
    listActiveAccountOptions(access.workspaceId),
    listActiveCategoryOptions(access.workspaceId),
    listTransactionPage(access.workspaceId, pagination),
    listRecentTransactionsForSuggestions(access.workspaceId),
    access.role !== "viewer"
      ? getActiveReceiptDraft({ ...access, today })
      : Promise.resolve(null),
  ]);
  const transactions = transactionPage.items;
  const suggestions = buildTransactionSuggestions(suggestionSource);
  const status = error ?? success;
  const hasFilters = Boolean(
    pagination.search || pagination.dateFrom || pagination.dateTo,
  );

  return (
    <div className="transactions-v2 space-y-4 sm:space-y-5">
      {access.role === "viewer" && (
        <TransactionViewTabs
          workspaceId={access.workspaceId}
          current="history"
        />
      )}
      {status && messages[status] && (
        <p
          role={error ? "alert" : "status"}
          className={
            error
              ? "rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              : "rounded-lg bg-secondary p-3 text-sm"
          }
        >
          {messages[status]}
        </p>
      )}
      {access.role !== "viewer" && (
        <TransactionTools
          leading={
            <TransactionViewTabs
              workspaceId={access.workspaceId}
              current="history"
            />
          }
          scanDescription={
            activeReceiptDraft
              ? activeReceiptDraft.sourceKind === "ios_shortcut"
                ? "Draf privat dari iPhone siap diperiksa"
                : "Draf privat hasil OCR siap diperiksa"
              : undefined
          }
          defaultOpen={Boolean(activeReceiptDraft) || openReceiptScan}
          focusScanOnMount={openReceiptScan}
          createAction={
            <CreateTransactionDialog
              workspaceId={access.workspaceId}
              accounts={accounts}
              categories={categories}
              idempotencyKey={randomUUID()}
              defaultDate={localToday(access.timezone)}
              suggestions={suggestions}
              defaultOpen={openCreateTransaction}
              timeZone={access.timezone}
            />
          }
          scanContent={
            <ReceiptScanPanel
              compact
              workspaceId={access.workspaceId}
              accounts={accounts}
              categories={categories
                .filter((category) => category.type === "expense")
                .map(({ id, name }) => ({ id, name }))}
              suggestions={suggestions}
              timeZone={access.timezone}
              initialState={
                activeReceiptDraft
                  ? receiptDraftView(activeReceiptDraft)
                  : undefined
              }
            />
          }
        />
      )}
      <Card className="transactions-v2-card gap-0 overflow-hidden rounded-2xl py-0 shadow-none">
        <CardHeader className="border-b p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg tracking-[-0.02em] sm:text-xl">
                Riwayat transaksi
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {transactionPage.totalCount} transaksi
                {hasFilters ? " sesuai filter" : ""} · terbaru berdasarkan
                tanggal
              </p>
            </div>
          </div>
          <form
            action="/transactions"
            method="get"
            className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(15rem,1fr)_minmax(9.5rem,0.45fr)_minmax(9.5rem,0.45fr)_auto] lg:items-end"
          >
            <input
              type="hidden"
              name="workspaceId"
              value={access.workspaceId}
            />
            <input type="hidden" name="page" value="1" />
            <input
              type="hidden"
              name="pageSize"
              value={transactionPage.pageSize}
            />
            <label className="min-w-0 text-xs font-medium text-muted-foreground sm:col-span-2 lg:col-span-1">
              <span>Cari transaksi berdasarkan judul atau kategori</span>
              <span className="relative mt-1.5 block">
                <Search
                  className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  name="search"
                  defaultValue={pagination.search}
                  maxLength={100}
                  placeholder="Judul atau kategori"
                  className="min-h-11 w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm text-foreground shadow-xs transition-colors focus:border-primary"
                />
              </span>
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Dari tanggal
              <span className="relative mt-1.5 block">
                <CalendarDays
                  className="pointer-events-none absolute left-3 top-3 size-4"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  name="from"
                  defaultValue={pagination.dateFrom}
                  max={pagination.dateTo || undefined}
                  className="min-h-11 w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm text-foreground shadow-xs transition-colors focus:border-primary"
                />
              </span>
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Sampai tanggal
              <span className="relative mt-1.5 block">
                <CalendarDays
                  className="pointer-events-none absolute left-3 top-3 size-4"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  name="to"
                  defaultValue={pagination.dateTo}
                  min={pagination.dateFrom || undefined}
                  className="min-h-11 w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm text-foreground shadow-xs transition-colors focus:border-primary"
                />
              </span>
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1 lg:justify-end">
              <Button
                type="submit"
                variant="outline"
                className="min-h-11 flex-1 rounded-xl lg:flex-none"
              >
                Terapkan
              </Button>
              {hasFilters && (
                <Button
                  asChild
                  variant="ghost"
                  className="min-h-11 flex-1 rounded-xl lg:flex-none"
                >
                  <Link
                    href={transactionPageHref(
                      access.workspaceId,
                      1,
                      transactionPage.pageSize,
                      { search: "", dateFrom: "", dateTo: "" },
                    )}
                  >
                    <X aria-hidden="true" />
                    Reset
                  </Link>
                </Button>
              )}
            </div>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-14 text-center">
              <ReceiptText
                className="mb-3 size-7 text-primary"
                aria-hidden="true"
              />
              <p className="font-medium">
                {hasFilters
                  ? "Transaksi tidak ditemukan"
                  : "Belum ada transaksi"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {hasFilters
                  ? "Tidak ada transaksi yang cocok dengan pencarian atau rentang tanggal tersebut."
                  : "Transaksi pertama akan muncul di sini setelah disimpan."}
              </p>
            </div>
          ) : (
            <ul className="divide-y px-3 sm:px-5">
              {transactions.map((transaction) => {
                const detail = typeDetails[transaction.type];
                const canMutate =
                  access.role === "owner" ||
                  (access.role === "editor" &&
                    transaction.createdBy === access.actorId);
                return (
                  <li
                    key={transaction.id}
                    className="py-1.5 first:pt-3 last:pb-3"
                  >
                    <TransactionActions
                      title={transaction.title}
                      heading="Detail transaksi"
                      presentation="drawer"
                      trigger={
                        <button
                          type="button"
                          className="group grid w-full cursor-pointer grid-cols-[2.5rem_minmax(0,1fr)_minmax(5.75rem,auto)] items-center gap-3 rounded-xl px-2 py-3.5 text-left transition-[background-color,box-shadow,transform] hover:bg-accent/45 active:scale-[0.995] active:bg-accent data-[state=open]:bg-accent/55 data-[state=open]:shadow-[inset_3px_0_0_var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:grid-cols-[2.75rem_minmax(0,1fr)_minmax(8rem,auto)] sm:px-3"
                          aria-label={`Lihat detail transaksi ${transaction.title}`}
                        >
                          <TransactionCategoryIcon
                            categoryName={transaction.category?.name ?? null}
                            type={transaction.type}
                          />
                          <div className="min-w-0 self-center">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="truncate font-semibold leading-snug">
                                {transaction.title}
                              </p>
                              <Badge
                                variant="outline"
                                className="hidden shrink-0 sm:inline-flex"
                              >
                                {detail.label}
                              </Badge>
                            </div>
                            <Badge variant="outline" className="mt-1 sm:hidden">
                              {detail.label}
                            </Badge>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {transaction.account.name}
                              {transaction.destinationAccount
                                ? ` → ${transaction.destinationAccount.name}`
                                : ""}
                              {transaction.category
                                ? ` · ${transaction.category.name}`
                                : ""}
                              {` · ${displayDate(transaction.transactionDate)}`}
                              {access.workspaceType === "shared"
                                ? ` · dicatat ${transaction.creator.user.displayName ?? transaction.creator.user.email ?? "anggota"}`
                                : ""}
                            </p>
                          </div>
                          <p
                            className={`min-w-0 break-words text-right text-xs font-semibold tabular-nums sm:text-sm ${transaction.type === "expense" ? "text-destructive" : transaction.type === "income" ? "text-primary" : ""}`}
                          >
                            {detail.sign}
                            <SensitiveAmount>
                              {rupiah(transaction.amount)}
                            </SensitiveAmount>
                          </p>
                        </button>
                      }
                      editContent={
                        canMutate ? (
                          <TransactionForm
                            key={`edit-${transaction.id}`}
                            workspaceId={access.workspaceId}
                            compact
                            accounts={accounts}
                            categories={categories}
                            defaultDate={localToday(access.timezone)}
                            timeZone={access.timezone}
                            initial={{
                              id: transaction.id,
                              version: transaction.version,
                              type: transaction.type,
                              title: transaction.title,
                              amount: transaction.amount.toString(),
                              transactionDate: dateValue(
                                transaction.transactionDate,
                              ),
                              accountId: transaction.accountId,
                              destinationAccountId:
                                transaction.destinationAccountId ?? "",
                              categoryId: transaction.categoryId ?? "",
                              note: transaction.note ?? "",
                            }}
                          />
                        ) : undefined
                      }
                      deleteAction={
                        canMutate ? (
                          <DeleteTransactionButton
                            key={`delete-${transaction.id}`}
                            workspaceId={access.workspaceId}
                            id={transaction.id}
                            version={transaction.version}
                            iconOnly
                          />
                        ) : undefined
                      }
                    >
                      <div className="space-y-4">
                        <div className="rounded-2xl border bg-muted/25 p-5 text-center">
                          <TransactionCategoryIcon
                            categoryName={transaction.category?.name ?? null}
                            type={transaction.type}
                            className="mx-auto size-14 rounded-2xl"
                          />
                          <Badge variant="outline" className="mt-3">
                            {detail.label}
                          </Badge>
                          <p
                            className={`mt-3 break-words text-2xl font-semibold tracking-[-0.035em] tabular-nums ${transaction.type === "expense" ? "text-destructive" : transaction.type === "income" ? "text-primary" : ""}`}
                          >
                            {detail.sign}
                            <SensitiveAmount>
                              {rupiah(transaction.amount)}
                            </SensitiveAmount>
                          </p>
                        </div>
                        <dl className="divide-y rounded-2xl border px-4 text-sm">
                          <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-3.5">
                            <dt className="text-muted-foreground">Tanggal</dt>
                            <dd className="break-words text-right font-medium">
                              {displayDate(transaction.transactionDate)}
                            </dd>
                          </div>
                          <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-3.5">
                            <dt className="text-muted-foreground">Akun</dt>
                            <dd className="break-words text-right font-medium">
                              {transaction.account.name}
                              {transaction.destinationAccount
                                ? ` → ${transaction.destinationAccount.name}`
                                : ""}
                            </dd>
                          </div>
                          <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-3.5">
                            <dt className="text-muted-foreground">Kategori</dt>
                            <dd className="break-words text-right font-medium">
                              {transaction.category?.name ?? "Tanpa kategori"}
                            </dd>
                          </div>
                          {access.workspaceType === "shared" && (
                            <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-3.5">
                              <dt className="text-muted-foreground">
                                Dicatat oleh
                              </dt>
                              <dd className="break-words text-right font-medium">
                                {transaction.creator.user.displayName ??
                                  transaction.creator.user.email ??
                                  "Anggota"}
                              </dd>
                            </div>
                          )}
                        </dl>
                        {transaction.note && (
                          <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                              Catatan
                            </p>
                            <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">
                              {transaction.note}
                            </p>
                          </div>
                        )}
                      </div>
                    </TransactionActions>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-col gap-4 border-t bg-muted/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <TransactionPageSizeControl
              workspaceId={access.workspaceId}
              pageSize={transactionPage.pageSize}
              search={pagination.search}
              dateFrom={pagination.dateFrom}
              dateTo={pagination.dateTo}
            />

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {transactionPage.from}-{transactionPage.to} dari{" "}
                {transactionPage.totalCount} | Halaman {transactionPage.page}{" "}
                dari {transactionPage.totalPages}
              </span>
              {transactionPage.page > 1 ? (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                >
                  <Link
                    href={transactionPageHref(
                      access.workspaceId,
                      transactionPage.page - 1,
                      transactionPage.pageSize,
                      pagination,
                    )}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Sebelumnya</span>
                  </Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  disabled
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Sebelumnya</span>
                </Button>
              )}
              {transactionPage.page < transactionPage.totalPages ? (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                >
                  <Link
                    href={transactionPageHref(
                      access.workspaceId,
                      transactionPage.page + 1,
                      transactionPage.pageSize,
                      pagination,
                    )}
                  >
                    <span className="hidden sm:inline">Berikutnya</span>
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  disabled
                >
                  <span className="hidden sm:inline">Berikutnya</span>
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      {access.role !== "viewer" && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4 text-sm shadow-sm sm:px-5">
          <span className="mr-auto text-muted-foreground">
            Catat lebih praktis lewat Telegram atau Back Tap iPhone.
          </span>
          <AutomationGuideDialog
            kind="telegram"
            workspaceId={access.workspaceId}
            triggerLabel="Panduan Telegram"
          />
          <AutomationGuideDialog
            kind="iphone"
            workspaceId={access.workspaceId}
            triggerLabel="Panduan iPhone"
          />
        </div>
      )}
    </div>
  );
}
