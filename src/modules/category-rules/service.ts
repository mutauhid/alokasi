import "server-only";

import { getDatabase } from "@/server/db/client";
import { parseCategoryRuleKeyword } from "./domain";

type Access = {
  workspaceId: string;
  actorId: string;
  role: "owner" | "editor" | "viewer";
};

export class PersonalCategoryRuleError extends Error {
  constructor(public code: "INVALID" | "DUPLICATE" | "NOT_FOUND") {
    super(code);
    this.name = "PersonalCategoryRuleError";
  }
}

function requireWriter(access: Access) {
  if (access.role === "viewer") throw new PersonalCategoryRuleError("INVALID");
}

export function listPersonalCategoryRules(access: Access) {
  requireWriter(access);
  return getDatabase().personalCategoryRule.findMany({
    where: { workspaceId: access.workspaceId, userId: access.actorId },
    select: {
      id: true,
      keyword: true,
      categoryId: true,
      category: { select: { name: true, archivedAt: true } },
    },
    orderBy: [{ keywordKey: "asc" }, { createdAt: "asc" }],
  });
}

export async function createPersonalCategoryRule(
  access: Access,
  input: { keyword: string; categoryId: string },
) {
  requireWriter(access);
  const parsed = parseCategoryRuleKeyword(input.keyword);
  if (!parsed || !input.categoryId)
    throw new PersonalCategoryRuleError("INVALID");
  const db = getDatabase();
  try {
    return await db.$transaction(async (tx) => {
      const category = await tx.category.findFirst({
        where: {
          id: input.categoryId,
          workspaceId: access.workspaceId,
          type: "expense",
          archivedAt: null,
        },
        select: { id: true },
      });
      if (!category) throw new PersonalCategoryRuleError("INVALID");
      const duplicate = await tx.personalCategoryRule.findUnique({
        where: {
          workspaceId_userId_keywordKey: {
            workspaceId: access.workspaceId,
            userId: access.actorId,
            keywordKey: parsed.keywordKey,
          },
        },
        select: { id: true },
      });
      if (duplicate) throw new PersonalCategoryRuleError("DUPLICATE");
      const rule = await tx.personalCategoryRule.create({
        data: {
          workspaceId: access.workspaceId,
          userId: access.actorId,
          keyword: parsed.keyword,
          keywordKey: parsed.keywordKey,
          categoryId: category.id,
          type: "expense",
        },
      });
      await tx.auditEvent.create({
        data: {
          workspaceId: access.workspaceId,
          actorId: access.actorId,
          entityType: "personal_category_rule",
          entityId: rule.id,
          action: "created",
          changedFields: ["keyword", "category_id"],
        },
      });
      return rule;
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new PersonalCategoryRuleError("DUPLICATE");
    }
    throw error;
  }
}

export async function deletePersonalCategoryRule(
  access: Access,
  ruleId: string,
) {
  requireWriter(access);
  const db = getDatabase();
  return db.$transaction(async (tx) => {
    const rule = await tx.personalCategoryRule.findFirst({
      where: {
        id: ruleId,
        workspaceId: access.workspaceId,
        userId: access.actorId,
      },
      select: { id: true },
    });
    if (!rule) throw new PersonalCategoryRuleError("NOT_FOUND");
    await tx.personalCategoryRule.delete({ where: { id: rule.id } });
    await tx.auditEvent.create({
      data: {
        workspaceId: access.workspaceId,
        actorId: access.actorId,
        entityType: "personal_category_rule",
        entityId: rule.id,
        action: "deleted",
        changedFields: [],
      },
    });
  });
}
