"use client";

import { useState } from "react";
import { ArrowLeft, Calculator, Delete } from "lucide-react";
import {
  calculateRupiah,
  type RupiahCalculatorOperator,
} from "@/lib/rupiah-calculator";
import { formatRupiahInput, normalizeRupiahInput } from "@/lib/rupiah-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const operators: Array<{
  value: RupiahCalculatorOperator;
  label: string;
  symbol: string;
}> = [
  { value: "divide", label: "Bagi", symbol: "÷" },
  { value: "multiply", label: "Kali", symbol: "×" },
  { value: "subtract", label: "Kurang", symbol: "−" },
  { value: "add", label: "Tambah", symbol: "+" },
];

function operatorSymbol(operator: RupiahCalculatorOperator | null) {
  return operators.find((item) => item.value === operator)?.symbol ?? "";
}

export function RupiahCalculator({
  initialValue,
  onApply,
  onClose,
}: {
  initialValue: string;
  onApply: (value: string) => void;
  onClose: () => void;
}) {
  const [display, setDisplay] = useState(initialValue || "0");
  const [leftValue, setLeftValue] = useState<string | null>(null);
  const [operator, setOperator] = useState<RupiahCalculatorOperator | null>(
    null,
  );
  const [replaceDisplay, setReplaceDisplay] = useState(Boolean(initialValue));
  const [error, setError] = useState<string | null>(null);

  function appendDigits(digits: string) {
    setError(null);
    const next = replaceDisplay
      ? digits
      : `${display === "0" ? "" : display}${digits}`;
    const normalized = normalizeRupiahInput(next);
    if (normalized === null) {
      setError("Nominal melebihi batas penyimpanan.");
      return;
    }
    setDisplay(normalized || "0");
    setReplaceDisplay(false);
  }

  function runCalculation(
    currentLeft: string,
    currentRight: string,
    currentOperator: RupiahCalculatorOperator,
  ) {
    const result = calculateRupiah(currentLeft, currentRight, currentOperator);
    if (result.value === null) {
      setError(result.error);
      return null;
    }
    setError(null);
    setDisplay(result.value);
    return result.value;
  }

  function chooseOperator(nextOperator: RupiahCalculatorOperator) {
    let nextLeft = display;
    if (leftValue !== null && operator && !replaceDisplay) {
      const calculated = runCalculation(leftValue, display, operator);
      if (calculated === null) return;
      nextLeft = calculated;
    } else if (leftValue !== null && replaceDisplay) {
      nextLeft = leftValue;
    }
    setLeftValue(nextLeft);
    setOperator(nextOperator);
    setReplaceDisplay(true);
  }

  function calculatePending() {
    if (leftValue === null || !operator || replaceDisplay) return display;
    const result = runCalculation(leftValue, display, operator);
    if (result === null) return null;
    setLeftValue(null);
    setOperator(null);
    setReplaceDisplay(true);
    return result;
  }

  function clear() {
    setDisplay("0");
    setLeftValue(null);
    setOperator(null);
    setReplaceDisplay(false);
    setError(null);
  }

  function backspace() {
    if (replaceDisplay) return;
    setError(null);
    setDisplay((current) => (current.length > 1 ? current.slice(0, -1) : "0"));
  }

  function applyResult() {
    const result = calculatePending();
    if (result === null) return;
    onApply(result);
  }

  const numberButtonClass =
    "min-h-11 rounded-xl border bg-background text-sm font-semibold shadow-xs hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <section
      aria-label="Kalkulator nominal"
      className="mt-2 rounded-2xl border bg-muted/25 p-3 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Calculator className="size-4 text-primary" aria-hidden="true" />
          Kalkulator
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Tutup
        </button>
      </div>
      <div className="mt-3 rounded-xl border bg-background px-3 py-3 text-right">
        <p className="min-h-4 text-xs text-muted-foreground" aria-hidden="true">
          {leftValue !== null && operator
            ? `${formatRupiahInput(leftValue)} ${operatorSymbol(operator)}`
            : "Hasil perhitungan"}
        </p>
        <p
          className="mt-1 break-all text-xl font-semibold tabular-nums"
          aria-live="polite"
        >
          Rp {formatRupiahInput(display)}
        </p>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="mt-3 grid grid-cols-4 gap-2">
        <button type="button" onClick={clear} className={numberButtonClass}>
          C
        </button>
        <button
          type="button"
          onClick={backspace}
          aria-label="Hapus satu angka"
          className={numberButtonClass}
        >
          <Delete className="mx-auto size-4" aria-hidden="true" />
        </button>
        {operators.slice(0, 2).map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => chooseOperator(item.value)}
            aria-label={item.label}
            aria-pressed={operator === item.value}
            className={cn(
              numberButtonClass,
              operator === item.value && "border-primary bg-primary/10",
            )}
          >
            {item.symbol}
          </button>
        ))}
        {["7", "8", "9"].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => appendDigits(digit)}
            className={numberButtonClass}
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          onClick={() => chooseOperator("subtract")}
          aria-label="Kurang"
          aria-pressed={operator === "subtract"}
          className={cn(
            numberButtonClass,
            operator === "subtract" && "border-primary bg-primary/10",
          )}
        >
          −
        </button>
        {["4", "5", "6"].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => appendDigits(digit)}
            className={numberButtonClass}
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          onClick={() => chooseOperator("add")}
          aria-label="Tambah"
          aria-pressed={operator === "add"}
          className={cn(
            numberButtonClass,
            operator === "add" && "border-primary bg-primary/10",
          )}
        >
          +
        </button>
        {["1", "2", "3"].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => appendDigits(digit)}
            className={numberButtonClass}
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          onClick={calculatePending}
          aria-label="Hitung hasil"
          className={cn(numberButtonClass, "row-span-2 bg-accent")}
        >
          =
        </button>
        <button
          type="button"
          onClick={() => appendDigits("0")}
          className={cn(numberButtonClass, "col-span-2")}
        >
          0
        </button>
        <button
          type="button"
          onClick={() => appendDigits("00")}
          className={numberButtonClass}
        >
          00
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Pembagian dibulatkan ke Rupiah penuh.
      </p>
      <Button
        type="button"
        onClick={applyResult}
        disabled={Boolean(error) || display === "0"}
        className="mt-3 min-h-11 w-full rounded-xl"
      >
        Gunakan hasil Rp {formatRupiahInput(display)}
      </Button>
    </section>
  );
}
