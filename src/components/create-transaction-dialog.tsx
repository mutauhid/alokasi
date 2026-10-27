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
        <Button type="button" size="lg" className="min-h-12">
          <Plus className="size-5" aria-hidden="true" />
          Tambah transaksi
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border bg-card p-5 shadow-2xl data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 sm:p-7">
          <div className="mb-6 pr-12">
            <DialogPrimitive.Title className="text-xl font-semibold">
              Tambah transaksi
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="m-4 text-sm text-muted-foreground">
              Catat pemasukan, pengeluaran, atau transfer tanpa meninggalkan
              halaman riwayat.
            </DialogPrimitive.Description>
          </div>
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
            />
          )}
          <DialogPrimitive.Close
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Tutup tambah transaksi"
          >
            <X className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
