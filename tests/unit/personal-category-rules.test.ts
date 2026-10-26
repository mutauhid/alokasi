import { describe, expect, it } from "vitest";
import {
  categoryRuleKey,
  parseCategoryRuleKeyword,
} from "../../src/modules/category-rules/domain";

describe("personal category rules", () => {
  it("normalizes case, punctuation, and whitespace for uniqueness", () => {
    expect(categoryRuleKey("  Kopi-Susu!! ")).toBe("kopi susu");
    expect(parseCategoryRuleKeyword("  Kopi   Susu ")).toEqual({
      keyword: "Kopi Susu",
      keywordKey: "kopi susu",
    });
  });

  it("rejects empty and one-character keywords", () => {
    expect(parseCategoryRuleKeyword("!")).toBeNull();
    expect(parseCategoryRuleKeyword("a")).toBeNull();
  });
});
