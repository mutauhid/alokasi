function Skeleton({ className }: { className: string }) {
  return <div className={`loading-shimmer rounded-lg bg-muted ${className}`} />;
}

export default function TransactionsLoading() {
  return (
    <div
      className="transactions-v2 space-y-5 sm:space-y-6"
      aria-label="Memuat transaksi"
      aria-busy="true"
    >
      <Skeleton className="h-12 w-full sm:w-64" />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Skeleton className="h-12 w-full sm:w-40" />
        <Skeleton className="h-12 w-full sm:w-48" />
      </div>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="transactions-v2-card overflow-hidden rounded-2xl border bg-card">
        <div className="space-y-4 border-b p-4 sm:p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="space-y-2 p-3 sm:p-5">
          {[0, 1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_6rem] items-center gap-3 border-b py-4 last:border-0"
            >
              <Skeleton className="size-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full max-w-72" />
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Memuat data transaksi…</span>
    </div>
  );
}
