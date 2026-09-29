import { CalendarClock, Check, FastForward, Repeat2 } from "lucide-react";
import {
  archiveRecurringTemplateAction,
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
                <li key={template.id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                        <CalendarClock className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{template.name}</p>
                          <Badge variant={isDue ? "destructive" : "outline"}>
                            {dueLabel(today, template.nextDueDate)}
                          </Badge>
                          <Badge variant="outline">
                            {template.type === "income"
                              ? "Pemasukan"
                              : "Pengeluaran"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {template.account.name} · {template.category.name} ·
                          setiap tanggal {template.recurrenceDay} · berikutnya{" "}
                          {displayDate(template.nextDueDate)}
                          {access.workspaceType === "shared"
                            ? ` · dibuat ${template.creator.user.displayName ?? template.creator.user.email ?? "anggota"}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`font-semibold ${template.type === "expense" ? "text-destructive" : "text-primary"}`}
                    >
                      {template.type === "expense" ? "−" : "+"}
                      {rupiah(template.amount)}
                    </p>
                  </div>

                  {canMutate && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {isDue && (
                        <>
                          <form action={postRecurringOccurrenceAction}>
                            <MutationIdentity template={template} />
                            <Button type="submit" size="sm">
                              <Check className="size-4" />
                              Catat sekarang
                            </Button>
                          </form>
                          <form action={skipRecurringOccurrenceAction}>
                            <MutationIdentity template={template} />
                            <Button type="submit" size="sm" variant="outline">
                              <FastForward className="size-4" />
                              Lewati periode
                            </Button>
                          </form>
                        </>
                      )}
                    </div>
                  )}

                  {canMutate && (
                    <details className="mt-4 rounded-lg border p-3 text-sm">
                      <summary className="cursor-pointer font-medium">
                        Ubah atau nonaktifkan
                      </summary>
                      <div className="mt-4 space-y-3">
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
                        <form action={archiveRecurringTemplateAction}>
                          <MutationIdentity template={template} />
                          <Button type="submit" variant="destructive" size="sm">
                            Nonaktifkan template
                          </Button>
                        </form>
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
  );
}
