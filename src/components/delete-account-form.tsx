"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteAccountAction } from "@/app/(workspace)/account-actions";
import { Button } from "@/components/ui/button";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-xs";

export function DeleteAccountForm({
  workspaceId,
  email,
  configured,
  blocked,
}: {
  workspaceId: string;
  email: string;
  configured: boolean;
  blocked: boolean;
}) {
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [password, setPassword] = useState("");
  const ready =
    configured &&
    !blocked &&
    confirmationEmail.trim().toLocaleLowerCase("en-US") ===
      email.toLocaleLowerCase("en-US") &&
    password.length > 0;

  return (
    <form action={deleteAccountAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <label className="block text-sm font-medium">
        Ketik email akun untuk konfirmasi
        <input
          type="email"
          name="confirmationEmail"
          value={confirmationEmail}
          onChange={(event) => setConfirmationEmail(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          required
          maxLength={320}
          placeholder={email}
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
        <Trash2 aria-hidden="true" /> Hapus akun secara permanen
      </Button>
    </form>
  );
}
