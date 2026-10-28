"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Camera, ChevronDown, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TransactionTools({
  leading,
  createAction,
  scanContent,
  scanDescription = "OCR lokal di browser · JPEG, PNG, atau WebP hingga 10 MB",
  defaultOpen = false,
}: {
  leading: ReactNode;
  createAction: ReactNode;
  scanContent: ReactNode;
  scanDescription?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelRef = useRef<HTMLDivElement>(null);

  function toggleScanPanel() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      requestAnimationFrame(() => {
        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        panelRef.current?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {leading}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="min-h-11 rounded-xl sm:min-w-36"
            aria-expanded={open}
            aria-controls="scan-struk-content"
            onClick={toggleScanPanel}
          >
            <Camera className="size-5" aria-hidden="true" />
            Scan struk
          </Button>
          {createAction}
        </div>
      </div>

      <section
        id="scan-struk"
        ref={panelRef}
        className="scroll-mt-5 rounded-2xl border bg-card shadow-sm"
      >
        <button
          type="button"
          className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left outline-none transition-colors hover:bg-accent/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-5"
          aria-expanded={open}
          aria-controls="scan-struk-content"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Scan bukti pembayaran</span>
            <span className="mt-0.5 block text-xs text-muted-foreground sm:text-sm">
              {scanDescription}
            </span>
          </span>
          <span className="hidden items-center gap-1.5 text-xs font-medium text-primary sm:flex">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Privat
          </span>
          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
        <div
          id="scan-struk-content"
          hidden={!open}
          className="border-t p-3 sm:p-4"
        >
          {scanContent}
        </div>
      </section>
    </div>
  );
}
