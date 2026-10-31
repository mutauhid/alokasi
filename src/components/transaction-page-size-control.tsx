"use client";

import {
  TRANSACTION_PAGE_SIZES,
  type TransactionPageSize,
} from "@/modules/transactions/pagination";
import { AppSelect } from "@/components/ui/app-select";

export function TransactionPageSizeControl({
  workspaceId,
  pageSize,
  search,
  dateFrom,
  dateTo,
}: {
  workspaceId: string;
  pageSize: TransactionPageSize;
  search: string;
  dateFrom: string;
  dateTo: string;
}) {
  return (
    <form
      action="/transactions"
      method="get"
      className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="page" value="1" />
      {search && <input type="hidden" name="search" value={search} />}
      {dateFrom && <input type="hidden" name="from" value={dateFrom} />}
      {dateTo && <input type="hidden" name="to" value={dateTo} />}
      <label htmlFor="transaction-page-size">Tampilkan</label>
      <AppSelect
        id="transaction-page-size"
        name="pageSize"
        defaultValue={pageSize.toString()}
        submitOnChange
        className="min-h-9 rounded-lg border bg-background px-3 py-1 text-sm text-foreground"
        options={TRANSACTION_PAGE_SIZES.map((option) => ({
          value: option.toString(),
          label: option.toString(),
        }))}
      />
      <span>transaksi</span>
    </form>
  );
}
