"use client";

import { useSyncExternalStore } from "react";
import { ChevronDown, Monitor, Moon, Sun } from "lucide-react";

type ThemePreference = "system" | "light" | "dark";
const storageKey = "alokasi-theme";

function currentPreference(): ThemePreference {
  const value = document.documentElement.dataset.theme;
  return value === "light" || value === "dark" ? value : "system";
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("alokasi:theme-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("alokasi:theme-change", callback);
  };
}

export function ThemeSwitcher() {
  const preference = useSyncExternalStore(
    subscribe,
    currentPreference,
    () => "system",
  );

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

  const Icon =
    preference === "dark" ? Moon : preference === "light" ? Sun : Monitor;

  return (
    <label className="relative inline-flex shrink-0 items-center text-sm font-medium">
      <span className="sr-only">Tema tampilan</span>
      <Icon
        className="pointer-events-none absolute left-3 size-4 text-primary"
        aria-hidden="true"
      />
      <select
        value={preference}
        onChange={(event) =>
          changePreference(event.target.value as ThemePreference)
        }
        className="min-h-10 w-[132px] appearance-none rounded-lg border bg-background py-2 pl-9 pr-8 text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
