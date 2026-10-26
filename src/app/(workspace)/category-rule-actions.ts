"use server";

import { revalidatePath } from "next/cache";
import {
  createPersonalCategoryRule,
  deletePersonalCategoryRule,
  PersonalCategoryRuleError,
} from "@/modules/category-rules/service";
import { requireWorkspaceAccess } from "@/modules/workspaces/service";
import { requireVerifiedIdentity } from "@/server/auth/identity";

export type PersonalCategoryRuleActionState = {
  message?: string;
  error?: string;
};

function value(form: FormData, key: string) {
  const item = form.get(key);
  return typeof item === "string" ? item : "";
}

export async function personalCategoryRuleAction(
  previous: PersonalCategoryRuleActionState,
  form: FormData,
): Promise<PersonalCategoryRuleActionState> {
  const identity = await requireVerifiedIdentity();
  const access = await requireWorkspaceAccess(
    identity,
    value(form, "workspaceId"),
    ["owner", "editor"],
  );
  try {
    if (value(form, "intent") === "delete") {
      await deletePersonalCategoryRule(access, value(form, "ruleId"));
      revalidatePath("/settings");
      return { message: "Aturan kategori pribadi dihapus." };
    }
    await createPersonalCategoryRule(access, {
      keyword: value(form, "keyword"),
      categoryId: value(form, "categoryId"),
    });
    revalidatePath("/settings");
    return { message: "Aturan kategori pribadi ditambahkan." };
  } catch (error) {
    const message =
      error instanceof PersonalCategoryRuleError && error.code === "DUPLICATE"
        ? "Kata kunci tersebut sudah memiliki aturan di ruang ini."
        : error instanceof PersonalCategoryRuleError &&
            error.code === "NOT_FOUND"
          ? "Aturan tidak ditemukan atau sudah dihapus."
          : "Periksa kata kunci dan kategori pengeluaran yang dipilih.";
    return { ...previous, message: undefined, error: message };
  }
}
