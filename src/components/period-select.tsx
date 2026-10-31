"use client";

import { CalendarDays, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export type PeriodSelectOption = {
  value: string;
  label: string;
};

export function PeriodSelect({
  name,
  defaultValue,
  options,
  ariaLabel,
  className,
}: {
  name: string;
  defaultValue: string;
  options: PeriodSelectOption[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <SelectPrimitive.Root name={name} defaultValue={defaultValue}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          "group flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-xl border bg-card px-3 text-left text-xs shadow-xs outline-none transition-[border-color,background-color,box-shadow] hover:border-primary/45 hover:bg-accent/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 data-[state=open]:border-primary/60 data-[state=open]:bg-accent/35 data-[state=open]:ring-2 data-[state=open]:ring-primary/10",
          className,
        )}
      >
        <CalendarDays
          className="size-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        <SelectPrimitive.Value className="min-w-0 flex-1 truncate" />
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
          className="z-[100] max-h-[min(22rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] min-w-[min(19rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl shadow-black/30 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <SelectPrimitive.ScrollUpButton className="flex h-7 items-center justify-center bg-popover text-muted-foreground">
            <ChevronUp className="size-4" aria-hidden="true" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1.5">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex min-h-11 cursor-default select-none items-center rounded-lg py-2 pl-3 pr-9 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:font-semibold data-[state=checked]:text-primary"
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
  );
}
