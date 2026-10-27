function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`loading-shimmer rounded-xl bg-muted/70 ${className}`} />
  );
}

export default function DashboardLoading() {
  return (
    <main
      className="dashboard-v2 mx-auto w-full max-w-[1440px] space-y-5 px-4 py-7 sm:space-y-6 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Memuat dashboard"
    >
      <span className="sr-only">Memuat ringkasan keuangan</span>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="h-8 w-72 max-w-[80vw]" />
          <SkeletonBlock className="h-4 w-96 max-w-[85vw]" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-10 w-36" />
          <SkeletonBlock className="h-10 w-36" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="dashboard-v2-card rounded-2xl border bg-card p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="mt-4 h-7 w-36 max-w-full" />
                <SkeletonBlock className="mt-4 h-3 w-28 max-w-full" />
              </div>
              <SkeletonBlock className="size-10 shrink-0" />
            </div>
          </div>
        ))}
      </div>

      <SkeletonBlock className="h-[4.5rem] w-full border" />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.85fr)]">
        <div className="dashboard-v2-card rounded-2xl border bg-card p-5 sm:p-6">
          <SkeletonBlock className="h-5 w-28" />
          <SkeletonBlock className="mt-2 h-3 w-64 max-w-full" />
          <SkeletonBlock className="mt-6 h-52 w-full" />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SkeletonBlock className="h-14" />
            <SkeletonBlock className="h-14" />
            <SkeletonBlock className="h-14" />
          </div>
        </div>
        <div className="dashboard-v2-card rounded-2xl border bg-card p-5 sm:p-6">
          <SkeletonBlock className="h-5 w-48 max-w-full" />
          <div className="mt-6 grid grid-cols-2 gap-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
          <SkeletonBlock className="mt-4 h-14" />
          <SkeletonBlock className="mt-4 h-28" />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SkeletonBlock className="h-80 border" />
        <SkeletonBlock className="h-80 border" />
      </div>
    </main>
  );
}
