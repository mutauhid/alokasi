"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  Info,
  Scale,
} from "lucide-react";
import { accountKinds, type AccountKind } from "@/components/account-v2-panels";
import { SensitiveAmount } from "@/components/amount-privacy";
import { ReconciliationForm } from "@/components/reconciliation-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type ReconciliationHistoryItem = {
  id: string;
  dateLabel: string;
  recordedBalanceLabel: string;
  actualBalanceLabel: string;
  differenceLabel: string;
  differenceIsZero: boolean;
  adjustmentLabel: string | null;
  note: string | null;
  creatorLabel: string;
  statusLabel: string;
  needsReview: boolean;
};

export function ReconciliationSheet({
  workspaceId,
  account,
  selectedDate,
  selectedDateLabel,
  today,
  recordedBalance,
  recordedBalanceLabel,
  canReconcile,
  idempotencyKey,
  history,
}: {
  workspaceId: string;
  account: {
    id: string;
    name: string;
    type: AccountKind;
    openingDate: string;
    archived: boolean;
  };
  selectedDate: string;
  selectedDateLabel: string;
  today: string;
  recordedBalance: string | null;
  recordedBalanceLabel: string | null;
  canReconcile: boolean;
  idempotencyKey: string;
  history: ReconciliationHistoryItem[];
}) {
  const router = useRouter();
  const [dateDirty, setDateDirty] = useState(false);
  const detail = accountKinds[account.type];
  const Icon = detail.icon;
  const closeHref = `/accounts?workspaceId=${encodeURIComponent(workspaceId)}`;

  return (
    <Sheet
      defaultOpen
      onOpenChange={(open) => {
        if (!open) router.replace(closeHref);
      }}
    >
      <SheetContent
        side="responsive"
        closeLabel="Tutup cocokkan saldo"
        className="accounts-v2-sheet gap-0 overflow-y-auto overscroll-contain bg-card p-0 pb-[max(5.75rem,env(safe-area-inset-bottom))] md:max-w-[36rem] md:pb-6"
      >
        <SheetHeader className="sticky top-0 z-10 border-b bg-card/95 px-5 py-5 pr-16 backdrop-blur-xl sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Scale className="size-5" aria-hidden="true" />
            </span>
            <div>
              <SheetTitle className="text-xl tracking-[-0.02em]">
                Cocokkan saldo
              </SheetTitle>
              <SheetDescription className="mt-1">
                Bandingkan saldo menurut Alokasi dengan saldo aktual rekening.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="space-y-5 p-4 sm:p-6">
          <section className="flex items-center gap-3 rounded-2xl border bg-secondary/20 p-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{account.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {detail.label} · Saldo dihitung untuk tanggal pilihan
              </p>
            </div>
          </section>
          <div className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/[0.07] p-4 text-sm leading-relaxed">
            <Info
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <p>Tidak ada perubahan saldo sebelum kamu mengonfirmasi.</p>
          </div>

          <form
            action="/accounts"
            method="get"
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
          >
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="reconcileAccountId" value={account.id} />
            <label className="text-sm font-semibold">
              Tanggal pengecekan
              <input
                type="date"
                name="reconcileDate"
                min={account.openingDate}
                max={today}
                defaultValue={selectedDate}
                onChange={() => setDateDirty(true)}
                className="mt-2 min-h-11 w-full rounded-xl border bg-background px-3 outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
            </label>
            <Button
              type="submit"
              variant="outline"
              className="min-h-11 rounded-xl"
            >
              <CalendarCheck2 className="size-4" aria-hidden="true" />
              Hitung saldo
            </Button>
          </form>

          {dateDirty ? (
            <div className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4 text-sm">
              <AlertTriangle
                className="size-5 shrink-0 text-amber-600 dark:text-amber-300"
                aria-hidden="true"
              />
              <p>
                Tanggal berubah. Pilih <strong>Hitung saldo</strong> agar hasil
                sesuai tanggal baru sebelum melanjutkan.
              </p>
            </div>
          ) : recordedBalance === null ? (
            <p className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
              Pilih tanggal yang sama dengan atau setelah tanggal mulai akun.
            </p>
          ) : (
            <>
              <section className="rounded-2xl border p-4 sm:p-5">
                <p className="text-xs font-medium text-muted-foreground">
                  Saldo menurut Alokasi · {selectedDateLabel}
                </p>
                <SensitiveAmount className="mt-2 block break-words text-2xl font-semibold tracking-[-0.035em]">
                  {recordedBalanceLabel}
                </SensitiveAmount>
              </section>
              {canReconcile && !account.archived ? (
                <ReconciliationForm
                  workspaceId={workspaceId}
                  accountId={account.id}
                  reconciliationDate={selectedDate}
                  recordedBalance={recordedBalance}
                  idempotencyKey={idempotencyKey}
                />
              ) : (
                <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  Rekonsiliasi baru hanya tersedia bagi Owner atau Editor pada
                  akun aktif.
                </p>
              )}
            </>
          )}

          <section className="border-t pt-5">
            <h3 className="flex items-center gap-2 font-semibold">
              <CalendarCheck2
                className="size-4 text-primary"
                aria-hidden="true"
              />
              Riwayat rekonsiliasi
            </h3>
            {history.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed p-6 text-center">
                <p className="text-sm font-medium">
                  Tidak ada riwayat rekonsiliasi untuk akun ini.
                </p>
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {history.map((item) => (
                  <li key={item.id} className="rounded-2xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold">
                        {item.dateLabel}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          item.needsReview
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "border-primary/25 bg-primary/10 text-primary",
                        )}
                      >
                        {item.needsReview ? (
                          <AlertTriangle
                            className="size-3"
                            aria-hidden="true"
                          />
                        ) : (
                          <CheckCircle2 className="size-3" aria-hidden="true" />
                        )}
                        {item.statusLabel}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <p>
                        Menurut Alokasi
                        <SensitiveAmount className="mt-1 block font-semibold text-foreground">
                          {item.recordedBalanceLabel}
                        </SensitiveAmount>
                      </p>
                      <p>
                        Aktual
                        <SensitiveAmount className="mt-1 block font-semibold text-foreground">
                          {item.actualBalanceLabel}
                        </SensitiveAmount>
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
                      <span className="text-muted-foreground">
                        Oleh {item.creatorLabel}
                      </span>
                      <SensitiveAmount
                        className={cn(
                          "font-semibold",
                          !item.differenceIsZero && "text-destructive",
                        )}
                      >
                        Selisih {item.differenceLabel}
                      </SensitiveAmount>
                    </div>
                    {item.note && (
                      <p className="mt-2 break-words text-xs text-muted-foreground">
                        {item.note}
                      </p>
                    )}
                    {item.adjustmentLabel && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Penyesuaian{" "}
                        <SensitiveAmount>
                          {item.adjustmentLabel}
                        </SensitiveAmount>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
