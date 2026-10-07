"use client";

import {
  TRANSACTION_PAGE_SIZES,
  type TransactionPageSize,
} from "@/modules/transactions/pagination";

export function TransactionPageSizeControl({
  workspaceId,
  pageSize,
}: {
  workspaceId: string;
  pageSize: TransactionPageSize;
}) {
  return (
    <form
      action="/transactions"
      method="get"
      className="flex flex-wrap items-center gap-2 text-sm"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="page" value="1" />
      <label htmlFor="transaction-page-size">Tampilkan</label>
      <select
        id="transaction-page-size"
        name="pageSize"
        defaultValue={pageSize}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="min-h-9 rounded-md border bg-background px-3 py-1 text-sm"
      >
        {TRANSACTION_PAGE_SIZES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span>transaksi</span>
    </form>
  );
}
