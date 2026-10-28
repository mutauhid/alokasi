"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { TransactionForm } from "@/components/transaction-form";
import type { TransactionSuggestion } from "@/modules/transactions/suggestions";

type Option = { id: string; name: string };
type CategoryOption = Option & { type: "income" | "expense" };

export function CreateTransactionDialog({
  workspaceId,
  accounts,
  categories,
  idempotencyKey,
  defaultDate,
  suggestions,
  defaultOpen = false,
  timeZone,
}: {
  workspaceId: string;
  accounts: Option[];
  categories: CategoryOption[];
  idempotencyKey: string;
  defaultDate: string;
  suggestions: TransactionSuggestion[];
  defaultOpen?: boolean;
  timeZone: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button
          type="button"
          size="lg"
          className="min-h-11 rounded-xl sm:min-w-48"
        >
          <Plus className="size-5" aria-hidden="true" />
          Tambah transaksi
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
        <DialogPrimitive.Content className="transaction-v2-dialog fixed inset-x-0 bottom-0 z-50 max-h-[94dvh] overflow-y-auto rounded-t-3xl border bg-card shadow-2xl data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-bottom-4 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-2rem)] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95">
          <div className="sticky top-0 z-10 border-b bg-card/95 px-5 py-5 pr-16 backdrop-blur sm:px-7 sm:py-6">
            <DialogPrimitive.Title className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
              Tambah transaksi
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-1.5 text-sm text-muted-foreground">
              Catat pemasukan, pengeluaran, atau transfer tanpa meninggalkan
              halaman riwayat.
            </DialogPrimitive.Description>
          </div>
          <div className="px-5 py-6 sm:px-7 sm:py-7">
            {accounts.length === 0 ? (
              <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                Tambahkan akun aktif terlebih dahulu sebelum mencatat transaksi.
              </p>
            ) : (
              <TransactionForm
                workspaceId={workspaceId}
                accounts={accounts}
                categories={categories}
                idempotencyKey={idempotencyKey}
                defaultDate={defaultDate}
                suggestions={suggestions}
                timeZone={timeZone}
                cancelAction={
                  <DialogPrimitive.Close asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-12 flex-1 rounded-xl sm:flex-none sm:min-w-32"
                    >
                      Batal
                    </Button>
                  </DialogPrimitive.Close>
                }
              />
            )}
          </div>
          <DialogPrimitive.Close
            className="absolute right-4 top-4 z-20 flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Tutup tambah transaksi"
          >
            <X className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
