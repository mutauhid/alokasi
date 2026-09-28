"use client";

import { deleteTransactionAction } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";

export function DeleteTransactionButton({
  workspaceId,
  id,
  version,
}: {
  workspaceId: string;
  id: string;
  version: number;
}) {
  return (
    <form
      action={deleteTransactionAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Hapus transaksi ini? Saldo dan laporan akan diperbarui.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <Button type="submit" variant="outline" className="w-full">
        Hapus transaksi
      </Button>
    </form>
  );
}
