import "server-only";

import type { Prisma } from "@/generated/prisma/client";

export function deletePersonalCategoryRules(
  tx: Prisma.TransactionClient,
  where: Prisma.PersonalCategoryRuleWhereInput,
) {
  return tx.personalCategoryRule.deleteMany({ where });
}
