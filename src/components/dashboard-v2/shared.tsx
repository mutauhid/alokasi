import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { getDashboardOverview } from "@/modules/dashboard/service";

export type DashboardOverview = Awaited<
  ReturnType<typeof getDashboardOverview>
>;

export function rupiah(value: bigint) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function compactRupiah(value: bigint) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function reportHref(
  workspaceId: string,
  period: DashboardOverview["period"],
  filters: { type?: "income" | "expense"; categoryId?: string } = {},
) {
  const params = new URLSearchParams({
    workspaceId,
    from: dateValue(period.startDate),
    to: dateValue(new Date(period.endDateExclusive.valueOf() - 86_400_000)),
  });
  if (filters.type) params.set("type", filters.type);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  return `/reports?${params.toString()}`;
}

export function shortPeriod(start: Date, endExclusive: Date) {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return `${formatter.format(start)}–${formatter.format(
    new Date(endExclusive.valueOf() - 86_400_000),
  )}`;
}

export function displayDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function DashboardPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "dashboard-v2-card rounded-2xl border bg-card text-card-foreground",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeading({
  title,
  description,
  href,
  linkLabel = "Lihat semua",
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight sm:text-[17px]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="dashboard-v2-link inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
        >
          {linkLabel}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </header>
  );
}
