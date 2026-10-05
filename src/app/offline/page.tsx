import type { Metadata } from "next";
import Link from "next/link";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Tidak ada koneksi",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-10 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader className="gap-4">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <WifiOff className="size-6" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <CardTitle>Koneksi internet terputus</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Alokasi belum menyimpan transaksi secara offline. Periksa koneksi,
              lalu coba buka kembali aplikasi agar data finansial tetap berasal
              dari server.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/dashboard">
              <RefreshCw className="size-4" aria-hidden="true" />
              Coba lagi
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
