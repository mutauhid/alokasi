import { MAX_RUPIAH_DIGITS } from "@/lib/rupiah-input";

export type RupiahCalculatorOperator =
  "add" | "subtract" | "multiply" | "divide";

export type RupiahCalculationResult =
  { value: string; error: null } | { value: null; error: string };

export function calculateRupiah(
  leftValue: string,
  rightValue: string,
  operator: RupiahCalculatorOperator,
): RupiahCalculationResult {
  const left = BigInt(leftValue || "0");
  const right = BigInt(rightValue || "0");

  if (operator === "divide" && right === 0n) {
    return { value: null, error: "Tidak dapat membagi dengan nol." };
  }

  const result =
    operator === "add"
      ? left + right
      : operator === "subtract"
        ? left - right
        : operator === "multiply"
          ? left * right
          : left / right;

  if (result < 0n) {
    return { value: null, error: "Hasil nominal tidak boleh negatif." };
  }
  if (result > BigInt(MAX_RUPIAH_DIGITS)) {
    return { value: null, error: "Hasil melebihi batas penyimpanan." };
  }

  return { value: result.toString(), error: null };
}
