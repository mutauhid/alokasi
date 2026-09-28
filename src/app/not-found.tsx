import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Compass className="mb-5 size-9 text-primary" aria-hidden="true" />
      <p className="text-xs font-semibold tracking-widest text-muted-foreground">
        404 · ALOKASI
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
        Alamat ini belum tersedia. Kembali ke dashboard untuk melanjutkan.
      </p>
      <Button asChild className="mt-7">
        <Link href="/dashboard">
          <ArrowLeft />
          Kembali ke dashboard
        </Link>
      </Button>
    </main>
  );
}
