function Skeleton({ className }: { className: string }) {
  return <div className={`loading-shimmer rounded-xl bg-muted ${className}`} />;
}

const chartBarHeights = [
  ["h-14", "h-10"],
  ["h-24", "h-16"],
  ["h-20", "h-12"],
  ["h-32", "h-24"],
  ["h-20", "h-16"],
  ["h-28", "h-20"],
];

export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-label="Memuat halaman Alokasi"
      className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8"
    >
      <span className="sr-only" role="status">
        Memuat data Alokasi…
      </span>

      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-64 max-w-[70vw]" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="size-7" />
            </div>
            <Skeleton className="mt-5 h-8 w-36" />
            <Skeleton className="mt-4 h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-56 max-w-[55vw]" />
          </div>
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="mt-8 flex h-36 items-end justify-around gap-3">
          {chartBarHeights.map(([incomeHeight, expenseHeight], index) => (
            <div
              key={index}
              className="flex flex-1 items-end justify-center gap-1"
            >
              <Skeleton className={`${incomeHeight} w-3 sm:w-5`} />
              <Skeleton className={`${expenseHeight} w-3 sm:w-5`} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm"
          >
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </main>
  );
}
