"use client";

import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <CircleAlert
        className="mb-5 size-9 text-destructive"
        aria-hidden="true"
      />
      <h1 className="text-2xl font-semibold">Tampilan belum bisa dimuat</h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
        Terjadi kendala saat memuat halaman. Silakan coba lagi.
      </p>
      <Button onClick={reset} className="mt-7">
        Coba lagi
      </Button>
    </main>
  );
}
