"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarClock,
  ChartNoAxesCombined,
  CircleDollarSign,
  FileClock,
  HandCoins,
  Settings2,
  Users,
  WalletCards,
} from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/(workspace)/notification-actions";
import { useAmountsHidden } from "@/components/amount-privacy";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  type:
    | "budget_alert"
    | "weekly_summary"
    | "recurring_reminder"
    | "low_balance"
    | "stale_draft"
    | "shared_activity"
    | "debt_due";
  title: string;
  body: string;
  url: string;
  readAt: string | null;
  createdAt: string;
};

type Inbox = {
  items: NotificationItem[];
  unreadCount: number;
  limit: number;
};

const iconByType = {
  budget_alert: CircleDollarSign,
  weekly_summary: ChartNoAxesCombined,
  recurring_reminder: CalendarClock,
  low_balance: WalletCards,
  stale_draft: FileClock,
  shared_activity: Users,
  debt_due: HandCoins,
};

function dateKey(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function timeLabel(value: string, timeZone: string) {
  const date = new Date(value);
  const today = dateKey(new Date(), timeZone);
  const itemDay = dateKey(date, timeZone);
  if (today === itemDay) {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat("id-ID", {
    timeZone,
    day: "numeric",
    month: "short",
  }).format(date);
}

function BadgeCount({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-5 text-destructive-foreground shadow-sm ring-2 ring-card">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function NotificationCenter({
  workspaceId,
  workspaceName,
  timeZone,
  initial,
}: {
  workspaceId: string;
  workspaceName: string;
  timeZone: string;
  initial: Inbox;
}) {
  const router = useRouter();
  const amountsHidden = useAmountsHidden();
  const [items, setItems] = useState(initial.items);
  const [unreadCount, setUnreadCount] = useState(initial.unreadCount);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const refreshOnFocus = () => router.refresh();
    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisible);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [router]);

  const visibleItems = useMemo(
    () => (tab === "unread" ? items.filter((item) => !item.readAt) : items),
    [items, tab],
  );

  function markAll() {
    const markedAt = new Date().toISOString();
    setItems((current) =>
      current.map((item) => ({ ...item, readAt: item.readAt ?? markedAt })),
    );
    setUnreadCount(0);
    startTransition(async () => {
      await markAllNotificationsReadAction(workspaceId);
      router.refresh();
    });
  }

  function openNotification(item: NotificationItem) {
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? { ...entry, readAt: entry.readAt ?? new Date().toISOString() }
          : entry,
      ),
    );
    if (!item.readAt) setUnreadCount((current) => Math.max(0, current - 1));
    setDesktopOpen(false);
    setMobileOpen(false);
    startTransition(async () => {
      if (!item.readAt) await markNotificationReadAction(workspaceId, item.id);
      router.push(item.url);
      router.refresh();
    });
  }

  const trigger = (className?: string) => (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("relative size-11 shrink-0 rounded-xl", className)}
      aria-label={
        unreadCount > 0
          ? `Buka notifikasi, ${unreadCount} belum dibaca`
          : "Buka notifikasi"
      }
    >
      <Bell className="size-5" aria-hidden="true" />
      <BadgeCount count={unreadCount} />
    </Button>
  );

  const content = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b px-4 pb-3 sm:px-5">
        <button
          type="button"
          onClick={() => setTab("all")}
          className={cn(
            "min-h-10 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            tab === "all"
              ? "bg-primary/12 text-primary"
              : "text-muted-foreground",
          )}
        >
          Semua
        </button>
        <button
          type="button"
          onClick={() => setTab("unread")}
          className={cn(
            "min-h-10 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            tab === "unread"
              ? "bg-primary/12 text-primary"
              : "text-muted-foreground",
          )}
        >
          Belum dibaca ({unreadCount})
        </button>
        {unreadCount > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={markAll}
            className="ml-auto min-h-10 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            Tandai semua
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
        {visibleItems.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bell className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-4 font-semibold">
              {tab === "unread" ? "Semua sudah dibaca" : "Belum ada notifikasi"}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Peringatan budget, pengingat, dan aktivitas ruang akan muncul di
              sini.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {visibleItems.map((item) => {
              const Icon = iconByType[item.type];
              const unread = !item.readAt;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(item)}
                    className={cn(
                      "grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-accent/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      unread && "border-primary/25 bg-primary/[0.06]",
                    )}
                  >
                    <span className="relative flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                      {unread && (
                        <span className="absolute -left-1 -top-1 size-2.5 rounded-full bg-primary ring-2 ring-card">
                          <span className="sr-only">Belum dibaca</span>
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-snug">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {amountsHidden
                          ? "Detail keuangan disembunyikan. Buka notifikasi untuk melihat halaman terkait."
                          : item.body}
                      </span>
                    </span>
                    <span className="whitespace-nowrap pt-0.5 text-[11px] text-muted-foreground">
                      {timeLabel(item.createdAt, timeZone)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <a
        href={`/settings?workspaceId=${encodeURIComponent(workspaceId)}&view=automation`}
        className="mx-4 mb-[calc(1rem+env(safe-area-inset-bottom))] mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mx-5 sm:mb-5"
      >
        <Settings2 className="size-4" aria-hidden="true" />
        Pengaturan notifikasi
      </a>
      {initial.items.length >= initial.limit && (
        <p className="sr-only">
          Menampilkan {initial.limit} notifikasi terbaru.
        </p>
      )}
    </div>
  );

  return (
    <>
      <div className="hidden sm:block">
        <PopoverPrimitive.Root open={desktopOpen} onOpenChange={setDesktopOpen}>
          <PopoverPrimitive.Trigger asChild>
            {trigger()}
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              align="end"
              sideOffset={10}
              collisionPadding={16}
              className="z-[90] flex h-[min(42rem,calc(100dvh-6rem))] w-[min(27rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl shadow-black/30 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
            >
              <div className="px-5 pb-3 pt-5">
                <p className="text-lg font-semibold">Notifikasi</p>
                <p className="text-sm text-muted-foreground">{workspaceName}</p>
              </div>
              {content}
              <PopoverPrimitive.Arrow className="fill-popover" />
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </div>

      <div className="sm:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>{trigger()}</SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[92dvh] rounded-t-3xl p-0"
            closeLabel="Tutup notifikasi"
          >
            <span className="mx-auto mt-2 block h-1 w-10 rounded-full bg-muted-foreground/35" />
            <SheetHeader className="px-5 pb-3 pt-2">
              <SheetTitle className="text-lg">Notifikasi</SheetTitle>
              <SheetDescription>{workspaceName}</SheetDescription>
            </SheetHeader>
            {content}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
