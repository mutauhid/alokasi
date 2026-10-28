export const TRANSACTION_PAGE_SIZES = [5, 10, 20, 30, 50, 100] as const;

export type TransactionPageSize = (typeof TRANSACTION_PAGE_SIZES)[number];

export type TransactionPagination = {
  page: number;
  pageSize: TransactionPageSize;
  search: string;
  dateFrom: string;
  dateTo: string;
};

type PaginationQuery = {
  page?: string | string[];
  pageSize?: string | string[];
  search?: string | string[];
  from?: string | string[];
  to?: string | string[];
};

function singleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function validDateValue(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return "";
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value
    ? value
    : "";
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
  const search = (singleValue(query.search) ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ")
    .slice(0, 100);
  const dateFrom = validDateValue(singleValue(query.from));
  const dateTo = validDateValue(singleValue(query.to));

  return { page, pageSize, search, dateFrom, dateTo };
}

export function buildTransactionPageMeta(
  totalCount: number,
  pagination: Pick<TransactionPagination, "page" | "pageSize">,
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
