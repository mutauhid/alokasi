export type ParsedExpense = {
  title: string;
  amount: bigint;
  accountHint: string | null;
};

/** Format: judul nominal [nama akun]. Values outside this shape need clarification. */
export function parseExpenseMessage(text: string): ParsedExpense | null {
  const normalized = text.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (normalized.length > 160) return null;
  const match = /^(.*?)\s+(\d[\d.,]*)(?:\s*(rb|ribu|k))?(?:\s+(.+))?$/iu.exec(
    normalized,
  );
  if (!match) return null;
  const title = match[1].trim();
  const accountHint = match[4]?.trim() || null;
  if (!title || title.length > 100 || (accountHint && accountHint.length > 100))
    return null;
  const numeric = match[2];
  if (!/^(?:\d+|\d{1,3}(?:[.,]\d{3})+)$/u.test(numeric)) return null;
  const amount =
    BigInt(numeric.replace(/[.,]/gu, "")) * (match[3] ? 1000n : 1n);
  if (amount < 1n || amount > 9223372036854775807n) return null;
  return { title, amount, accountHint };
}
