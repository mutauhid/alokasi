"use client";

import { useActionState, useState } from "react";
import {
  createInvitationAction,
  type InvitationActionState,
} from "@/app/(workspace)/workspace-actions";
import { Button } from "@/components/ui/button";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-xs";

export function InvitationForm({ workspaceId }: { workspaceId: string }) {
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState<
    InvitationActionState,
    FormData
  >(createInvitationAction, {});
  return (
    <div className="space-y-3">
      <form
        action={action}
        className="grid gap-3 sm:grid-cols-[1fr_160px_auto]"
      >
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <label className="text-sm font-medium">
          Email terverifikasi
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium">
          Peran
          <select name="role" defaultValue="editor" className={inputClass}>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" disabled={pending} className="min-h-11 w-full">
            {pending ? "Membuat…" : "Buat undangan"}
          </Button>
        </div>
      </form>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.invitationPath && (
        <div className="rounded-lg bg-secondary p-3 text-sm">
          <p className="font-medium">Tautan undangan siap dibagikan</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">
            {state.invitationPath}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={async () => {
              await navigator.clipboard.writeText(
                new URL(
                  state.invitationPath!,
                  window.location.origin,
                ).toString(),
              );
              setCopied(true);
            }}
          >
            {copied ? "Tersalin" : "Salin tautan lengkap"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Pengiriman email otomatis belum dikonfigurasi. Bagikan tautan ini
            hanya kepada alamat yang diundang; tautan berlaku tujuh hari dan
            hanya dapat diterima oleh email tersebut.
          </p>
        </div>
      )}
    </div>
  );
}
