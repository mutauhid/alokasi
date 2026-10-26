"use client";

import type { CSSProperties, ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "alokasi:amount-privacy";
const CHANGE_EVENT = "alokasi:amount-privacy-change";
let memoryValue = false;

function readPreference() {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return memoryValue;
    return stored === "hidden";
  } catch {
    return memoryValue;
  }
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAmountsHidden() {
  // Server rendering starts masked so a saved private mode never flashes a value.
  return useSyncExternalStore(subscribe, readPreference, () => true);
}

function setAmountsHidden(hidden: boolean) {
  memoryValue = hidden;
  try {
    window.localStorage.setItem(STORAGE_KEY, hidden ? "hidden" : "visible");
  } catch {
    // The in-memory preference still works when storage is unavailable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function AmountPrivacyToggle() {
  const hidden = useAmountsHidden();
  const label = hidden
    ? "Tampilkan semua nominal"
    : "Sembunyikan semua nominal";
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-10"
      aria-label={label}
      aria-pressed={hidden}
      title={label}
      onClick={() => setAmountsHidden(!hidden)}
    >
      {hidden ? (
        <EyeOff className="size-4.5" aria-hidden="true" />
      ) : (
        <Eye className="size-4.5" aria-hidden="true" />
      )}
    </Button>
  );
}

export function SensitiveAmount({
  children,
  className,
  placeholder = "••••••",
}: {
  children: ReactNode;
  className?: string;
  placeholder?: string;
}) {
  const hidden = useAmountsHidden();
  return (
    <span
      className={cn("tabular-nums", className)}
      aria-label={hidden ? "Nominal disembunyikan" : undefined}
      suppressHydrationWarning
    >
      {hidden ? placeholder : children}
    </span>
  );
}

export function SensitiveChartBar({
  label,
  value,
  className,
  style,
}: {
  label: string;
  value: string;
  className: string;
  style: CSSProperties;
}) {
  const hidden = useAmountsHidden();
  const description = hidden
    ? `${label}: nominal disembunyikan`
    : `${label} ${value}`;
  return (
    <div
      className={className}
      style={style}
      title={description}
      aria-label={description}
      suppressHydrationWarning
    />
  );
}
