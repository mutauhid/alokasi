"use client";

import Link from "next/link";
import { useState, type ComponentType } from "react";
import {
  ArrowLeftRight,
  Camera,
  ChartNoAxesCombined,
  ChartPie,
  HandCoins,
  Home,
  LayoutGrid,
  Plus,
  ReceiptText,
  Settings2,
  SquarePen,
  Users,
  Wallet,
} from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { AccountMenu } from "@/components/account-menu";
import {
  sectionHref,
  type Section,
  type WorkspaceSummary,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

type Icon = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

function MobileNavLink({
  href,
  label,
  icon: IconComponent,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: Icon;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "group relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-[color,background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.96]",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "absolute top-0 h-0.5 rounded-full bg-primary transition-[width,opacity] duration-200",
          active ? "w-7 opacity-100" : "w-0 opacity-0",
        )}
        aria-hidden="true"
      />
      <IconComponent
        className={cn(
          "size-5 transition-transform duration-200",
          active && "scale-105",
        )}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

const moreItems: Array<{
  section?: Section;
  href?: (workspaceId: string) => string;
  label: string;
  icon: Icon;
}> = [
  { section: "reports", label: "Laporan", icon: ChartNoAxesCombined },
  { section: "accounts", label: "Akun", icon: Wallet },
  { section: "debts", label: "Utang & Piutang", icon: HandCoins },
  {
    href: (workspaceId) =>
      `/transactions/reminders?workspaceId=${encodeURIComponent(workspaceId)}`,
    label: "Pengingat",
    icon: ReceiptText,
  },
  { section: "members", label: "Anggota & akses", icon: Users },
  { section: "settings", label: "Pengaturan", icon: Settings2 },
];

const moreSections = new Set<Section>([
  "reports",
  "accounts",
  "debts",
  "members",
  "settings",
]);

export function MobileBottomNavigation({
  section,
  workspace,
  userLabel,
  userEmail,
}: {
  section: Section;
  workspace: WorkspaceSummary;
  userLabel: string;
  userEmail: string;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const canCreate = workspace.role !== "viewer";
  const moreActive = moreSections.has(section);
  const transactionHref = sectionHref("transactions", workspace.id);

  return (
    <nav
      aria-label="Navigasi mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 shadow-[0_-10px_30px_-18px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1 px-2 pt-1.5 [padding-bottom:max(0.5rem,env(safe-area-inset-bottom))]">
        <MobileNavLink
          href={sectionHref("dashboard", workspace.id)}
          label="Beranda"
          icon={Home}
          active={section === "dashboard"}
        />
        <MobileNavLink
          href={transactionHref}
          label="Transaksi"
          icon={ArrowLeftRight}
          active={section === "transactions"}
        />

        <PopoverPrimitive.Root open={actionsOpen} onOpenChange={setActionsOpen}>
          <PopoverPrimitive.Trigger asChild>
            <button
              type="button"
              disabled={!canCreate}
              aria-label={
                canCreate
                  ? "Buka pilihan catat transaksi"
                  : "Pencatatan transaksi hanya tersedia untuk Owner atau Editor"
              }
              className="group relative mx-auto -mt-5 flex size-14 items-center justify-center rounded-full border-4 border-card bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
            >
              <Plus
                className={cn(
                  "size-6 transition-transform duration-200",
                  actionsOpen && "rotate-45",
                )}
                aria-hidden="true"
              />
            </button>
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              side="top"
              align="center"
              sideOffset={12}
              collisionPadding={12}
              className="z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border bg-popover p-2 text-popover-foreground shadow-2xl shadow-black/25 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
            >
              <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Catat transaksi
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`${transactionHref}&scan=1`}
                  onClick={() => setActionsOpen(false)}
                  className="flex min-h-20 flex-col justify-between rounded-xl border bg-card p-3 text-sm font-semibold transition-colors hover:border-primary/45 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Camera className="size-5 text-primary" aria-hidden="true" />
                  Scan struk
                </Link>
                <Link
                  href={`${transactionHref}&create=1`}
                  onClick={() => setActionsOpen(false)}
                  className="flex min-h-20 flex-col justify-between rounded-xl border bg-card p-3 text-sm font-semibold transition-colors hover:border-primary/45 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <SquarePen
                    className="size-5 text-primary"
                    aria-hidden="true"
                  />
                  Tambah manual
                </Link>
              </div>
              <PopoverPrimitive.Arrow className="fill-popover" />
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>

        <MobileNavLink
          href={sectionHref("budgets", workspace.id)}
          label="Budget"
          icon={ChartPie}
          active={section === "budgets"}
        />

        <PopoverPrimitive.Root open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverPrimitive.Trigger asChild>
            <button
              type="button"
              aria-label="Buka menu lainnya"
              aria-current={moreActive ? "page" : undefined}
              className={cn(
                "group relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-[color,background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.96]",
                moreActive || moreOpen
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "absolute top-0 h-0.5 rounded-full bg-primary transition-[width,opacity] duration-200",
                  moreActive || moreOpen ? "w-7 opacity-100" : "w-0 opacity-0",
                )}
                aria-hidden="true"
              />
              <LayoutGrid className="size-5" aria-hidden="true" />
              <span className="truncate">Lainnya</span>
            </button>
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              side="top"
              align="end"
              sideOffset={12}
              collisionPadding={12}
              className="z-50 w-[min(23rem,calc(100vw-1.5rem))] rounded-2xl border bg-popover p-3 text-popover-foreground shadow-2xl shadow-black/25 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2"
            >
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <LayoutGrid className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Menu lainnya</p>
                  <p className="text-xs text-muted-foreground">
                    Kelola ruang dan lihat insight lain.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {moreItems.map((item) => {
                  const IconComponent = item.icon;
                  const href = item.section
                    ? sectionHref(item.section, workspace.id)
                    : item.href!(workspace.id);
                  const active = item.section === section;
                  return (
                    <Link
                      key={item.label}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-12 items-center gap-2 rounded-xl px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-accent",
                      )}
                    >
                      <IconComponent
                        className="size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 leading-tight">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
              <div className="mt-3 border-t pt-1">
                <AccountMenu
                  workspace={workspace}
                  userLabel={userLabel}
                  userEmail={userEmail}
                  onNavigate={() => setMoreOpen(false)}
                />
              </div>
              <PopoverPrimitive.Arrow className="fill-popover" />
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </div>
    </nav>
  );
}
