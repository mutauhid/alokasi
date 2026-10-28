"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ArrowLeft, MoreHorizontal, Pencil } from "lucide-react";
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
  trigger,
  editContent,
  editHeading = "Ubah transaksi",
  editLabel = "Ubah transaksi",
  deleteAction,
  presentation = "bottom",
}: {
  title: string;
  children: ReactNode;
  heading?: string;
  triggerLabel?: string;
  trigger?: ReactNode;
  editContent?: ReactNode;
  editHeading?: string;
  editLabel?: string;
  deleteAction?: ReactNode;
  presentation?: "bottom" | "drawer";
}) {
  const [view, setView] = useState<"detail" | "edit">("detail");

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) setView("detail");
      }}
    >
      <SheetTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-xl"
            aria-label={triggerLabel ?? `Kelola transaksi ${title}`}
          >
            <MoreHorizontal className="size-5" aria-hidden="true" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side={presentation === "drawer" ? "responsive" : "bottom"}
        closeLabel={
          presentation === "drawer" ? "Tutup detail transaksi" : "Tutup panel"
        }
        className={
          presentation === "drawer"
            ? "gap-2 overflow-y-auto bg-card px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 md:pt-5"
            : "max-h-[92dvh] overflow-y-auto rounded-t-3xl border-x px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 sm:left-1/2 sm:right-auto sm:w-[calc(100vw-2rem)] sm:max-w-3xl sm:-translate-x-1/2 sm:px-6"
        }
      >
        <div
          className={`mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/25 ${presentation === "drawer" ? "md:hidden" : ""}`}
          aria-hidden="true"
        />
        <SheetHeader className="px-0 pb-1 pr-12">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle>{view === "edit" ? editHeading : heading}</SheetTitle>
              <SheetDescription className="mt-1.5 break-words">
                {title}
              </SheetDescription>
            </div>
            {view === "detail" && (editContent || deleteAction) && (
              <div className="flex shrink-0 gap-2">
                {editContent && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-11 rounded-xl"
                    aria-label={editLabel}
                    title={editLabel}
                    onClick={() => setView("edit")}
                  >
                    <Pencil className="size-4.5" aria-hidden="true" />
                  </Button>
                )}
                {deleteAction}
              </div>
            )}
          </div>
        </SheetHeader>
        {view === "detail" ? (
          <div className="space-y-4 pb-2">{children}</div>
        ) : (
          <div className="space-y-4 pb-2">
            <Button
              type="button"
              variant="ghost"
              className="-ml-2"
              onClick={() => setView("detail")}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Kembali ke detail
            </Button>
            {editContent}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
