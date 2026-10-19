export type TelegramTransactionType = "income" | "expense";

export type ParsedTelegramTransaction = {
  type: TelegramTransactionType;
  title: string;
  amount: bigint;
  accountHint: string | null;
};

/** Format: [pemasukan:|pengeluaran:] judul nominal [nama akun]. */
export function parseTelegramTransactionMessage(
  text: string,
  fallbackType: TelegramTransactionType = "expense",
): ParsedTelegramTransaction | null {
  let normalized = text.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (normalized.length > 160) return null;
  let type = fallbackType;
  const prefix = /^(pemasukan|pengeluaran)\s*:\s*(.+)$/iu.exec(normalized);
  if (prefix) {
    type =
      prefix[1].toLocaleLowerCase("id-ID") === "pemasukan"
        ? "income"
        : "expense";
    normalized = prefix[2];
  }
  const match =
    /^(.*?)\s+(\d[\d.,]*)(?:\s*(rb|ribu|k|jt|juta))?(?:\s+(.+))?$/iu.exec(
      normalized,
    );
  if (!match) return null;
  const title = match[1].trim();
  const accountHint = match[4]?.trim() || null;
  if (!title || title.length > 100 || (accountHint && accountHint.length > 100))
    return null;
  const numeric = match[2];
  if (!/^(?:\d+|\d{1,3}(?:[.,]\d{3})+)$/u.test(numeric)) return null;
  const suffix = match[3]?.toLocaleLowerCase("id-ID");
  const multiplier =
    suffix === "jt" || suffix === "juta" ? 1_000_000n : suffix ? 1_000n : 1n;
  const amount = BigInt(numeric.replace(/[.,]/gu, "")) * multiplier;
  if (amount < 1n || amount > 9223372036854775807n) return null;
  return { type, title, amount, accountHint };
}

/** Kept for callers that explicitly need the legacy expense-only shape. */
export function parseExpenseMessage(text: string) {
  const parsed = parseTelegramTransactionMessage(text, "expense");
  if (!parsed) return null;
  return {
    title: parsed.title,
    amount: parsed.amount,
    accountHint: parsed.accountHint,
  };
}
