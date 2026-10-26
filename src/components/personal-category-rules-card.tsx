"use client";

import { useActionState } from "react";
import { Tags, Trash2 } from "lucide-react";
import {
  personalCategoryRuleAction,
  type PersonalCategoryRuleActionState,
} from "@/app/(workspace)/category-rule-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Option = { id: string; name: string };
type Rule = {
  id: string;
  keyword: string;
  categoryName: string;
  archived: boolean;
};

export function PersonalCategoryRulesCard({
  workspaceId,
  categories,
  rules,
}: {
  workspaceId: string;
  categories: Option[];
  rules: Rule[];
}) {
  const [state, action, pending] = useActionState<
    PersonalCategoryRuleActionState,
    FormData
  >(personalCategoryRuleAction, {});
  return (
    <Card className="shadow-none">
      <CardHeader>
        <Tags className="mb-2 size-5 text-primary" aria-hidden="true" />
        <CardTitle>Aturan kategori pribadi</CardTitle>
        <p className="text-sm text-muted-foreground">
          Petakan kata kunci ke kategori pengeluaran untuk pesan Telegram Anda.
          Aturan terpanjang diprioritaskan sebelum riwayat dan kamus bawaan.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {(state.error || state.message) && (
          <p
            role={state.error ? "alert" : "status"}
            className="rounded-lg bg-secondary p-3 text-sm"
          >
            {state.error ?? state.message}
          </p>
        )}
        <form
          action={action}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="intent" value="create" />
          <label className="text-sm font-medium">
            Kata kunci
            <input
              name="keyword"
              required
              minLength={2}
              maxLength={60}
              placeholder="Contoh: bensin motor"
              className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium">
            Kategori
            <select
              name="categoryId"
              required
              defaultValue=""
              className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="submit"
            disabled={pending || !categories.length}
            className="self-end"
          >
            Tambahkan
          </Button>
        </form>
        {rules.length ? (
          <ul className="divide-y rounded-xl border">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex min-h-14 items-center justify-between gap-3 px-4 py-3"
              >
                <p className="min-w-0 text-sm">
                  <span className="font-medium">“{rule.keyword}”</span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <span
                    className={rule.archived ? "text-muted-foreground" : ""}
                  >
                    {rule.categoryName}
                    {rule.archived ? " (diarsipkan)" : ""}
                  </span>
                </p>
                <form action={action}>
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="ruleId" value={rule.id} />
                  <Button
                    type="submit"
                    size="icon"
                    variant="ghost"
                    disabled={pending}
                    aria-label={`Hapus aturan ${rule.keyword}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Belum ada aturan pribadi. Tanpa aturan, Telegram tetap memakai
            riwayat dan kamus kategori bawaan.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
