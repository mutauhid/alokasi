"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarRange, Check, Copy, Info, LoaderCircle } from "lucide-react";
import { copyBudgetsAction } from "@/app/(workspace)/actions";
import { SensitiveAmount } from "@/components/amount-privacy";
import { TransactionCategoryIcon } from "@/components/transaction-category-icon";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type CopyItem = {
  categoryId: string;
  categoryName: string;
  limitAmount: string;
  eligible: boolean;
  reason: string | null;
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function CopySubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="min-h-11 flex-1 rounded-xl"
      disabled={disabled || pending}
    >
      {pending ? (
        <LoaderCircle
          className="size-4 motion-safe:animate-spin"
          aria-hidden="true"
        />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      {pending ? "Menyalin…" : "Salin budget"}
    </Button>
  );
}

export function CopyBudgetsSheet({
  workspaceId,
  sourcePeriodId,
  targetPeriodId,
  sourcePeriod,
  items,
}: {
  workspaceId: string;
  sourcePeriodId: string;
  targetPeriodId: string;
  sourcePeriod: string;
  items: CopyItem[];
}) {
  const eligibleIds = useMemo(
    () => items.filter((item) => item.eligible).map((item) => item.categoryId),
    [items],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(eligibleIds);
  const selected = new Set(selectedIds);
  const allSelected =
    eligibleIds.length > 0 && eligibleIds.every((id) => selected.has(id));
  const noEligibleItems = items.length > 0 && eligibleIds.length === 0;
  const selectedTotal = items.reduce(
    (sum, item) =>
      selected.has(item.categoryId) ? sum + BigInt(item.limitAmount) : sum,
    0n,
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full rounded-xl sm:w-auto"
        >
          <Copy className="size-4" aria-hidden="true" />
          Salin periode
        </Button>
      </SheetTrigger>
      <SheetContent
        side="responsive"
        closeLabel="Tutup salin budget"
        className="budget-v2-copy-sheet gap-0 overflow-hidden bg-card md:w-[34rem]"
      >
        <SheetHeader className="border-b px-5 pb-5 pt-6 pr-16 sm:px-7">
          <span className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Copy className="size-5" aria-hidden="true" />
          </span>
          <SheetTitle className="text-xl tracking-[-0.02em]">
            Salin budget periode lalu
          </SheetTitle>
          <SheetDescription className="leading-relaxed">
            Pilih budget yang ingin digunakan kembali. Budget yang sudah ada
            tidak akan ditimpa.
          </SheetDescription>
        </SheetHeader>

        <form
          action={copyBudgetsAction}
          className="flex min-h-0 flex-1 flex-col"
        >
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="sourcePeriodId" value={sourcePeriodId} />
          <input type="hidden" name="targetPeriodId" value={targetPeriodId} />

          <div className="budget-v2-copy-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-7">
            <div className="flex items-center gap-3 rounded-2xl border bg-muted/35 p-4">
              <CalendarRange
                className="size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Periode sumber
                </p>
                <p className="mt-0.5 text-sm font-semibold">{sourcePeriod}</p>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-center">
                <p className="font-semibold">Belum ada budget untuk disalin</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Periode sebelumnya tidak memiliki budget kategori yang dapat
                  digunakan sebagai sumber.
                </p>
              </div>
            ) : (
              <>
                {noEligibleItems && (
                  <div
                    role="status"
                    className="rounded-2xl border border-dashed bg-muted/25 p-4"
                  >
                    <p className="text-sm font-semibold">
                      Tidak ada kategori yang dapat disalin
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      Semua kategori dari periode sebelumnya sudah memiliki
                      budget pada periode aktif atau kategorinya telah
                      diarsipkan. Detail alasannya tetap ditampilkan di bawah.
                    </p>
                  </div>
                )}
                <label
                  className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-ring ${
                    noEligibleItems
                      ? "cursor-not-allowed bg-muted/25 opacity-65"
                      : "cursor-pointer hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    disabled={eligibleIds.length === 0}
                    onChange={(event) =>
                      setSelectedIds(event.target.checked ? eligibleIds : [])
                    }
                    className="size-4 accent-primary"
                  />
                  Pilih semua yang tersedia
                  <span className="ml-auto text-xs font-medium text-muted-foreground">
                    {eligibleIds.length} kategori
                  </span>
                </label>

                <ul
                  className="space-y-2"
                  aria-label="Budget yang dapat disalin"
                >
                  {items.map((item) => {
                    const checked = selected.has(item.categoryId);
                    return (
                      <li key={item.categoryId}>
                        <label
                          className={`flex min-h-20 items-center gap-3 rounded-2xl border p-3 transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring ${
                            item.eligible
                              ? "cursor-pointer hover:border-primary/35 hover:bg-primary/5"
                              : "cursor-not-allowed bg-muted/25 opacity-65"
                          } ${checked ? "border-primary/50 bg-primary/7" : ""}`}
                        >
                          <input
                            type="checkbox"
                            name="categoryIds"
                            value={item.categoryId}
                            checked={checked}
                            disabled={!item.eligible}
                            onChange={(event) => {
                              setSelectedIds((current) =>
                                event.target.checked
                                  ? [...current, item.categoryId]
                                  : current.filter(
                                      (id) => id !== item.categoryId,
                                    ),
                              );
                            }}
                            className="sr-only"
                          />
                          <TransactionCategoryIcon
                            categoryName={item.categoryName}
                            type="expense"
                            className="size-11 rounded-xl"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {item.categoryName}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {item.reason ?? "Siap disalin"}
                            </span>
                          </span>
                          <span className="max-w-[42%] shrink-0 text-right">
                            <span className="block text-sm font-semibold">
                              <SensitiveAmount className="break-all">
                                {currency.format(BigInt(item.limitAmount))}
                              </SensitiveAmount>
                            </span>
                            {checked && (
                              <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
                                <Check className="size-3" aria-hidden="true" />
                                Dipilih
                              </span>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            <p className="flex gap-2 rounded-xl bg-muted/45 p-3 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Kategori yang diarsipkan atau sudah memiliki budget pada periode
              aktif tidak dapat disalin.
            </p>
          </div>

          <SheetFooter className="border-t bg-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-7">
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">
                {noEligibleItems
                  ? "Tidak ada yang dapat disalin"
                  : `${selectedIds.length} kategori dipilih`}
              </span>
              <span className="font-semibold">
                <SensitiveAmount>
                  {currency.format(selectedTotal)}
                </SensitiveAmount>
              </span>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 flex-1 rounded-xl"
                >
                  Batal
                </Button>
              </SheetClose>
              <CopySubmit disabled={selectedIds.length === 0} />
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
