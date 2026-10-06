import { FileSpreadsheet, History } from "lucide-react";
import { listActiveAccountOptions } from "@/modules/accounts/service";
import { listActiveCategoryOptions } from "@/modules/categories/service";
import { listTransactionImportBatches } from "@/modules/imports/service";
import type { WorkspaceAccess } from "@/modules/workspaces/service";
import { TransactionViewTabs } from "@/components/transaction-view-tabs";
import { CsvImportWizard } from "@/components/csv-import-wizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const messages: Record<string, string> = {
  "import-created":
    "Batch CSV selesai diproses. Ringkasannya tersedia di bawah.",
  "import-invalid":
    "Data impor tidak valid. Buat pratinjau baru lalu coba kembali.",
  "import-account": "Akun tujuan tidak tersedia atau sudah diarsipkan.",
  "import-category":
    "Kategori impor tidak tersedia atau jenisnya tidak sesuai.",
  "import-selection": "Pilih setidaknya satu baris yang valid.",
  "import-date": "Tanggal transaksi tidak valid untuk akun tujuan.",
  "import-idempotency": "Batch ini sudah digunakan dengan isi berbeda.",
  "import-conflict": "Data berubah saat impor. Buat pratinjau baru.",
  "import-failed": "Impor belum dapat diselesaikan.",
};

function displayDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(value);
}

export async function TransactionImportSection({
  access,
  error,
  success,
}: {
  access: WorkspaceAccess;
  error?: string;
  success?: string;
}) {
  const [accounts, categories, batches] = await Promise.all([
    listActiveAccountOptions(access.workspaceId),
    listActiveCategoryOptions(access.workspaceId),
    listTransactionImportBatches(access.workspaceId),
  ]);
  const status = error ?? success;
  const incomeCategories = categories.filter((item) => item.type === "income");
  const expenseCategories = categories.filter(
    (item) => item.type === "expense",
  );

  return (
    <div className="space-y-5">
      <TransactionViewTabs workspaceId={access.workspaceId} current="import" />
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

      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <FileSpreadsheet className="size-5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Impor transaksi dari CSV</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                File dibaca di perangkatmu. Alokasi hanya menerima baris yang
                sudah dipetakan untuk pratinjau dan tidak menyimpan file asli.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {access.role === "viewer" ? (
            <p className="rounded-lg bg-muted p-4 text-sm">
              Viewer dapat melihat histori batch, tetapi hanya Owner dan Editor
              yang dapat mengimpor transaksi.
            </p>
          ) : accounts.length === 0 ? (
            <p className="rounded-lg bg-muted p-4 text-sm">
              Tambahkan satu akun aktif sebelum mengimpor transaksi.
            </p>
          ) : incomeCategories.length === 0 &&
            expenseCategories.length === 0 ? (
            <p className="rounded-lg bg-muted p-4 text-sm">
              Tambahkan setidaknya satu kategori aktif sebelum mengimpor.
            </p>
          ) : (
            <CsvImportWizard
              workspaceId={access.workspaceId}
              accounts={accounts}
              incomeCategories={incomeCategories}
              expenseCategories={expenseCategories}
            />
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="size-5 text-primary" aria-hidden="true" />
            <CardTitle>Histori batch impor</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Maksimal 20 batch terakhir. Baris dilewati mencakup baris tidak
            valid, tidak dipilih, atau kandidat duplikat.
          </p>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada batch CSV dalam ruang ini.
            </p>
          ) : (
            <ul className="divide-y">
              {batches.map((batch) => (
                <li key={batch.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {batch.sourceFileName}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {batch.account.name} · {displayDate(batch.createdAt)} ·
                        oleh{" "}
                        {batch.creator.user.displayName ??
                          batch.creator.user.email ??
                          "anggota"}
                      </p>
                    </div>
                    <p className="text-sm">
                      <span className="font-semibold text-primary">
                        {batch.importedRowCount} diimpor
                      </span>
                      {` · ${batch.skippedRowCount} dilewati · ${batch.sourceRowCount} total`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
