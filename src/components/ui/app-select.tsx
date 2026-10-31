"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const EMPTY_VALUE = "__alokasi_empty_select_value__";

export type AppSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

function radixValue(value: string) {
  return value === "" ? EMPTY_VALUE : value;
}

function actualValue(value: string) {
  return value === EMPTY_VALUE ? "" : value;
}

export function AppSelect({
  name,
  options,
  value,
  defaultValue = "",
  onValueChange,
  placeholder = "Pilih opsi",
  required = false,
  disabled = false,
  autoFocus = false,
  submitOnChange = false,
  id,
  ariaLabel,
  ariaDescribedBy,
  className,
  leading,
}: {
  name: string;
  options: AppSelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  submitOnChange?: boolean;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
  leading?: ReactNode;
}) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [invalid, setInvalid] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedValue = controlled ? value : internalValue;
  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );

  useEffect(() => {
    if (autoFocus) triggerRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const form = triggerRef.current?.closest("form");
    if (!form || controlled) return;
    const reset = () => {
      setInternalValue(defaultValue);
      setInvalid(false);
    };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [controlled, defaultValue]);

  function changeValue(nextRadixValue: string) {
    const nextValue = actualValue(nextRadixValue);
    if (!controlled) setInternalValue(nextValue);
    setInvalid(false);
    onValueChange?.(nextValue);
    if (submitOnChange) {
      requestAnimationFrame(() =>
        triggerRef.current?.closest("form")?.requestSubmit(),
      );
    }
  }

  return (
    <>
      <select
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        name={name}
        value={selectedValue}
        required={required}
        disabled={disabled}
        onChange={() => undefined}
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(true);
          triggerRef.current?.focus();
        }}
      >
        {!options.some((option) => option.value === "") && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option
            key={option.value || EMPTY_VALUE}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      <SelectPrimitive.Root
        value={radixValue(selectedValue)}
        onValueChange={changeValue}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          ref={triggerRef}
          id={id}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          className={cn(
            "group flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-xl border bg-background px-3 text-left text-sm shadow-xs outline-none transition-[border-color,background-color,box-shadow] hover:border-primary/45 hover:bg-accent/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-primary/60 data-[state=open]:bg-accent/35 data-[state=open]:ring-2 data-[state=open]:ring-primary/10 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
            className,
          )}
        >
          {leading ? (
            <span className="shrink-0 text-primary">{leading}</span>
          ) : null}
          <SelectPrimitive.Value
            className="min-w-0 flex-1 truncate"
            placeholder={placeholder}
          >
            {selectedOption?.label}
          </SelectPrimitive.Value>
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={7}
            align="start"
            collisionPadding={16}
            className="z-[110] max-h-[min(22rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] min-w-[min(12rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl shadow-black/30 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            <SelectPrimitive.ScrollUpButton className="flex h-7 items-center justify-center bg-popover text-muted-foreground">
              <ChevronUp className="size-4" aria-hidden="true" />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="p-1.5">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value || EMPTY_VALUE}
                  value={radixValue(option.value)}
                  disabled={option.disabled}
                  className="relative flex min-h-11 cursor-default select-none items-center rounded-lg py-2 pl-3 pr-9 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:font-semibold data-[state=checked]:text-primary"
                >
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-3 inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3.5" aria-hidden="true" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="flex h-7 items-center justify-center bg-popover text-muted-foreground">
              <ChevronDown className="size-4" aria-hidden="true" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </>
  );
}
