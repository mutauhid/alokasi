import "server-only";

import { cache } from "react";
import { getDatabase } from "@/server/db/client";
import { FinanceDomainError } from "@/modules/finance/errors";
import {
  firstAnchorAfter,
  isAnchor,
  periodContaining,
  previewImmediateCycleChange,
} from "./domain";

const resolvePeriod = cache(async (workspaceId: string, todayIso: string) => {
  const today = new Date(todayIso);
  const db = getDatabase();
  const existing = await db.budgetPeriod.findFirst({
    where: {
      workspaceId,
      startDate: { lte: today },
      endDateExclusive: { gt: today },
    },
  });
  if (existing) return existing;
  return db.$transaction(async (tx) => {
    let latest = await tx.budgetPeriod.findFirst({
      where: { workspaceId },
      orderBy: { startDate: "desc" },
    });
    if (!latest) {
      const setting: { startDay: number; version: number } | null =
        await tx.cycleSetting.findFirst({
          where: { workspaceId, effectiveDate: { lte: today } },
          orderBy: { version: "desc" },
        });
      if (!setting) throw new FinanceDomainError("PERIOD_NOT_AVAILABLE");
      const bounds = periodContaining(today, setting.startDay);
      latest = await tx.budgetPeriod.create({
        data: {
          workspaceId,
          startDate: bounds.start,
          endDateExclusive: bounds.end,
          cycleSettingVersion: setting.version,
        },
      });
    }
    while (latest.endDateExclusive <= today) {
      const setting: { startDay: number; version: number } | null =
        await tx.cycleSetting.findFirst({
          where: {
            workspaceId,
            effectiveDate: { lte: latest.endDateExclusive },
          },
          orderBy: { version: "desc" },
        });
      if (!setting) throw new FinanceDomainError("PERIOD_NOT_AVAILABLE");
      const start: Date = latest.endDateExclusive;
      const end = firstAnchorAfter(start, setting.startDay);
      latest = await tx.budgetPeriod.create({
        data: {
          workspaceId,
          startDate: start,
          endDateExclusive: end,
          cycleSettingVersion: setting.version,
          isTransition: !isAnchor(start, setting.startDay),
        },
      });
    }
    return latest;
  });
});

export function ensurePeriod(workspaceId: string, today: Date) {
  return resolvePeriod(workspaceId, today.toISOString());
}

const resolvePeriodSelection = cache(
  async (workspaceId: string, todayIso: string, requestedPeriodId: string) => {
    const today = new Date(todayIso);
    const activePeriod = await ensurePeriod(workspaceId, today);
    const periods = await getDatabase().budgetPeriod.findMany({
      where: {
        workspaceId,
        startDate: { lte: activePeriod.startDate },
      },
      orderBy: { startDate: "desc" },
    });
    const selectedIndex = Math.max(
      0,
      requestedPeriodId
        ? periods.findIndex((period) => period.id === requestedPeriodId)
        : 0,
    );
    const selectedPeriod = periods[selectedIndex] ?? activePeriod;
    return {
      activePeriod,
      selectedPeriod,
      periods,
      isActivePeriod: selectedPeriod.id === activePeriod.id,
      previousPeriod: periods[selectedIndex + 1] ?? null,
      trendPeriods: periods.slice(selectedIndex, selectedIndex + 6).reverse(),
    };
  },
);

export function getPeriodSelection(
  workspaceId: string,
  today: Date,
  requestedPeriodId?: string,
) {
  return resolvePeriodSelection(
    workspaceId,
    today.toISOString(),
    requestedPeriodId ?? "",
  );
}

export async function getCycleOverview(workspaceId: string, today: Date) {
  const period = await ensurePeriod(workspaceId, today);
  const [setting, pendingSetting] = await Promise.all([
    getDatabase().cycleSetting.findUniqueOrThrow({
      where: {
        workspaceId_version: {
          workspaceId,
          version: period.cycleSettingVersion,
        },
      },
    }),
    getDatabase().cycleSetting.findFirst({
      where: {
        workspaceId,
        version: { gt: period.cycleSettingVersion },
        effectiveDate: { gte: period.endDateExclusive },
      },
      orderBy: { version: "desc" },
    }),
  ]);
  return { period, setting, pendingSetting };
}

export async function changeCycleStartDay(
  context: { workspaceId: string; actorId: string; today: Date },
  input: { startDay: number; version: number },
) {
  const db = getDatabase();
  await ensurePeriod(context.workspaceId, context.today);
  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM app.workspaces
        WHERE id = ${context.workspaceId}::uuid
        FOR UPDATE
      `;
      const active = await tx.budgetPeriod.findFirstOrThrow({
        where: {
          workspaceId: context.workspaceId,
          startDate: { lte: context.today },
          endDateExclusive: { gt: context.today },
        },
      });
      const current = await tx.cycleSetting.findUniqueOrThrow({
        where: {
          workspaceId_version: {
            workspaceId: context.workspaceId,
            version: active.cycleSettingVersion,
          },
        },
      });
      const latestSetting = await tx.cycleSetting.findFirstOrThrow({
        where: { workspaceId: context.workspaceId },
        orderBy: { version: "desc" },
      });
      if (latestSetting.version !== input.version)
        throw new FinanceDomainError("CYCLE_CONFLICT");

      const futurePeriods = await tx.budgetPeriod.findMany({
        where: {
          workspaceId: context.workspaceId,
          startDate: { gte: active.endDateExclusive },
        },
        include: { _count: { select: { budgets: true } } },
      });
      if (futurePeriods.some((period) => period._count.budgets > 0))
        throw new FinanceDomainError("CYCLE_FUTURE_BUDGETS");
      const hasPendingPlan = latestSetting.version > current.version;

      if (futurePeriods.length > 0) {
        await tx.budgetPeriod.deleteMany({
          where: {
            workspaceId: context.workspaceId,
            startDate: { gte: active.endDateExclusive },
          },
        });
      }
      if (hasPendingPlan) {
        await tx.cycleSetting.deleteMany({
          where: {
            workspaceId: context.workspaceId,
            version: { gt: current.version },
          },
        });
      }
      if (current.startDay === input.startDay && !hasPendingPlan)
        return current;

      const preview = previewImmediateCycleChange(
        active.startDate,
        context.today,
        input.startDay,
      );
      const setting = await tx.cycleSetting.create({
        data: {
          workspaceId: context.workspaceId,
          startDay: input.startDay,
          effectiveDate: context.today,
          version: latestSetting.version + 1,
        },
      });
      await tx.budgetPeriod.update({
        where: { id: active.id },
        data: {
          startDate: preview.active.start,
          endDateExclusive: preview.active.end,
          cycleSettingVersion: setting.version,
          isTransition: preview.active.isTransition,
        },
      });
      if (preview.historicalSplit) {
        await tx.budgetPeriod.create({
          data: {
            workspaceId: context.workspaceId,
            startDate: preview.historicalSplit.start,
            endDateExclusive: preview.historicalSplit.end,
            cycleSettingVersion: current.version,
            isTransition: true,
          },
        });
      }
      await tx.auditEvent.create({
        data: {
          workspaceId: context.workspaceId,
          actorId: context.actorId,
          entityType: "cycle_setting",
          entityId: setting.id,
          action: "applied",
          changedFields: [
            "start_day",
            "effective_date",
            "version",
            "start_date",
            "end_date_exclusive",
          ],
        },
      });
      return setting;
    },
    { isolationLevel: "Serializable" },
  );
}
