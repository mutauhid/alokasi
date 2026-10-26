import { transactionTitleKey } from "@/modules/transactions/suggestions";

export function categoryRuleKey(value: string) {
  return transactionTitleKey(value)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function parseCategoryRuleKeyword(value: string) {
  const keyword = value.trim().replace(/\s+/gu, " ");
  const keywordKey = categoryRuleKey(keyword);
  if (keyword.length < 2 || keyword.length > 60 || keywordKey.length < 2) {
    return null;
  }
  return { keyword, keywordKey };
}
