import { CalendarClock, Check, FastForward, Repeat2 } from "lucide-react";
import {
  postRecurringOccurrenceAction,
  skipRecurringOccurrenceAction,
} from "@/app/(workspace)/actions";
import { RecurringTemplateForm } from "@/components/recurring-template-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calendarDayDifference } from "@/modules/recurring/domain";
import type { listRecurringTemplates } from "@/modules/recurring/service";
import type { WorkspaceAccess } from "@/modules/workspaces/service";
import { SensitiveAmount } from "@/components/amount-privacy";
import { TransactionActions } from "@/components/transaction-actions";
import { ArchiveRecurringTemplateButton } from "@/components/archive-recurring-template-button";

type Template = Awaited<ReturnType<typeof listRecurringTemplates>>[number];
type Option = { id: string; name: string };
type CategoryOption = Option & { type: "income" | "expense" };

function rupiah(value: bigint) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function displayDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function dueLabel(today: Date, dueDate: Date) {
  const difference = calendarDayDifference(today, dueDate);
  if (difference < 0) return `Terlambat ${Math.abs(difference)} hari`;
  if (difference === 0) return "Jatuh tempo hari ini";
  if (difference === 1) return "Jatuh tempo besok";
  return `Jatuh tempo dalam ${difference} hari`;
}

function MutationIdentity({ template }: { template: Template }) {
  return (
    <>
      <input type="hidden" name="id" value={template.id} />
      <input type="hidden" name="version" value={template.version} />
      <input type="hidden" name="workspaceId" value={template.workspaceId} />
    </>
  );
}

