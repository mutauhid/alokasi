import { Landmark } from "lucide-react";

export default function AccountsLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Memuat akun">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
          <div className="mt-2 h-4 w-64 max-w-[70vw] animate-pulse rounded bg-muted" />
        </div>
        <div className="hidden h-11 w-36 animate-pulse rounded-xl bg-muted sm:block" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className={`${item === 0 ? "col-span-2 lg:col-span-1" : ""} min-h-28 animate-pulse rounded-2xl border bg-muted/55`}
          />
        ))}
      </div>
      <div className="rounded-2xl border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <Landmark
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-xl bg-muted/55"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
