"use client";

import { useMemo } from "react";
import {
  transactionTitleKey,
  type TransactionSuggestion,
} from "@/modules/transactions/suggestions";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-xs";

export function TransactionTitleField({
  value,
  onValueChange,
  type,
  suggestions,
  onApplySuggestion,
  showShortHint = true,
}: {
  value: string;
  onValueChange: (value: string) => void;
  type: "income" | "expense" | "transfer";
  suggestions: TransactionSuggestion[];
  onApplySuggestion: (suggestion: TransactionSuggestion) => void;
  showShortHint?: boolean;
}) {
  const visibleSuggestions = useMemo(() => {
    const query = transactionTitleKey(value);
    if (query.length < 2) return [];
    return suggestions
      .filter(
        (suggestion) =>
          suggestion.type === type &&
          transactionTitleKey(suggestion.title).includes(query),
      )
      .sort((left, right) => {
        const leftStarts = transactionTitleKey(left.title).startsWith(query);
        const rightStarts = transactionTitleKey(right.title).startsWith(query);
        return (
          Number(rightStarts) - Number(leftStarts) ||
          right.usageCount - left.usageCount ||
          right.lastUsedAt.localeCompare(left.lastUsedAt)
        );
      })
      .slice(0, 5);
  }, [suggestions, type, value]);

  return (
    <>
      <label className="text-sm font-medium">
        Judul transaksi
        <input
          name="title"
          required
          maxLength={100}
          autoComplete="off"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder="Contoh: makan siang"
          className={inputClass}
        />
      </label>
      {visibleSuggestions.length > 0 && (
        <div
          className="mt-2 flex flex-wrap gap-2"
          aria-label="Saran transaksi dari riwayat"
        >
          {visibleSuggestions.map((suggestion) => (
            <button
              key={`${suggestion.type}-${suggestion.title}-${suggestion.categoryId ?? "none"}`}
              type="button"
              onClick={() => onApplySuggestion(suggestion)}
              className="rounded-full border bg-secondary px-3 py-1.5 text-left text-xs font-medium transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Gunakan ${suggestion.title}${suggestion.categoryName ? `, kategori ${suggestion.categoryName}` : ""}`}
            >
              {suggestion.title}
              {suggestion.categoryName && (
                <span className="ml-1 font-normal text-muted-foreground">
                  · {suggestion.categoryName}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {showShortHint && value.trim().length > 0 && value.trim().length < 2 && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Ketik minimal 2 karakter untuk melihat saran dari riwayat.
        </p>
      )}
    </>
  );
}
