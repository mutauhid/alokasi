"use client";

import { useId, useState, type ComponentProps } from "react";
import { formatRupiahInput, normalizeRupiahInput } from "@/lib/rupiah-input";
import { cn } from "@/lib/utils";

type RupiahInputProps = Omit<
  ComponentProps<"input">,
  "className" | "defaultValue" | "name" | "onChange" | "type" | "value"
> & {
  className?: string;
  defaultValue?: string;
  name: string;
};

export function RupiahInput({
  className,
  defaultValue = "",
  id,
  name,
  placeholder = "0",
  ...props
}: RupiahInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [rawValue, setRawValue] = useState(
    () => normalizeRupiahInput(defaultValue) ?? "",
  );
  const [tooLarge, setTooLarge] = useState(false);

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50",
          className,
        )}
      >
        <span aria-hidden="true" className="shrink-0 text-muted-foreground">
          Rp
        </span>
        <input
          {...props}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          pattern="[1-9][0-9.]*"
          maxLength={25}
          placeholder={placeholder}
          value={formatRupiahInput(rawValue)}
          aria-invalid={tooLarge || undefined}
          onChange={(event) => {
            const nextValue = normalizeRupiahInput(event.target.value);
            setTooLarge(nextValue === null);
            setRawValue(nextValue ?? "");
          }}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <input type="hidden" name={name} value={rawValue} />
      </div>
      {tooLarge && (
        <span role="alert" className="mt-1 block text-xs text-destructive">
          Nominal melebihi batas penyimpanan.
        </span>
      )}
    </>
  );
}
