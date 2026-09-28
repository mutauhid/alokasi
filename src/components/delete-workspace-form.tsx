"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteSharedWorkspaceAction } from "@/app/(workspace)/workspace-actions";
import { Button } from "@/components/ui/button";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-xs";

export function DeleteWorkspaceForm({
  workspaceId,
  workspaceVersion,
  workspaceName,
}: {
  workspaceId: string;
  workspaceVersion: number;
  workspaceName: string;
}) {
  const [confirmationName, setConfirmationName] = useState("");
  const [password, setPassword] = useState("");
  const ready = confirmationName === workspaceName && password.length > 0;

  return (
    <form action={deleteSharedWorkspaceAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="workspaceVersion" value={workspaceVersion} />
      <label className="block text-sm font-medium">
        Ketik nama ruang untuk konfirmasi
        <input
          name="confirmationName"
          value={confirmationName}
          onChange={(event) => setConfirmationName(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          required
          maxLength={100}
          placeholder={workspaceName}
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium">
        Password akun
        <input
          type="password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          maxLength={256}
          className={inputClass}
        />
      </label>
      <Button
        type="submit"
        variant="destructive"
        disabled={!ready}
        className="min-h-11"
      >
        <Trash2 /> Hapus ruang secara permanen
      </Button>
    </form>
  );
}
