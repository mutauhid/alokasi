"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowLeftRight,
  CalendarDays,
  Download,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tags,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type ReportFilterValues = {
  from: string;
  to: string;
  type: string;
  accountId: string;
  categoryId: string;
  query: string;
};

type FilterOption = {
  id: string;
  label: string;
};

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-xl border bg-background px-3 text-sm text-foreground shadow-xs transition-colors focus:border-primary";

function FilterFields({
  values,
  accounts,
  categories,
  controlled,
  onChange,
}: {
  values: ReportFilterValues;
  accounts: FilterOption[];
  categories: FilterOption[];
  controlled?: boolean;
  onChange?: (name: keyof ReportFilterValues, value: string) => void;
}) {
  const valueProps = (name: keyof ReportFilterValues) =>
    controlled
      ? {
          value: values[name],
          onChange: (
            event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
          ) => onChange?.(name, event.target.value),
        }
      : { defaultValue: values[name] };

  return (
    <>
      <label className="text-xs font-medium text-muted-foreground">
        Dari tanggal
        <span className="relative block">
          <CalendarDays
            className="pointer-events-none absolute left-3 top-[1.05rem] size-4"
            aria-hidden="true"
          />
          <input
            className={`${inputClass} pl-9`}
            type="date"
            name="from"
            required
            max={controlled ? values.to || undefined : undefined}
            {...valueProps("from")}
          />
        </span>
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        Sampai tanggal
        <span className="relative block">
          <CalendarDays
            className="pointer-events-none absolute left-3 top-[1.05rem] size-4"
            aria-hidden="true"
          />
          <input
            className={`${inputClass} pl-9`}
            type="date"
            name="to"
            required
            min={controlled ? values.from || undefined : undefined}
            {...valueProps("to")}
          />
        </span>
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        Jenis transaksi
        <span className="relative block">
          <ArrowLeftRight
            className="pointer-events-none absolute left-3 top-[1.05rem] size-4"
            aria-hidden="true"
          />
          <select
            className={`${inputClass} pl-9`}
            name="type"
            {...valueProps("type")}
          >
            <option value="">Semua jenis</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
            <option value="transfer">Transfer internal</option>
          </select>
        </span>
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        Akun
        <span className="relative block">
          <WalletCards
            className="pointer-events-none absolute left-3 top-[1.05rem] size-4"
            aria-hidden="true"
          />
          <select
            className={`${inputClass} pl-9`}
            name="accountId"
            {...valueProps("accountId")}
          >
            <option value="">Semua akun</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.label}
              </option>
            ))}
          </select>
        </span>
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        Kategori
        <span className="relative block">
          <Tags
            className="pointer-events-none absolute left-3 top-[1.05rem] size-4"
            aria-hidden="true"
          />
          <select
            className={`${inputClass} pl-9`}
            name="categoryId"
            {...valueProps("categoryId")}
          >
            <option value="">Semua kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </span>
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        Pencarian
        <span className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-[1.05rem] size-4"
            aria-hidden="true"
          />
          <input
            className={`${inputClass} pl-9`}
            type="search"
            name="query"
            maxLength={100}
            placeholder="Judul, catatan, akun, kategori"
            {...valueProps("query")}
          />
        </span>
      </label>
    </>
  );
}

