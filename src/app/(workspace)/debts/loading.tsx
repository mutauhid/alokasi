export default function DebtsLoading() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Memuat utang dan piutang"
    >
      <div className="flex animate-pulse items-start justify-between gap-4 motion-reduce:animate-none">
        <div className="space-y-3">
          <div className="h-3 w-28 rounded-full bg-muted" />
          <div className="h-8 w-52 rounded-lg bg-muted" />
          <div className="h-4 w-72 max-w-full rounded-full bg-muted" />
        </div>
        <div className="hidden h-11 w-36 rounded-xl bg-muted sm:block" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-2xl border bg-card motion-reduce:animate-none max-lg:last:col-span-2"
          />
        ))}
      </div>
      <div className="h-24 animate-pulse rounded-2xl border bg-card motion-reduce:animate-none" />
      <div className="space-y-3 rounded-2xl border bg-card p-5">
        <div className="h-6 w-48 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-20 animate-pulse rounded-xl bg-muted/60 motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}
