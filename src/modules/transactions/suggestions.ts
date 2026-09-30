export type TransactionSuggestion = {
  title: string;
  type: "income" | "expense" | "transfer";
  categoryId: string | null;
  categoryName: string | null;
  usageCount: number;
  lastUsedAt: string;
};

type SuggestionSource = {
  title: string;
  type: TransactionSuggestion["type"];
  categoryId: string | null;
  transactionDate: Date;
  category: { name: string; archivedAt: Date | null } | null;
};

export function transactionTitleKey(title: string) {
  return title
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("id-ID");
}

export function buildTransactionSuggestions(
  transactions: SuggestionSource[],
  perTypeLimit = 12,
): TransactionSuggestion[] {
  const groups = new Map<string, TransactionSuggestion>();

  for (const transaction of transactions) {
    const isTransfer = transaction.type === "transfer";
    if (
      !isTransfer &&
      (!transaction.categoryId ||
        !transaction.category ||
        transaction.category.archivedAt)
    ) {
      continue;
    }
    const titleKey = transactionTitleKey(transaction.title);
    if (!titleKey) continue;
    const categoryId = isTransfer ? null : transaction.categoryId;
    const key = `${transaction.type}\u0000${titleKey}\u0000${categoryId ?? ""}`;
    const usedAt = transaction.transactionDate.toISOString();
    const current = groups.get(key);
    if (current) {
      current.usageCount += 1;
      if (usedAt > current.lastUsedAt) {
        current.title = transaction.title;
        current.lastUsedAt = usedAt;
      }
      continue;
    }
    groups.set(key, {
      title: transaction.title,
      type: transaction.type,
      categoryId,
      categoryName: isTransfer ? null : (transaction.category?.name ?? null),
      usageCount: 1,
      lastUsedAt: usedAt,
    });
  }

  const transactionTypes = ["income", "expense", "transfer"] as const;
  return transactionTypes.flatMap((type) =>
    [...groups.values()]
      .filter((suggestion) => suggestion.type === type)
      .sort(
        (left, right) =>
          right.usageCount - left.usageCount ||
          right.lastUsedAt.localeCompare(left.lastUsedAt) ||
          left.title.localeCompare(right.title, "id-ID"),
      )
      .slice(0, perTypeLimit),
  );
}
