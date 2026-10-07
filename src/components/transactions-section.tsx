import { randomUUID } from "node:crypto";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Camera,
  Plus,
  ReceiptText,
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
import { ReceiptScanPanel } from "@/components/receipt-scan-panel";
import { RecurringTransactionsSection } from "@/components/recurring-transactions-section";
import { TransactionViewTabs } from "@/components/transaction-view-tabs";
import { Button } from "@/components/ui/button";
import type { WorkspaceAccess } from "@/modules/workspaces/service";
import { sectionHref } from "@/lib/navigation";
import { buildTransactionSuggestions } from "@/modules/transactions/suggestions";
import type { TransactionPagination } from "@/modules/transactions/pagination";
import { TransactionPageSizeControl } from "@/components/transaction-page-size-control";

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
  income: { label: "Pemasukan", icon: ArrowDown, sign: "+" },
  expense: { label: "Pengeluaran", icon: ArrowUp, sign: "−" },
  transfer: { label: "Transfer", icon: ArrowLeftRight, sign: "" },
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
) {
  const query = new URLSearchParams({
    workspaceId,
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  return `/transactions?${query.toString()}`;
}

export async function TransactionsSection({
  access,
  today,
  error,
  success,
  view = "history",
  pagination,
}: {
  access: WorkspaceAccess;
  today: Date;
  error?: string;
  success?: string;
  view?: "history" | "reminders";
  pagination: TransactionPagination;
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

  const [accounts, categories, transactionPage, suggestionSource] =
    await Promise.all([
      listActiveAccountOptions(access.workspaceId),
      listActiveCategoryOptions(access.workspaceId),
      listTransactionPage(access.workspaceId, pagination),
      listRecentTransactionsForSuggestions(access.workspaceId),
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
          <Button asChild size="lg" variant="outline" className="min-h-12">
            <Link href="#tambah-transaksi">
              <Plus className="size-5" />
              Tambah transaksi
            </Link>
          </Button>
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
          />
        </section>
      )}
      {access.role !== "viewer" && (
        <Card id="tambah-transaksi" className="scroll-mt-5 shadow-none">
          <CardHeader>
            <CardTitle>Tambah transaksi</CardTitle>
            <p className="text-sm text-muted-foreground">
              Transfer memindahkan dana antar-akun dan tidak dihitung sebagai
              pemasukan atau pengeluaran.
            </p>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="rounded-lg bg-muted p-4 text-sm">
                {access.role === "owner" ? (
                  <p>
                    Ruang ini belum memiliki akun aktif. Tambahkan akun melalui{" "}
                    <Link
                      href={sectionHref("accounts", access.workspaceId)}
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      halaman Akun
                    </Link>{" "}
                    agar transaksi dapat dicatat.
                  </p>
                ) : (
                  <p>
                    Ruang ini belum memiliki akun aktif. Minta Owner membuat
                    akun ruang bersama terlebih dahulu; setelah itu Editor dapat
                    langsung menambahkan transaksi.
                  </p>
                )}
              </div>
            ) : (
              <TransactionForm
                workspaceId={access.workspaceId}
                accounts={accounts}
                categories={categories}
                idempotencyKey={randomUUID()}
                defaultDate={localToday(access.timezone)}
                suggestions={suggestions}
              />
            )}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Riwayat transaksi</CardTitle>
          <p className="text-sm text-muted-foreground">
            Urutan terbaru berdasarkan tanggal transaksi.
          </p>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <ReceiptText
                className="mb-3 size-7 text-primary"
                aria-hidden="true"
              />
              <p className="font-medium">Belum ada transaksi</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Transaksi pertama akan muncul di sini setelah disimpan.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {transactions.map((transaction) => {
                const detail = typeDetails[transaction.type];
                const Icon = detail.icon;
                const canMutate =
                  access.role === "owner" ||
                  (access.role === "editor" &&
                    transaction.createdBy === access.actorId);
                return (
                  <li
                    key={transaction.id}
                    className="py-5 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{transaction.title}</p>
                            <Badge variant="outline">{detail.label}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
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
                            <p className="mt-1 text-xs text-muted-foreground">
                              {transaction.note}
                            </p>
                          )}
                        </div>
                      </div>
                      <p
                        className={`font-semibold ${transaction.type === "expense" ? "text-destructive" : transaction.type === "income" ? "text-primary" : ""}`}
                      >
                        {detail.sign}
                        {rupiah(transaction.amount)}
                      </p>
                    </div>
                    {canMutate && (
                      <details className="mt-4 rounded-lg border p-3 text-sm">
                        <summary className="cursor-pointer font-medium">
                          Ubah atau hapus
                        </summary>
                        <div className="mt-4 space-y-3">
                          <TransactionForm
                            workspaceId={access.workspaceId}
                            compact
                            accounts={accounts}
                            categories={categories}
                            defaultDate={localToday(access.timezone)}
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
                          <DeleteTransactionButton
                            workspaceId={access.workspaceId}
                            id={transaction.id}
                            version={transaction.version}
                          />
                        </div>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-5 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <TransactionPageSizeControl
              workspaceId={access.workspaceId}
              pageSize={transactionPage.pageSize}
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
