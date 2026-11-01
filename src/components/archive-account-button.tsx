"use client";

import { useFormStatus } from "react-dom";
import { Archive, LoaderCircle } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { archiveAccountAction } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";

export function ArchiveAccountButton({
  workspaceId,
  id,
  version,
  name,
}: {
  workspaceId: string;
  id: string;
  version: number;
  name: string;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Archive aria-hidden="true" />
          Arsipkan akun
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[61] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-5 shadow-2xl data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 sm:p-6">
          <DialogPrimitive.Title className="text-lg font-semibold">
            Arsipkan {name}?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Akun tidak dapat dipakai untuk transaksi baru. Histori tetap
            tersimpan, dan saldo harus Rp0 sebelum akun dapat diarsipkan.
          </DialogPrimitive.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="outline">
                Batal
              </Button>
            </DialogPrimitive.Close>
            <form action={archiveAccountAction}>
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="version" value={version} />
              <ArchiveSubmit />
            </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ArchiveSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="destructive"
      disabled={pending}
      className="min-h-10 w-full rounded-xl"
    >
      {pending ? (
        <LoaderCircle
          className="size-4 motion-safe:animate-spin"
          aria-hidden="true"
        />
      ) : (
        <Archive aria-hidden="true" />
      )}
      {pending ? "Mengarsipkan…" : "Ya, arsipkan akun"}
    </Button>
  );
}