export function ReportFilterControls({
  workspaceId,
  applied,
  accounts,
  categories,
  activeCount,
  summary,
  resetHref,
  mobileExportHref,
}: {
  workspaceId: string;
  applied: ReportFilterValues;
  accounts: FilterOption[];
  categories: FilterOption[];
  activeCount: number;
  summary: string;
  resetHref: string;
  mobileExportHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(applied);
  const [dateError, setDateError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    setDraft(applied);
    setDateError(null);
    setOpen(nextOpen);
  }

  function updateDraft(name: keyof ReportFilterValues, value: string) {
    setDraft((current) => ({ ...current, [name]: value }));
    setDateError(null);
  }

  function validateDates(event: FormEvent<HTMLFormElement>) {
    if (draft.from > draft.to) {
      event.preventDefault();
      setDateError("Tanggal awal tidak boleh melewati tanggal akhir.");
    }
  }

  return (
    <section aria-label="Filter laporan">
      <details
        className="reports-v2-card group hidden rounded-2xl border bg-card md:block"
        open={activeCount > 0}
      >
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-2xl px-5 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <SlidersHorizontal className="size-4.5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-semibold">
              Filter laporan
              {activeCount > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                  {activeCount}
                </span>
              )}
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {summary}
            </span>
          </span>
          <span className="text-xs font-semibold text-primary group-open:hidden">
            Buka
          </span>
          <span className="hidden text-xs font-semibold text-primary group-open:inline">
            Tutup
          </span>
        </summary>
        <form
          action="/reports"
          method="get"
          className="grid gap-3 border-t px-5 py-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        >
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <FilterFields
            values={applied}
            accounts={accounts}
            categories={categories}
          />
          <div className="flex flex-wrap justify-end gap-2 md:col-span-2 lg:col-span-3 xl:col-span-6">
            <Button asChild variant="ghost" className="min-h-10 rounded-xl">
              <a href={resetHref}>
                <RotateCcw aria-hidden="true" />
                Reset
              </a>
            </Button>
            <Button type="submit" className="min-h-10 rounded-xl">
              Terapkan filter
            </Button>
          </div>
        </form>
      </details>

      <div className="reports-v2-card rounded-2xl border bg-card p-3 md:hidden">
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <div
            className={
              mobileExportHref ? "grid grid-cols-2 gap-2" : "grid grid-cols-1"
            }
          >
            <SheetTrigger asChild>
              <Button
                type="button"
                className="min-h-11 min-w-0 justify-start rounded-xl"
              >
                <SlidersHorizontal aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-left">
                  Filter laporan
                </span>
                {activeCount > 0 && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary-foreground/15 px-1.5 py-0.5 text-[10px] text-primary-foreground">
                    {activeCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            {mobileExportHref && (
              <Button
                asChild
                variant="outline"
                className="min-h-11 min-w-0 rounded-xl"
              >
                <a href={mobileExportHref} download>
                  <Download aria-hidden="true" />
                  Export CSV
                </a>
              </Button>
            )}
          </div>
          <SheetContent
            side="bottom"
            className="reports-v2-filter-sheet max-h-[92dvh] gap-0 rounded-t-3xl"
            closeLabel="Tutup filter laporan"
          >
            <SheetHeader className="shrink-0 border-b px-5 py-5 pr-16 text-left">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <SlidersHorizontal
                  className="size-5 text-primary"
                  aria-hidden="true"
                />
                Filter laporan
              </SheetTitle>
              <SheetDescription>
                Atur rentang dan detail transaksi, lalu terapkan untuk
                memperbarui laporan.
              </SheetDescription>
            </SheetHeader>
            <form
              id="mobile-report-filter"
              action="/reports"
              method="get"
              onSubmit={validateDates}
              className="contents"
            >
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <div className="reports-v2-filter-scroll grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-5">
                <FilterFields
                  values={draft}
                  accounts={accounts}
                  categories={categories}
                  controlled
                  onChange={updateDraft}
                />
                {dateError && (
                  <p
                    className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
                    role="alert"
                  >
                    {dateError}
                  </p>
                )}
              </div>
              <SheetFooter className="grid shrink-0 grid-cols-2 border-t bg-background/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
                <Button
                  asChild
                  variant="outline"
                  className="min-h-12 rounded-xl"
                >
                  <a href={resetHref}>Reset</a>
                </Button>
                <Button
                  type="submit"
                  form="mobile-report-filter"
                  className="min-h-12 rounded-xl"
                >
                  Terapkan filter
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
        <p className="mt-2 truncate px-1 text-[11px] text-muted-foreground">
          {summary}
        </p>
        {mobileExportHref && (
          <p className="mt-1 px-1 text-[10px] leading-4 text-muted-foreground">
            File CSV memuat nominal asli sesuai filter aktif.
          </p>
        )}
      </div>
    </section>
  );
}
