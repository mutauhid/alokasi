"use client";

import { Children, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReportProgressiveList({
  children,
  initialCount,
  step = initialCount,
  itemLabel,
  className,
}: {
  children: ReactNode;
  initialCount: number;
  step?: number;
  itemLabel: string;
  className?: string;
}) {
  const items = Children.toArray(children);
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const visibleItems = items.slice(0, visibleCount);
  const hiddenCount = items.length - visibleItems.length;
  const expanded = hiddenCount === 0 && items.length > initialCount;

  return (
    <>
      <ul className={className}>{visibleItems}</ul>
      {items.length > initialCount && (
        <div className="border-t px-4 py-3 text-center sm:px-6">
          <Button
            type="button"
            variant="ghost"
            className="min-h-10 rounded-xl text-primary"
            onClick={() =>
              setVisibleCount((current) =>
                current >= items.length
                  ? initialCount
                  : Math.min(items.length, current + step),
              )
            }
          >
            {expanded ? (
              <>
                Tampilkan lebih ringkas
                <ChevronUp aria-hidden="true" />
              </>
            ) : (
              <>
                Lihat {Math.min(step, hiddenCount)} {itemLabel} lagi
                <ChevronDown aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );
}
