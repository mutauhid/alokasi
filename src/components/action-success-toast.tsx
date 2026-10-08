"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, Sparkles, X } from "lucide-react";
import {
  getActionToastMessage,
  successToastDismissUrl,
  type ActionToastMessage,
} from "@/lib/action-toast-messages";
import { cn } from "@/lib/utils";

type ActiveToast = ActionToastMessage & { id: number };

export function ActionSuccessToast({ code }: { code?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const sequence = useRef(0);
  const [toast, setToast] = useState<ActiveToast>();
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!code) return;

    const message = getActionToastMessage(code);
    if (message) {
      sequence.current += 1;
      const id = sequence.current;
      queueMicrotask(() => {
        setClosing(false);
        setToast({ ...message, id });
      });
    }

    const nextUrl = successToastDismissUrl(
      pathname,
      window.location.search,
      window.location.hash,
    );
    router.replace(nextUrl, { scroll: false });
  }, [code, pathname, router]);

  useEffect(() => {
    if (!toast) return;
    const closingTimer = window.setTimeout(() => setClosing(true), 5_200);
    const removalTimer = window.setTimeout(() => setToast(undefined), 5_500);
    return () => {
      window.clearTimeout(closingTimer);
      window.clearTimeout(removalTimer);
    };
  }, [toast]);

  function dismiss() {
    const toastId = toast?.id;
    setClosing(true);
    window.setTimeout(() => {
      setToast((current) => (current?.id === toastId ? undefined : current));
    }, 200);
  }

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[100] flex justify-center sm:left-auto sm:right-6 sm:top-6 sm:w-[25rem]">
      <section
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          "pointer-events-auto relative w-full overflow-hidden rounded-2xl border border-primary/25 bg-card/95 p-4 pr-12 text-card-foreground shadow-2xl shadow-primary/10 backdrop-blur-xl",
          closing
            ? "animate-out fade-out slide-out-to-right-3 duration-200"
            : "animate-in fade-in slide-in-from-top-3 duration-300 sm:slide-in-from-right-3",
        )}
      >
        <span
          className="absolute inset-y-0 left-0 w-1 bg-primary"
          aria-hidden="true"
        />
        <div className="flex items-start gap-3">
          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Check className="size-5 stroke-[2.5]" aria-hidden="true" />
            <Sparkles
              className="absolute -right-1 -top-1 size-4 rounded-full bg-card p-0.5 text-primary"
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="font-semibold leading-5">{toast.title}</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {toast.description}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Tutup notifikasi"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        <span
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary/70 [animation:toast-progress_5.2s_linear_forwards]"
          aria-hidden="true"
        />
      </section>
    </div>
  );
}
