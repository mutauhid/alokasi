function Skeleton({ className }: { className: string }) {
  return <div className={`loading-shimmer rounded-xl bg-muted ${className}`} />;
}

export default function ReportsLoading() {
  return (
    <div
      className="reports-v2 space-y-4 sm:space-y-5"
      aria-label="Memuat laporan"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-9 w-52 max-w-full" />
        </div>
        <Skeleton className="h-11 w-full sm:w-36" />
      </div>
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.85fr)]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
