"use client";

import { Check } from "lucide-react";
import { categoryIconDetails } from "@/components/transaction-category-icon";
import { cn } from "@/lib/utils";

type CategoryOption = { id: string; name: string };

export function CategoryRadioGroup({
  categories,
  value,
  onValueChange,
  type,
  hint,
  className,
}: {
  categories: CategoryOption[];
  value: string;
  onValueChange: (value: string) => void;
  type: "income" | "expense";
  hint?: string;
  className?: string;
}) {
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="text-sm font-medium">Kategori</legend>
      <div className="mt-2 grid grid-cols-2 gap-2 xl:grid-cols-3">
        {categories.map((category) => {
          const { icon: Icon, tone } = categoryIconDetails(category.name, type);
          const selected = value === category.id;
          return (
            <label
              key={category.id}
              className={cn(
                "group relative flex min-h-20 cursor-pointer flex-col items-start gap-2 rounded-xl border bg-background px-3 py-2.5 text-sm transition-[border-color,background-color,box-shadow,transform] duration-200 motion-safe:hover:-translate-y-0.5 hover:bg-accent/60 sm:min-h-14 sm:flex-row sm:items-center sm:gap-2.5",
                selected
                  ? "border-primary bg-primary/5 shadow-[inset_0_0_0_1px_var(--primary)]"
                  : "border-border",
              )}
            >
              <input
                type="radio"
                name="categoryId"
                value={category.id}
                checked={selected}
                required
                onChange={(event) => onValueChange(event.target.value)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                  tone,
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 w-full flex-1 break-words pr-6 font-medium leading-snug sm:w-auto sm:pr-0">
                {category.name}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "absolute right-3 top-3 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors sm:static",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/60",
                )}
              >
                {selected && <Check className="size-2.5" />}
              </span>
              <span className="pointer-events-none absolute inset-0 rounded-xl ring-primary ring-offset-2 ring-offset-background peer-focus-visible:ring-2" />
            </label>
          );
        })}
      </div>
      {categories.length === 0 && (
        <p className="mt-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          Belum ada kategori aktif untuk jenis transaksi ini.
        </p>
      )}
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </fieldset>
  );
}
