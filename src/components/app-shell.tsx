"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeftRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  ChartPie,
  CircleHelp,
  Layers,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Settings2,
  Users,
  Wallet,
} from "lucide-react";
import {
  navigation,
  sectionHref,
  type Section,
  type WorkspaceSummary,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { AccountMenu } from "@/components/account-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const icons = {
  dashboard: LayoutDashboard,
  transactions: ArrowLeftRight,
  budgets: ChartPie,
  accounts: Wallet,
  reports: ChartNoAxesCombined,
  members: Users,
  settings: Settings2,
};

function Brand() {
  return (
    <div className="flex items-center gap-2.5 text-[26px] font-semibold tracking-[-1.4px]">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Layers className="size-5" aria-hidden="true" />
      </span>
      alokasi<span className="-ml-2 text-primary">.</span>
    </div>
  );
}

function Navigation({
  section,
  workspaceId,
  onNavigate,
}: {
  section: Section;
  workspaceId: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Navigasi utama" className="space-y-1.5">
      {navigation
        .filter((item) => item.slug !== "settings")
        .map((item) => {
          const Icon = icons[item.icon];
          return (
            <Link
              key={item.slug}
              href={sectionHref(item.slug, workspaceId)}
              onClick={onNavigate}
              aria-current={section === item.slug ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                section === item.slug
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="size-[18px]" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}

export function AppShell({
  children,
  section,
  workspace,
  workspaces,
  userLabel,
  userEmail,
}: {
  children: React.ReactNode;
  section: Section;
  workspace: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
  userLabel: string;
  userEmail: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-50 rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only"
      >
        Lewati ke konten
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col overflow-y-auto border-r bg-card px-5 py-7 lg:flex">
        <Link
          href={sectionHref("dashboard", workspace.id)}
          aria-label="Alokasi — Dashboard"
          className="mb-11 px-2"
        >
          <Brand />
        </Link>
        <p className="mb-3 px-3 text-[11px] font-semibold tracking-[.16em] text-muted-foreground">
          RUANG KEUANGAN
        </p>
        <Navigation section={section} workspaceId={workspace.id} />
        <div className="mt-auto pt-10">
          <div className="rounded-xl border border-dashed bg-background/60 p-4">
            <LockKeyhole
              className="mb-3 size-5 text-primary"
              aria-hidden="true"
            />
            <p className="text-xs font-medium">Ruangmu, privasimu.</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Keuangan pribadi dan bersama memiliki ruang masing-masing.
            </p>
          </div>
          <div className="mt-5">
            <AccountMenu
              workspace={workspace}
              userLabel={userLabel}
              userEmail={userEmail}
            />
          </div>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-56">
        <header className="border-b bg-card">
          <div className="mx-auto flex min-h-[77px] max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-7 lg:px-9">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-11 lg:hidden"
                    aria-label="Buka navigasi"
                  >
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-72 overflow-y-auto bg-card p-5"
                >
                  <SheetHeader className="mb-5 p-0">
                    <SheetTitle asChild>
                      <div>
                        <Brand />
                      </div>
                    </SheetTitle>
                    <SheetDescription>Navigasi ruang keuangan</SheetDescription>
                  </SheetHeader>
                  <Navigation
                    section={section}
                    workspaceId={workspace.id}
                    onNavigate={() => setMenuOpen(false)}
                  />
                  <div className="mt-8">
                    <AccountMenu
                      workspace={workspace}
                      userLabel={userLabel}
                      userEmail={userEmail}
                      onNavigate={() => setMenuOpen(false)}
                    />
                  </div>
                </SheetContent>
              </Sheet>
              <WorkspaceSwitcher
                section={section}
                workspace={workspace}
                workspaces={workspaces}
              />
            </div>
            <Badge
              variant="outline"
              className="gap-2 border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground"
            >
              <span
                className="size-1.5 rounded-full bg-primary"
                aria-hidden="true"
              />
              Tersambung
            </Badge>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-[1440px] px-4 py-6 focus-visible:outline-none sm:px-7 sm:py-8 lg:px-9"
        >
          <div className="mb-7 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-dashed bg-card/60 px-3.5 py-2.5 text-xs text-muted-foreground">
            <CircleHelp className="size-4 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1">
              Semua angka dan tindakan di halaman ini dibatasi ke ruang aktif
              dan peran anggota yang diverifikasi server.
            </p>
            <Link
              href={sectionHref("members", workspace.id)}
              className="inline-flex min-h-7 items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              Lihat status
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          {children}
          <footer className="mt-8 flex flex-wrap justify-between gap-2 border-t pt-5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              {workspace.type === "personal" ? (
                <LockKeyhole className="size-3.5" aria-hidden="true" />
              ) : (
                <Users className="size-3.5" aria-hidden="true" />
              )}
              {workspace.name} ·{" "}
              {workspace.type === "personal"
                ? "Ruang pribadi"
                : "Ruang bersama"}
            </span>
            <span>IDR · akses {workspace.role}</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
