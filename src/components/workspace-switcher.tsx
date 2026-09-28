"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronDown, LockKeyhole, Users } from "lucide-react";
import {
  sectionHref,
  type Section,
  type WorkspaceSummary,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

function roleLabel(role: WorkspaceSummary["role"]) {
  if (role === "owner") return "Owner";
  if (role === "editor") return "Editor";
  return "Viewer";
}

function typeLabel(type: WorkspaceSummary["type"]) {
  return type === "personal" ? "Pribadi" : "Bersama";
}

export function WorkspaceSwitcher({
  section,
  workspace,
  workspaces,
}: {
  section: Section;
  workspace: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePress = () => setOpen(false);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const ActiveIcon = workspace.type === "personal" ? LockKeyhole : Users;

  return (
    <div
      className="relative min-w-0"
      onClick={(event) => event.stopPropagation()}
    >
      <p className="mb-1 text-[10px] font-medium uppercase tracking-[.12em] text-muted-foreground">
        Ruang aktif
      </p>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "group flex min-h-12 w-[230px] max-w-[calc(100vw-7.5rem)] items-center gap-3 rounded-xl border bg-background px-3 text-left shadow-xs transition-colors hover:border-primary/50 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[290px]",
          open && "border-primary/60 bg-accent/40 ring-2 ring-primary/10",
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <ActiveIcon className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {workspace.name}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {typeLabel(workspace.type)} · {roleLabel(workspace.role)}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform group-hover:text-foreground",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Pilih ruang aktif"
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-[300px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl shadow-black/20"
        >
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="text-xs font-semibold">Pilih ruang keuangan</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Data setiap ruang tetap terpisah.
            </p>
          </div>
          <div className="space-y-1">
            {workspaces.map((item) => {
              const Icon = item.type === "personal" ? LockKeyhole : Users;
              const active = item.id === workspace.id;
              return (
                <Link
                  key={item.id}
                  href={sectionHref(section, item.id)}
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={(event) => {
                    if (active) {
                      event.preventDefault();
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active && "bg-accent/80",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground",
                      active && "border-primary/30 bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {item.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {typeLabel(item.type)} · {roleLabel(item.role)}
                    </span>
                  </span>
                  {active && (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3.5" aria-label="Ruang aktif" />
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
