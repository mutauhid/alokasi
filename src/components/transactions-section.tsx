import { randomUUID } from "node:crypto";
import Link from "next/link";
import { Camera, ReceiptText, Search, X } from "lucide-react";
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
  search: string,
) {
  const query = new URLSearchParams({
    workspaceId,
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  if (search) query.set("search", search);
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
}: {
  access: WorkspaceAccess;
  today: Date;
  error?: string;
  success?: string;
  view?: "history" | "reminders";
  pagination: TransactionPagination;
  openCreateTransaction?: boolean;
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

  return (
    <div className="space-y-5">
      <TransactionViewTabs workspaceId={access.workspaceId} current="history" />
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
        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild size="lg" className="min-h-12">
            <Link href="#scan-struk">
              <Camera className="size-5" />
              Scan struk
            </Link>
          </Button>
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
        </div>
      )}
      {access.role !== "viewer" && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 text-sm">
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
      {access.role !== "viewer" && (
        <section id="scan-struk" className="scroll-mt-5">
          <ReceiptScanPanel
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
        </section>
      )}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Riwayat transaksi</CardTitle>
          <p className="text-sm text-muted-foreground">
            Urutan terbaru berdasarkan tanggal transaksi.
          </p>
          <form
            action="/transactions"
            method="get"
            className="mt-3 flex flex-col gap-2 sm:flex-row"
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
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">
                Cari transaksi berdasarkan judul atau kategori
              </span>
              <Search
                className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                name="search"
                defaultValue={pagination.search}
                maxLength={100}
                placeholder="Cari judul atau kategori"
                className="min-h-10 w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm shadow-xs"
              />
            </label>
            <Button type="submit" variant="outline" className="min-h-10">
              Cari
            </Button>
            {pagination.search && (
              <Button asChild variant="ghost" className="min-h-10">
                <Link
                  href={transactionPageHref(
                    access.workspaceId,
                    1,
                    transactionPage.pageSize,
                    "",
                  )}
                >
                  <X aria-hidden="true" />
                  Hapus pencarian
                </Link>
              </Button>
            )}
          </form>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <ReceiptText
                className="mb-3 size-7 text-primary"
                aria-hidden="true"
              />
              <p className="font-medium">
                {pagination.search
                  ? "Transaksi tidak ditemukan"
                  : "Belum ada transaksi"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {pagination.search
                  ? `Tidak ada judul atau kategori yang cocok dengan “${pagination.search}”.`
                  : "Transaksi pertama akan muncul di sini setelah disimpan."}
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {transactions.map((transaction) => {
                const detail = typeDetails[transaction.type];
                const canMutate =
                  access.role === "owner" ||
                  (access.role === "editor" &&
                    transaction.createdBy === access.actorId);
                return (
                  <li
                    key={transaction.id}
                    className="py-2 first:pt-0 last:pb-0"
                  >
                    <TransactionActions
                      title={transaction.title}
                      heading="Detail transaksi"
                      trigger={
                        <button
                          type="button"
                          className="group grid w-full cursor-pointer grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-accent/55 active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          aria-label={`Lihat detail transaksi ${transaction.title}`}
                        >
                          <TransactionCategoryIcon
                            categoryName={transaction.category?.name ?? null}
                            type={transaction.type}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium leading-snug">
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
                              {access.workspaceType === "shared"
                                ? ` · dicatat ${transaction.creator.user.displayName ?? transaction.creator.user.email ?? "anggota"}`
                                : ""}
                            </p>
                            {transaction.note && (
                              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                {transaction.note}
                              </p>
                            )}
                          </div>
                          <p
                            className={`whitespace-nowrap pt-0.5 text-right text-sm font-semibold ${transaction.type === "expense" ? "text-destructive" : transaction.type === "income" ? "text-primary" : ""}`}
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
                            workspaceId={access.workspaceId}
                            id={transaction.id}
                            version={transaction.version}
                            iconOnly
                          />
                        ) : undefined
                      }
                    >
                      <div className="grid gap-3 rounded-xl border bg-muted/25 p-4 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Jenis</p>
                          <Badge variant="outline" className="mt-1.5">
                            {detail.label}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Nominal
                          </p>
                          <p
                            className={`mt-1.5 font-semibold ${transaction.type === "expense" ? "text-destructive" : transaction.type === "income" ? "text-primary" : ""}`}
                          >
                            {detail.sign}
                            <SensitiveAmount>
                              {rupiah(transaction.amount)}
                            </SensitiveAmount>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Tanggal
                          </p>
                          <p className="mt-1.5 font-medium">
                            {displayDate(transaction.transactionDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Akun</p>
                          <p className="mt-1.5 font-medium">
                            {transaction.account.name}
                            {transaction.destinationAccount
                              ? ` → ${transaction.destinationAccount.name}`
                              : ""}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Kategori
                          </p>
                          <p className="mt-1.5 font-medium">
                            {transaction.category?.name ?? "Tanpa kategori"}
                          </p>
                        </div>
                        {access.workspaceType === "shared" && (
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Dicatat oleh
                            </p>
                            <p className="mt-1.5 break-words font-medium">
                              {transaction.creator.user.displayName ??
                                transaction.creator.user.email ??
                                "Anggota"}
                            </p>
                          </div>
                        )}
                        {transaction.note && (
                          <div className="sm:col-span-2">
                            <p className="text-xs text-muted-foreground">
                              Catatan
                            </p>
                            <p className="mt-1.5 whitespace-pre-wrap break-words">
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
          <div className="mt-5 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <TransactionPageSizeControl
              workspaceId={access.workspaceId}
              pageSize={transactionPage.pageSize}
              search={pagination.search}
            />

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {transactionPage.from}-{transactionPage.to} dari{" "}
                {transactionPage.totalCount} | Halaman {transactionPage.page}{" "}
                dari {transactionPage.totalPages}
              </span>
              {transactionPage.page > 1 ? (
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={transactionPageHref(
                      access.workspaceId,
                      transactionPage.page - 1,
                      transactionPage.pageSize,
                      pagination.search,
                    )}
                  >
                    Sebelumnya
                  </Link>
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled>
                  Sebelumnya
                </Button>
              )}
              {transactionPage.page < transactionPage.totalPages ? (
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={transactionPageHref(
                      access.workspaceId,
                      transactionPage.page + 1,
                      transactionPage.pageSize,
                      pagination.search,
                    )}
                  >
                    Berikutnya
                  </Link>
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled>
                  Berikutnya
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
