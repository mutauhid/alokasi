"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import {
  ChevronUp,
  LogOut,
  PanelTop,
  Settings2,
  UserRound,
} from "lucide-react";
import { sectionHref, type WorkspaceSummary } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AccountMenu({
  workspace,
  userLabel,
  userEmail,
  onNavigate,
}: {
  workspace: WorkspaceSummary;
  userLabel: string;
  userEmail: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  async function handleSignOut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signingOut) return;

    setSigningOut(true);
    setSignOutFailed(false);

    try {
      const response = await fetch(event.currentTarget.action, {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "text/html" },
      });

      if (!response.ok) throw new Error("Sign out request failed");
      window.location.replace(response.url || "/login?signedOut=1");
    } catch {
      setSigningOut(false);
      setSignOutFailed(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const role =
    workspace.role === "owner"
      ? "Owner"
      : workspace.role === "editor"
        ? "Editor"
        : "Viewer";

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      {open && (
        <div
          role="menu"
          aria-label="Menu akun"
          className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-full min-w-52 overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl shadow-black/20"
        >
          <div className="border-b px-2.5 pb-3 pt-2">
            <p className="truncate text-sm font-semibold">{userLabel}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {userEmail}
            </p>
          </div>
          <div className="space-y-1 pt-1.5">
            <Link
              href={sectionHref("settings", workspace.id)}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Settings2 className="size-4" aria-hidden="true" />
              Profil &amp; pengaturan
            </Link>
            <form
              method="post"
              action="/auth/sign-out"
              onSubmit={handleSignOut}
            >
              <button
                type="submit"
                role="menuitem"
                disabled={signingOut}
                className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut className="size-4" aria-hidden="true" />
                {signingOut ? "Sedang keluar…" : "Keluar"}
              </button>
              {signOutFailed && (
                <p role="alert" className="px-2.5 pb-1 pt-1 text-xs text-destructive">
                  Gagal keluar. Periksa koneksi lalu coba lagi.
                </p>
              )}
            </form>
          </div>
        </div>
      )}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex min-h-14 w-full items-center gap-3 rounded-xl border-t px-1 pt-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "text-foreground",
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {userLabel ? (
            <UserRound className="size-4" aria-hidden="true" />
          ) : (
            <PanelTop className="size-4" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium">
            {userLabel}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {role} · aktif
          </span>
        </span>
        <ChevronUp
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
