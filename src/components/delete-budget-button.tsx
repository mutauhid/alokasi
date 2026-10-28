"use client";

import { Trash2 } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { deleteBudgetAction } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";

export function DeleteBudgetButton({
  workspaceId,
  id,
  version,
  iconOnly = false,
}: {
  workspaceId: string;
  id: string;
  version: number;
  iconOnly?: boolean;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          size={iconOnly ? "icon" : "default"}
          className={`${iconOnly ? "size-11 rounded-xl" : "w-full"} border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive`}
          aria-label={iconOnly ? "Hapus budget" : undefined}
          title={iconOnly ? "Hapus budget" : undefined}
        >
          <Trash2 aria-hidden="true" />
          {!iconOnly && "Hapus budget"}
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[61] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-5 shadow-2xl data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 sm:p-6">
          <DialogPrimitive.Title className="text-lg font-semibold">
            Hapus budget?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Limit kategori akan dihapus. Transaksi dan nilai realisasinya tetap
            tersimpan.
          </DialogPrimitive.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="outline">
                Batal
              </Button>
            </DialogPrimitive.Close>
            <form action={deleteBudgetAction}>
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="version" value={version} />
              <Button type="submit" variant="destructive" className="w-full">
                <Trash2 aria-hidden="true" />
                Ya, hapus budget
              </Button>
            </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
