import { reportPercentageChangeTenths } from "@/modules/reports/domain";

const EXTREME_CHANGE_TENTHS = 10_000n;

export type ReportComparisonPresentation =
  | { kind: "stable"; delta: 0n }
  | { kind: "new"; delta: bigint }
  | {
      kind: "sign-change";
      delta: bigint;
      state: "surplus" | "defisit" | "seimbang";
    }
  | { kind: "amount"; delta: bigint }
  | { kind: "percentage"; delta: bigint; percentageTenths: bigint };

function absolute(value: bigint) {
  return value < 0n ? -value : value;
}

/**
 * Chooses an honest comparison treatment without changing report totals.
 * Four-digit percentage changes and net-cash-flow sign changes are easier to
 * understand as a nominal delta or a surplus/deficit state transition.
 */
export function reportComparisonPresentation(
  current: bigint,
  previous: bigint,
  mode: "standard" | "net" = "standard",
): ReportComparisonPresentation {
  const delta = current - previous;
  if (delta === 0n) return { kind: "stable", delta: 0n };
  if (previous === 0n) return { kind: "new", delta };

  if (
    mode === "net" &&
    ((previous > 0n && current <= 0n) || (previous < 0n && current >= 0n))
  ) {
    return {
      kind: "sign-change",
      delta,
      state: current > 0n ? "surplus" : current < 0n ? "defisit" : "seimbang",
    };
  }

  const percentageTenths = reportPercentageChangeTenths(current, previous)!;
  if (absolute(percentageTenths) >= EXTREME_CHANGE_TENTHS) {
    return { kind: "amount", delta };
  }

  return { kind: "percentage", delta, percentageTenths };
}
