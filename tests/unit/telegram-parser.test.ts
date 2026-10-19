import { describe, expect, it } from "vitest";
import {
  parseExpenseMessage,
  parseTelegramTransactionMessage,
} from "../../src/modules/telegram-integration/parser";

describe("Telegram expense parser", () => {
  it("reads IDR shorthand and leaves account selection to the workspace", () => {
    expect(parseExpenseMessage("beli kopi 25rb")).toEqual({
      title: "beli kopi",
      amount: 25000n,
      accountHint: null,
    });
    expect(parseExpenseMessage("beli kopi 25rb bca")).toEqual({
      title: "beli kopi",
      amount: 25000n,
      accountHint: "bca",
    });
    expect(parseExpenseMessage("makan siang 25.000 Mandiri")).toEqual({
      title: "makan siang",
      amount: 25000n,
      accountHint: "Mandiri",
    });
  });

  it("rejects ambiguous or unsafe amounts", () => {
    for (const text of [
      "beli kopi",
      "beli kopi 0rb",
      "beli kopi 25,50",
      "beli kopi 999999999999999999999rb",
      "25rb",
    ])
      expect(parseExpenseMessage(text)).toBeNull();
  });

  it("recognizes explicit income and million shorthand", () => {
    expect(parseTelegramTransactionMessage("pemasukan: gaji 5jt bca")).toEqual({
      type: "income",
      title: "gaji",
      amount: 5_000_000n,
      accountHint: "bca",
    });
    expect(parseTelegramTransactionMessage("Pemasukan : bonus 2juta")).toEqual({
      type: "income",
      title: "bonus",
      amount: 2_000_000n,
      accountHint: null,
    });
    expect(parseTelegramTransactionMessage("beli bensin 50rb")).toMatchObject({
      type: "expense",
      amount: 50_000n,
    });
  });
});
