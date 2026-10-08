export type ReceiptDraftView = {
  id: string;
  version: number;
  amount: string;
  transactionDate: string;
  merchant: string;
  note: string;
  categoryId: string;
  accountId: string;
  sourceKind: "fixture" | "local_ocr" | "ios_shortcut";
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

export function receiptDraftView(draft: {
  id: string;
  version: number;
  sourceKind: string;
  extractedAmount: bigint | null;
  extractedTransactionDate: Date | null;
  extractedMerchant: string | null;
  extractedNote: string | null;
  detectedInstitution: string | null;
  evidenceKind: string | null;
  paymentRail: string | null;
  ocrConfidence: number | null;
  institutionConfidence: number | null;
  suggestedCategoryId: string | null;
  selectedAccountId: string | null;
  amountConfidence: number | null;
  dateConfidence: number | null;
  merchantConfidence: number | null;
  categoryConfidence: number | null;
}): ReceiptDraftFormState {
  const evidenceKind = ["transfer", "qris", "receipt"].includes(
    draft.evidenceKind ?? "",
  )
    ? (draft.evidenceKind as "transfer" | "qris" | "receipt")
    : "unknown";
  const sourceKind = ["local_ocr", "ios_shortcut"].includes(draft.sourceKind)
    ? (draft.sourceKind as "local_ocr" | "ios_shortcut")
    : "fixture";
  return {
    phase: "review",
    draft: {
      id: draft.id,
      version: draft.version,
      sourceKind,
      amount: draft.extractedAmount?.toString() ?? "",
      transactionDate:
        draft.extractedTransactionDate?.toISOString().slice(0, 10) ?? "",
      merchant: draft.extractedMerchant ?? "",
      note: draft.extractedNote ?? "",
      accountId: draft.selectedAccountId ?? "",
      categoryId: draft.suggestedCategoryId ?? "",
      detection: {
        institution: draft.detectedInstitution ?? "",
        evidenceKind,
        paymentRail: draft.paymentRail ?? "",
        ocr: draft.ocrConfidence,
        institutionConfidence: draft.institutionConfidence,
      },
      confidence: {
        amount: draft.amountConfidence,
        date: draft.dateConfidence,
        merchant: draft.merchantConfidence,
        category: draft.categoryConfidence,
      },
    },
  };
}
