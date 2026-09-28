import { randomUUID } from "node:crypto";
import Link from "next/link";
import { ArrowDown, ArrowLeftRight, ArrowUp, ReceiptText } from "lucide-react";
import { listAccounts } from "@/modules/accounts/service";
import { listCategories } from "@/modules/categories/service";
import { listTransactions } from "@/modules/transactions/service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionForm } from "@/components/transaction-form";
import { DeleteTransactionButton } from "@/components/delete-transaction-button";
import { ReceiptScanPanel } from "@/components/receipt-scan-panel";
import type { WorkspaceAccess } from "@/modules/workspaces/service";
import { sectionHref } from "@/lib/navigation";

const messages: Record<string, string> = {
  "transaction-invalid": "Periksa jenis, nominal, tanggal, akun, dan kategori.",
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

export async function TransactionsSection({
  access,
  error,
  success,
}: {
  access: WorkspaceAccess;
  error?: string;
  success?: string;
}) {
  const [allAccounts, allCategories, transactions] = await Promise.all([
    listAccounts(access.workspaceId),
    listCategories(access.workspaceId),
    listTransactions(access.workspaceId),
  ]);
  const accounts = allAccounts
    .filter((account) => !account.archivedAt)
    .map(({ id, name }) => ({ id, name }));
  const categories = allCategories
    .filter(
      (
        category,
      ): category is typeof category & { type: "income" | "expense" } =>
        !category.archivedAt &&
        (category.type === "income" || category.type === "expense"),
    )
    .map(({ id, name, type }) => ({ id, name, type }));
  const status = error ?? success;

  return (
    <div className="space-y-5">
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
        <ReceiptScanPanel
          workspaceId={access.workspaceId}
          accounts={accounts}
          categories={categories
            .filter((category) => category.type === "expense")
            .map(({ id, name }) => ({ id, name }))}
        />
      )}
      {access.role !== "viewer" && (
        <Card className="shadow-none">
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
              />
            )}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Riwayat transaksi</CardTitle>
          <p className="text-sm text-muted-foreground">
            Menampilkan hingga 100 transaksi terbaru dalam ruang ini.
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
                            <p className="font-medium">
                              {transaction.note ||
                                transaction.category?.name ||
                                detail.label}
                            </p>
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
        </CardContent>
      </Card>
    </div>
  );
}
