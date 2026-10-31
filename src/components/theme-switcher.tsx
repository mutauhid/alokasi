"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { AppSelect } from "@/components/ui/app-select";

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
    <AppSelect
      name="theme"
      ariaLabel="Tema tampilan"
      value={preference}
      onValueChange={(value) => changePreference(value as ThemePreference)}
      options={[
        { value: "system", label: "Otomatis" },
        { value: "light", label: "Terang" },
        { value: "dark", label: "Gelap" },
      ]}
      leading={<Icon className="size-4 text-primary" aria-hidden="true" />}
      className="w-full sm:w-[142px] sm:shrink-0"
    />
  );
}
