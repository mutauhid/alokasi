import type { DuplicateTransactionWarning } from "./duplicates";

export type TransactionCreateState = {
  error?: string;
  duplicate?: DuplicateTransactionWarning;
};

export const initialTransactionCreateState: TransactionCreateState = {};
