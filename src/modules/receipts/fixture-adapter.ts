export function simulatedReceiptExtraction(today: Date) {
  return {
    sourceKind: "fixture" as const,
    extractedAmount: 125000n,
    extractedTransactionDate: today,
    extractedMerchant: "Toko contoh",
    extractedNote: "Belanja kebutuhan",
    amountConfidence: 82,
    dateConfidence: 76,
    merchantConfidence: 68,
    categoryConfidence: 61,
  };
}
