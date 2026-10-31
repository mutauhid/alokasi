"use client";

import { useSyncExternalStore } from "react";
import { ChevronDown, Monitor, Moon, Sun } from "lucide-react";

type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";
const storageKey = "alokasi-theme";

function currentPreference(): ThemePreference {
  const value = document.documentElement.dataset.theme;
  return value === "light" || value === "dark" ? value : "system";
}

function currentSnapshot(): `${ThemePreference}-${ResolvedTheme}` {
  const resolved = document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
  return `${currentPreference()}-${resolved}`;
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("alokasi:theme-change", callback);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("alokasi:theme-change", callback);
    media.removeEventListener("change", callback);
  };
}

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    currentSnapshot,
    () => "system-light",
  );
  const [preference, resolvedTheme] = snapshot.split("-") as [
    ThemePreference,
    ResolvedTheme,
  ];

  function changePreference(value: ThemePreference) {
    document.documentElement.dataset.theme = value;
    try {
      if (value === "system") {
        window.localStorage.removeItem(storageKey);
      } else {
        window.localStorage.setItem(storageKey, value);
      }
    } catch {
      // The current tab still switches theme when storage is unavailable.
    }
    window.dispatchEvent(new Event("alokasi:theme-change"));
  }

  if (compact) {
    const dark = resolvedTheme === "dark";
    const CompactIcon = dark ? Moon : Sun;
    const nextTheme = dark ? "light" : "dark";
    return (
      <button
        type="button"
        aria-label={`Aktifkan mode ${dark ? "terang" : "gelap"}`}
        aria-pressed={dark}
        title={`Aktifkan mode ${dark ? "terang" : "gelap"}`}
        onClick={() => changePreference(nextTheme)}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border bg-background text-primary transition-[background-color,color,transform] hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
      >
        <CompactIcon className="size-5" aria-hidden="true" />
      </button>
    );
  }

  const Icon =
    preference === "dark" ? Moon : preference === "light" ? Sun : Monitor;

  return (
    <label className="relative inline-flex w-full min-w-0 items-center text-sm font-medium sm:w-auto sm:shrink-0">
      <span className="sr-only">Tema tampilan</span>
      <Icon
        className="pointer-events-none absolute left-3 size-4 text-primary"
        aria-hidden="true"
      />
      <select
        aria-label="Tema tampilan"
        value={preference}
        onChange={(event) =>
          changePreference(event.target.value as ThemePreference)
        }
        className="min-h-10 w-full appearance-none rounded-lg border bg-background py-2 pl-9 pr-8 text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[132px]"
      >
        <option value="system">Otomatis</option>
        <option value="light">Terang</option>
        <option value="dark">Gelap</option>
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 size-3.5 text-muted-foreground"
        aria-hidden="true"
      />
    </label>
  );
}