export function RecurringTransactionsPanel({
  access,
  today,
  accounts,
  categories,
  templates,
}: {
  access: WorkspaceAccess;
  today: Date;
  accounts: Option[];
  categories: CategoryOption[];
  templates: Template[];
}) {
  const canWrite = access.role !== "viewer";

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Transaksi berulang</CardTitle>
          <Badge variant="secondary">Pengingat bulanan</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Template tidak mengubah saldo atau budget. Transaksi baru dibuat
          setelah kamu menekan Catat sekarang.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {canWrite && (
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="mb-4 text-sm font-medium">Buat template</p>
            {accounts.length === 0 || categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Template memerlukan akun aktif dan kategori pemasukan atau
                pengeluaran yang sesuai.
              </p>
            ) : (
              <RecurringTemplateForm
                workspaceId={access.workspaceId}
                accounts={accounts}
                categories={categories}
              />
            )}
          </div>
        )}

        {templates.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Repeat2 className="mb-3 size-7 text-primary" aria-hidden="true" />
            <p className="font-medium">Belum ada transaksi berulang</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Buat pengingat untuk gaji, sewa, tagihan, atau langganan bulanan.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {templates.map((template) => {
              const difference = calendarDayDifference(
                today,
                template.nextDueDate,
              );
              const isDue = difference <= 0;
              const canMutate =
                access.role === "owner" ||
                (access.role === "editor" &&
                  template.createdBy === access.actorId);
              return (
                <li key={template.id} className="py-2 first:pt-0 last:pb-0">
                  <TransactionActions
                    title={template.name}
                    heading="Detail pengingat"
                    trigger={
                      <button
                        type="button"
                        className="group grid w-full cursor-pointer grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-accent/55 active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label={`Lihat detail pengingat ${template.name}`}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                          <CalendarClock
                            className="size-5"
                            aria-hidden="true"
                          />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {template.name}
                          </p>
                          <p
                            className={`mt-1 truncate text-xs font-medium ${isDue ? "text-destructive" : "text-muted-foreground"}`}
                          >
                            {dueLabel(today, template.nextDueDate)}
                          </p>
                          <p className="mt-1.5 truncate text-xs text-muted-foreground">
                            {template.account.name} · {template.category.name} ·
                            setiap tanggal {template.recurrenceDay} · berikutnya{" "}
                            {displayDate(template.nextDueDate)}
                            {access.workspaceType === "shared"
                              ? ` · dibuat ${template.creator.user.displayName ?? template.creator.user.email ?? "anggota"}`
                              : ""}
                          </p>
                        </div>
                        <p
                          className={`whitespace-nowrap pt-0.5 text-right text-sm font-semibold ${template.type === "expense" ? "text-destructive" : "text-primary"}`}
                        >
                          {template.type === "expense" ? "−" : "+"}
                          <SensitiveAmount>
                            {rupiah(template.amount)}
                          </SensitiveAmount>
                        </p>
                      </button>
                    }
                    editHeading="Ubah pengingat"
                    editLabel="Ubah pengingat"
                    editContent={
                      canMutate ? (
                        <RecurringTemplateForm
                          compact
                          workspaceId={access.workspaceId}
                          accounts={accounts}
                          categories={categories}
                          initial={{
                            id: template.id,
                            version: template.version,
                            name: template.name,
                            type: template.type as "income" | "expense",
                            amount: template.amount.toString(),
                            accountId: template.accountId,
                            categoryId: template.categoryId,
                            note: template.note ?? "",
                            recurrenceDay: template.recurrenceDay,
                          }}
                        />
                      ) : undefined
                    }
                    deleteAction={
                      canMutate ? (
                        <ArchiveRecurringTemplateButton
                          workspaceId={access.workspaceId}
                          id={template.id}
                          version={template.version}
                          name={template.name}
                        />
                      ) : undefined
                    }
                  >
                    <div className="grid gap-3 rounded-xl border bg-muted/25 p-4 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge
                          variant={isDue ? "destructive" : "outline"}
                          className="mt-1.5"
                        >
                          {dueLabel(today, template.nextDueDate)}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Jenis</p>
                        <p className="mt-1.5 font-medium">
                          {template.type === "income"
                            ? "Pemasukan"
                            : "Pengeluaran"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Nominal</p>
                        <p
                          className={`mt-1.5 font-semibold ${template.type === "expense" ? "text-destructive" : "text-primary"}`}
                        >
                          {template.type === "expense" ? "−" : "+"}
                          <SensitiveAmount>
                            {rupiah(template.amount)}
                          </SensitiveAmount>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Jadwal berikutnya
                        </p>
                        <p className="mt-1.5 font-medium">
                          {displayDate(template.nextDueDate)} · tanggal{" "}
                          {template.recurrenceDay} setiap bulan
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Akun</p>
                        <p className="mt-1.5 font-medium">
                          {template.account.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Kategori
                        </p>
                        <p className="mt-1.5 font-medium">
                          {template.category.name}
                        </p>
                      </div>
                      {access.workspaceType === "shared" && (
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Dibuat oleh
                          </p>
                          <p className="mt-1.5 break-words font-medium">
                            {template.creator.user.displayName ??
                              template.creator.user.email ??
                              "Anggota"}
                          </p>
                        </div>
                      )}
                      {template.note && (
                        <div className="sm:col-span-2">
                          <p className="text-xs text-muted-foreground">
                            Catatan
                          </p>
                          <p className="mt-1.5 whitespace-pre-wrap break-words">
                            {template.note}
                          </p>
                        </div>
                      )}
                    </div>

                    {canMutate && isDue && (
                      <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:flex-wrap">
                        <form action={postRecurringOccurrenceAction}>
                          <MutationIdentity template={template} />
                          <Button type="submit" className="w-full sm:w-auto">
                            <Check className="size-4" />
                            Catat sekarang
                          </Button>
                        </form>
                        <form action={skipRecurringOccurrenceAction}>
                          <MutationIdentity template={template} />
                          <Button
                            type="submit"
                            variant="outline"
                            className="w-full sm:w-auto"
                          >
                            <FastForward className="size-4" />
                            Lewati periode
                          </Button>
                        </form>
                      </div>
                    )}
                  </TransactionActions>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
