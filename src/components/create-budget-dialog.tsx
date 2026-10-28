"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarRange, ChartPie, LoaderCircle, Plus, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { createBudgetAction } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";
import { RupiahInput } from "@/components/ui/rupiah-input";

type CategoryOption = { id: string; name: string };

function CreateBudgetSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="min-h-11 flex-1 rounded-xl sm:flex-none sm:min-w-40"
      disabled={pending}
    >
      {pending && (
        <LoaderCircle
          className="size-4 motion-safe:animate-spin"
          aria-hidden="true"
        />
      )}
      {pending ? "Menyimpan…" : "Simpan budget"}
    </Button>
  );
}

export function CreateBudgetDialog({
  workspaceId,
  period,
  categories,
}: {
  workspaceId: string;
  period: string;
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState(false);
  const hasCategories = categories.length > 0;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button
          type="button"
          className="min-h-11 w-full rounded-xl px-5 sm:w-auto"
        >
          <Plus className="size-4.5" aria-hidden="true" />
          Buat budget
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
        <DialogPrimitive.Content className="budget-v2-dialog fixed inset-x-0 bottom-0 z-50 max-h-[94dvh] overflow-y-auto rounded-t-3xl border bg-card shadow-2xl data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95">
          <div className="border-b px-5 py-5 pr-16 sm:px-7 sm:py-6">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <ChartPie className="size-5" aria-hidden="true" />
              </span>
              <div>
                <DialogPrimitive.Title className="text-xl font-semibold tracking-[-0.02em]">
                  Buat budget baru
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Tetapkan limit pengeluaran untuk satu kategori pada periode
                  aktif.
                </DialogPrimitive.Description>
              </div>
            </div>
          </div>

          <form
            action={createBudgetAction}
            className="space-y-5 px-5 py-6 sm:px-7"
            aria-label="Form buat budget"
          >
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <div className="flex items-center gap-3 rounded-2xl border bg-muted/35 p-4">
              <CalendarRange
                className="size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  Periode aktif
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold">
                  {period}
                </p>
              </div>
            </div>

            {hasCategories ? (
              <>
                <label className="block text-sm font-semibold">
                  Kategori pengeluaran
                  <select
                    name="categoryId"
                    required
                    defaultValue=""
                    autoFocus
                    aria-describedby="budget-category-help"
                    className="mt-2 min-h-12 w-full rounded-xl border bg-background px-3 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
                  >
                    <option value="" disabled>
                      Pilih kategori
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <span
                    id="budget-category-help"
                    className="mt-1.5 block text-xs font-normal text-muted-foreground"
                  >
                    Hanya kategori pengeluaran aktif yang belum memiliki budget.
                  </span>
                </label>
                <label className="block text-sm font-semibold">
                  Limit budget
                  <RupiahInput
                    name="limitAmount"
                    required
                    aria-label="Limit budget dalam rupiah"
                    className="mt-2 min-h-12 w-full rounded-xl border bg-background px-3 shadow-xs"
                  />
                </label>
                <p className="rounded-2xl border border-primary/20 bg-primary/7 p-4 text-sm leading-relaxed text-muted-foreground">
                  Budget membantu memantau pengeluaran. Limit tidak memindahkan
                  saldo dan tidak membatasi transaksi.
                </p>
                <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
                  <DialogPrimitive.Close asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 rounded-xl sm:min-w-28"
                    >
                      Batal
                    </Button>
                  </DialogPrimitive.Close>
                  <CreateBudgetSubmit />
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-center">
                <p className="font-semibold">
                  Semua kategori sudah memiliki budget
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ubah budget yang tersedia atau tambahkan kategori pengeluaran
                  baru terlebih dahulu.
                </p>
                <DialogPrimitive.Close asChild>
                  <Button type="button" variant="outline" className="mt-5">
                    Tutup
                  </Button>
                </DialogPrimitive.Close>
              </div>
            )}
          </form>

          <DialogPrimitive.Close
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Tutup dialog buat budget"
          >
            <X className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
