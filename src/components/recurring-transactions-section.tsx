import { listActiveAccountOptions } from "@/modules/accounts/service";
import { listActiveCategoryOptions } from "@/modules/categories/service";
import { listRecurringTemplates } from "@/modules/recurring/service";
import type { WorkspaceAccess } from "@/modules/workspaces/service";
import { RecurringTransactionsPanel } from "@/components/recurring-transactions-panel";
import { TransactionViewTabs } from "@/components/transaction-view-tabs";

const messages: Record<string, string> = {
  "recurring-invalid": "Periksa nama, nominal, akun, kategori, dan tanggal.",
  "recurring-access": "Peranmu tidak dapat mengubah template ini.",
  "recurring-account": "Akun template tidak tersedia atau sudah diarsipkan.",
  "recurring-before-account": "Jadwal transaksi mendahului tanggal mulai akun.",
  "recurring-category": "Kategori template tidak sesuai atau sudah diarsipkan.",
  "recurring-conflict":
    "Template atau jadwalnya sudah berubah. Muat ulang lalu coba kembali.",
  "recurring-not-due": "Pengingat ini belum jatuh tempo.",
  "recurring-failed": "Template transaksi berulang belum dapat disimpan.",
  "recurring-created": "Pengingat transaksi berulang berhasil dibuat.",
  "recurring-updated": "Template transaksi berulang berhasil diperbarui.",
  "recurring-archived": "Template transaksi berulang dinonaktifkan.",
  "recurring-posted":
    "Transaksi jatuh tempo berhasil dicatat dan pengingat dimajukan.",
  "recurring-skipped":
    "Periode dilewati tanpa membuat transaksi dan pengingat dimajukan.",
};

export async function RecurringTransactionsSection({
  access,
  today,
  error,
  success,
}: {
  access: WorkspaceAccess;
  today: Date;
  error?: string;
  success?: string;
}) {
  const [accounts, categories, templates] = await Promise.all([
    listActiveAccountOptions(access.workspaceId),
    listActiveCategoryOptions(access.workspaceId),
    listRecurringTemplates(access.workspaceId),
  ]);
  const status = error ?? success;

  return (
    <div className="space-y-5">
      <TransactionViewTabs
        workspaceId={access.workspaceId}
        current="reminders"
      />
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
      <RecurringTransactionsPanel
        access={access}
        today={today}
        accounts={accounts}
        categories={categories}
        templates={templates}
      />
    </div>
  );
}
