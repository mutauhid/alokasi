import Link from "next/link";
import { CalendarClock, List } from "lucide-react";
import { cn } from "@/lib/utils";

function href(view: "history" | "reminders", workspaceId: string) {
  const path = view === "history" ? "/transactions" : "/transactions/reminders";
  return `${path}?workspaceId=${encodeURIComponent(workspaceId)}`;
}

export function TransactionViewTabs({
  workspaceId,
  current,
}: {
  workspaceId: string;
  current: "history" | "reminders";
}) {
  const items = [
    { view: "history" as const, label: "Riwayat", icon: List },
    { view: "reminders" as const, label: "Pengingat", icon: CalendarClock },
  ];

  return (
    <nav
      aria-label="Tampilan transaksi"
      className="inline-flex w-full gap-1 rounded-xl border bg-card p-1 sm:w-auto"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = current === item.view;
        return (
          <Link
            key={item.view}
            href={href(item.view, workspaceId)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors sm:flex-none",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
