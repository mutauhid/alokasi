"use client";

import { deleteBudgetAction } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";

export function DeleteBudgetButton({
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
      action={deleteBudgetAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Hapus budget ini? Transaksi dan realisasi tidak akan dihapus.",
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
        Hapus budget
      </Button>
    </form>
  );
}
