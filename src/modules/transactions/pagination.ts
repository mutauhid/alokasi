export const TRANSACTION_PAGE_SIZES = [5, 10, 20, 30, 50, 100] as const;

export type TransactionPageSize = (typeof TRANSACTION_PAGE_SIZES)[number];

export type TransactionPagination = {
  page: number;
  pageSize: TransactionPageSize;
};

type PaginationQuery = {
  page?: string | string[];
  pageSize?: string | string[];
};

function singleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function parseTransactionPagination(
  query: PaginationQuery,
): TransactionPagination {
  const rawPage = singleValue(query.page);
  const parsedPage =
    rawPage && /^[1-9]\d*$/u.test(rawPage) ? Number(rawPage) : 1;
  const page = Number.isSafeInteger(parsedPage) ? parsedPage : 1;
  const rawPageSize = Number(singleValue(query.pageSize));
  const pageSize = TRANSACTION_PAGE_SIZES.includes(
    rawPageSize as TransactionPageSize,
  )
    ? (rawPageSize as TransactionPageSize)
    : 10;

  return { page, pageSize };
}

export function buildTransactionPageMeta(
  totalCount: number,
  pagination: TransactionPagination,
) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  const page = Math.min(pagination.page, totalPages);

  return {
    page,
    pageSize: pagination.pageSize,
    totalCount,
    totalPages,
    from: totalCount === 0 ? 0 : (page - 1) * pagination.pageSize + 1,
    to: Math.min(page * pagination.pageSize, totalCount),
  };
}
