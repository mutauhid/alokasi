export const MAX_RUPIAH_DIGITS = "9223372036854775807";

export function normalizeRupiahInput(value: string): string | null {
  const withoutZeroDecimals = value.trim().replace(/[.,]00$/, "");
  const digits = withoutZeroDecimals.replace(/\D/g, "");
  if (!digits) return "";

  const normalized = digits.replace(/^0+(?=\d)/, "");
  if (
    normalized.length > MAX_RUPIAH_DIGITS.length ||
    (normalized.length === MAX_RUPIAH_DIGITS.length &&
      normalized > MAX_RUPIAH_DIGITS)
  ) {
    return null;
  }

  return normalized;
}

export function formatRupiahInput(value: string): string {
  const normalized = normalizeRupiahInput(value);
  if (!normalized) return normalized ?? "";
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
