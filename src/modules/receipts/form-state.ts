export type ReceiptDraftView = {
  id: string;
  version: number;
  amount: string;
  transactionDate: string;
  merchant: string;
  note: string;
  categoryId: string;
  sourceKind: "fixture" | "local_ocr";
  detection: {
    institution: string;
    evidenceKind: "transfer" | "qris" | "receipt" | "unknown";
    paymentRail: string;
    ocr: number | null;
    institutionConfidence: number | null;
  };
  confidence: {
    amount: number | null;
    date: number | null;
    merchant: number | null;
    category: number | null;
  };
};

export type ReceiptDraftFormState = {
  phase: "idle" | "review";
  error?: string;
  message?: string;
  draft?: ReceiptDraftView;
};

export const initialReceiptDraftState: ReceiptDraftFormState = {
  phase: "idle",
};
