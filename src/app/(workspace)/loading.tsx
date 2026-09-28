export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-label="Memuat halaman"
      className="mx-auto max-w-5xl space-y-6 px-6 py-12"
    >
      <p className="text-sm text-muted-foreground" role="status">
        Memuat Alokasi…
      </p>
      <div className="h-9 w-44 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-36 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </main>
  );
}
