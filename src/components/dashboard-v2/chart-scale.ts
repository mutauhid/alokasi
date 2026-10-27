export type CashFlowScale = {
  minimum: bigint;
  maximum: bigint;
  ticks: bigint[];
};

function absolute(value: bigint) {
  return value < 0n ? -value : value;
}

function ceilingDivision(value: bigint, divisor: bigint) {
  return (value + divisor - 1n) / divisor;
}

function niceStep(value: bigint) {
  if (value <= 1n) return 1n;

  let magnitude = 1n;
  let reduced = value;
  while (reduced > 10n) {
    reduced = ceilingDivision(reduced, 10n);
    magnitude *= 10n;
  }

  const normalized = ceilingDivision(value, magnitude);
  if (normalized <= 1n) return magnitude;
  if (normalized <= 2n) return 2n * magnitude;
  if (normalized <= 5n) return 5n * magnitude;
  return 10n * magnitude;
}

export function buildCashFlowScale(values: bigint[]): CashFlowScale | null {
  if (values.length === 0 || values.every((value) => value === 0n)) {
    return null;
  }

  const lowest = values.reduce(
    (current, value) => (value < current ? value : current),
    0n,
  );
  const highest = values.reduce(
    (current, value) => (value > current ? value : current),
    0n,
  );

  if (lowest < 0n) {
    const largestAbsolute =
      absolute(lowest) > highest ? absolute(lowest) : highest;
    const step = niceStep(ceilingDivision(largestAbsolute, 2n));
    const limit = step * 2n;
    return {
      minimum: -limit,
      maximum: limit,
      ticks: [limit, step, 0n, -step, -limit],
    };
  }

  const step = niceStep(ceilingDivision(highest, 4n));
  const maximum = step * 4n;
  return {
    minimum: 0n,
    maximum,
    ticks: [maximum, step * 3n, step * 2n, step, 0n],
  };
}

export function scalePosition(
  value: bigint,
  scale: Pick<CashFlowScale, "minimum" | "maximum">,
) {
  const span = scale.maximum - scale.minimum;
  if (span <= 0n) return 0;
  const clamped =
    value < scale.minimum
      ? scale.minimum
      : value > scale.maximum
        ? scale.maximum
        : value;
  return Number(((clamped - scale.minimum) * 10_000n) / span) / 100;
}
