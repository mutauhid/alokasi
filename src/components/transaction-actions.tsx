"use client";

import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function TransactionActions({
  title,
  children,
  heading = "Kelola transaksi",
  triggerLabel,
}: {
  title: string;
  children: ReactNode;
  heading?: string;
  triggerLabel?: string;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 rounded-xl"
          aria-label={triggerLabel ?? `Kelola transaksi ${title}`}
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-3xl border-x px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 sm:left-1/2 sm:right-auto sm:w-[calc(100vw-2rem)] sm:max-w-3xl sm:-translate-x-1/2 sm:px-6"
      >
        <div
          className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/25"
          aria-hidden="true"
        />
        <SheetHeader className="px-0 pb-2 pr-12">
          <SheetTitle>{heading}</SheetTitle>
          <SheetDescription className="break-words">{title}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 pb-2">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
