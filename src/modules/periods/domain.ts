import { z } from "zod";

export const changeCycleInput = z.object({
  workspaceId: z.uuid(),
  startDay: z.coerce.number().int().min(1).max(31),
  version: z.coerce.number().int().positive(),
});

export function anchorDate(year: number, month: number, startDay: number) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(startDay, lastDay)));
}

export function isAnchor(date: Date, startDay: number) {
  return (
    anchorDate(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      startDay,
    ).valueOf() === date.valueOf()
  );
}

export function firstAnchorAfter(date: Date, startDay: number) {
  const current = anchorDate(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    startDay,
  );
  return current > date
    ? current
    : anchorDate(date.getUTCFullYear(), date.getUTCMonth() + 1, startDay);
}

export function periodContaining(date: Date, startDay: number) {
  const current = anchorDate(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    startDay,
  );
  const start =
    date >= current
      ? current
      : anchorDate(date.getUTCFullYear(), date.getUTCMonth() - 1, startDay);
  return { start, end: firstAnchorAfter(start, startDay) };
}

export function previewImmediateCycleChange(
  activeStart: Date,
  today: Date,
  startDay: number,
) {
  const natural = periodContaining(today, startDay);
  const rebasedStart =
    natural.start > activeStart ? natural.start : activeStart;
  return {
    historicalSplit:
      rebasedStart > activeStart
        ? { start: activeStart, end: rebasedStart }
        : null,
    active: {
      start: rebasedStart,
      end: natural.end,
      isTransition: !isAnchor(rebasedStart, startDay),
    },
    nextRegular: {
      start: natural.end,
      end: firstAnchorAfter(natural.end, startDay),
    },
  };
}
