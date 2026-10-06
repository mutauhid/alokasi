export type CsvImportPreviewRow = {
  rowNumber: number;
  type: "income" | "expense";
  title: string;
  amount: string;
  transactionDate: string;
  categoryId: string;
  note: string | null;
  possibleDuplicate: boolean;
};

export type CsvImportPreviewState =
  | { phase: "idle"; error?: string }
  | { phase: "error"; error: string }
  | {
      phase: "ready";
      batchKey: string;
      fileName: string;
      accountId: string;
      sourceRowCount: number;
      rows: CsvImportPreviewRow[];
      issues: Array<{ rowNumber: number; message: string }>;
    };

export const initialCsvImportPreviewState: CsvImportPreviewState = {
  phase: "idle",
};
