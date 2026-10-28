function Skeleton({ className }: { className: string }) {
  return <div className={`loading-shimmer rounded-xl bg-muted ${className}`} />;
}

export default function BudgetsLoading() {
  return (
    <div
      className="budget-v2 space-y-6"
      aria-label="Memuat budget"
      aria-busy="true"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-11 w-64" />
          <Skeleton className="h-11 w-32" />
          <Skeleton className="h-11 w-32" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-2xl border bg-card p-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-8 w-40 max-w-full" />
            <Skeleton className="mt-4 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 rounded-3xl border bg-card p-6 lg:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-5">
          <Skeleton className="h-6 w-64 max-w-full" />
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <Skeleton className="size-40 rounded-full" />
            <Skeleton className="h-40 flex-1" />
          </div>
        </div>
        <Skeleton className="min-h-40 w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-56 w-full rounded-3xl" />
          ))}
        </div>
      </div>
      <span className="sr-only">Memuat data budget…</span>
    </div>
  );
}
