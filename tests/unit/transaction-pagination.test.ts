import { describe, expect, it } from "vitest";
import {
  buildTransactionPageMeta,
  parseTransactionPagination,
} from "../../src/modules/transactions/pagination";

describe("transaction pagination", () => {
  it("uses page 1 and 10 items by default", () => {
    expect(parseTransactionPagination({})).toEqual({ page: 1, pageSize: 10 });
  });

  it.each([5, 10, 20, 30, 50, 100])(
    "accepts the supported page size %i",
    (pageSize) => {
      expect(
        parseTransactionPagination({ page: "3", pageSize: String(pageSize) }),
      ).toEqual({ page: 3, pageSize });
    },
  );

  it("falls back safely for invalid or repeated query values", () => {
    expect(parseTransactionPagination({ page: "0", pageSize: "25" })).toEqual({
      page: 1,
      pageSize: 10,
    });
    expect(
      parseTransactionPagination({ page: ["2", "3"], pageSize: ["5", "10"] }),
    ).toEqual({ page: 1, pageSize: 10 });
  });

  it("clamps a page beyond the last page and reports its visible range", () => {
    expect(buildTransactionPageMeta(23, { page: 9, pageSize: 10 })).toEqual({
      page: 3,
      pageSize: 10,
      totalCount: 23,
      totalPages: 3,
      from: 21,
      to: 23,
    });
  });

  it("keeps empty results on page one", () => {
    expect(buildTransactionPageMeta(0, { page: 4, pageSize: 20 })).toEqual({
      page: 1,
      pageSize: 20,
      totalCount: 0,
      totalPages: 1,
      from: 0,
      to: 0,
    });
  });
});
