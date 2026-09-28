import "server-only";

import { getDatabase } from "@/server/db/client";
import { categoryNameKey } from "@/modules/finance/domain";
import { FinanceDomainError } from "@/modules/finance/errors";

type OwnerContext = { workspaceId: string; actorId: string };
type CategoryType = "income" | "expense";

export function listCategories(workspaceId: string) {
  return getDatabase().category.findMany({
    where: { workspaceId },
    orderBy: [{ type: "asc" }, { archivedAt: "asc" }, { name: "asc" }],
  });
}

export async function createCategory(
  context: OwnerContext,
  input: { name: string; type: CategoryType },
) {
  const db = getDatabase();
  const nameKey = categoryNameKey(input.name);
  const existing = await db.category.findUnique({
    where: {
      workspaceId_type_nameKey: {
        workspaceId: context.workspaceId,
        type: input.type,
        nameKey,
      },
    },
  });
  if (existing) {
    throw new FinanceDomainError(
      existing.archivedAt ? "CATEGORY_ARCHIVED" : "CATEGORY_DUPLICATE",
    );
  }
  return db.$transaction(async (tx) => {
    const category = await tx.category.create({
      data: { workspaceId: context.workspaceId, ...input, nameKey },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: context.workspaceId,
        actorId: context.actorId,
        entityType: "category",
        entityId: category.id,
        action: "created",
        changedFields: ["name", "type"],
      },
    });
    return category;
  });
}

export async function renameCategory(
  context: OwnerContext,
  input: { id: string; version: number; name: string },
) {
  const db = getDatabase();
  const category = await db.category.findFirst({
    where: {
      id: input.id,
      workspaceId: context.workspaceId,
      version: input.version,
    },
  });
  if (!category) throw new FinanceDomainError("CATEGORY_CONFLICT");
  const nameKey = categoryNameKey(input.name);
  const duplicate = await db.category.findUnique({
    where: {
      workspaceId_type_nameKey: {
        workspaceId: context.workspaceId,
        type: category.type,
        nameKey,
      },
    },
  });
  if (duplicate && duplicate.id !== category.id) {
    throw new FinanceDomainError(
      duplicate.archivedAt ? "CATEGORY_ARCHIVED" : "CATEGORY_DUPLICATE",
    );
  }
  return db.$transaction(async (tx) => {
    const updated = await tx.category.updateMany({
      where: {
        id: category.id,
        workspaceId: context.workspaceId,
        version: input.version,
      },
      data: { name: input.name, nameKey, version: { increment: 1 } },
    });
    if (updated.count !== 1) throw new FinanceDomainError("CATEGORY_CONFLICT");
    await tx.auditEvent.create({
      data: {
        workspaceId: context.workspaceId,
        actorId: context.actorId,
        entityType: "category",
        entityId: category.id,
        action: "renamed",
        changedFields: ["name", "name_key", "version"],
      },
    });
  });
}

async function setCategoryArchiveState(
  context: OwnerContext,
  input: { id: string; version: number },
  archived: boolean,
) {
  return getDatabase().$transaction(async (tx) => {
    const updated = await tx.category.updateMany({
      where: {
        id: input.id,
        workspaceId: context.workspaceId,
        version: input.version,
        archivedAt: archived ? null : { not: null },
      },
      data: {
        archivedAt: archived ? new Date() : null,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) throw new FinanceDomainError("CATEGORY_CONFLICT");
    await tx.auditEvent.create({
      data: {
        workspaceId: context.workspaceId,
        actorId: context.actorId,
        entityType: "category",
        entityId: input.id,
        action: archived ? "archived" : "restored",
        changedFields: ["archived_at", "version"],
      },
    });
  });
}

export function archiveCategory(
  context: OwnerContext,
  input: { id: string; version: number },
) {
  return setCategoryArchiveState(context, input, true);
}

export function restoreCategory(
  context: OwnerContext,
  input: { id: string; version: number },
) {
  return setCategoryArchiveState(context, input, false);
}
