"use client";

import { useState } from "react";
import {
  createRecurringTemplateAction,
  updateRecurringTemplateAction,
} from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";

type Option = { id: string; name: string };
type CategoryOption = Option & { type: "income" | "expense" };
type RecurringType = "income" | "expense";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-xs";

export function RecurringTemplateForm({
  workspaceId,
  accounts,
  categories,
  initial,
  compact = false,
}: {
  workspaceId: string;
  accounts: Option[];
  categories: CategoryOption[];
  initial?: {
    id: string;
    version: number;
    name: string;
    type: RecurringType;
    amount: string;
    accountId: string;
    categoryId: string;
    note: string;
    recurrenceDay: number;
  };
  compact?: boolean;
}) {
  const [type, setType] = useState<RecurringType>(initial?.type ?? "expense");
  const availableCategories = categories.filter(
    (category) => category.type === type,
  );
  const action = initial
    ? updateRecurringTemplateAction
    : createRecurringTemplateAction;

  return (
    <form
      action={action}
      className={
        compact ? "grid gap-3" : "grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      }
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {initial && (
        <>
          <input type="hidden" name="id" value={initial.id} />
          <input type="hidden" name="version" value={initial.version} />
        </>
      )}
      <label className="text-sm font-medium">
        Nama pengingat
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={initial?.name}
          placeholder="Contoh: Sewa rumah"
          className={inputClass}
        />
      </label>
      <label className="text-sm font-medium">
        Jenis
        <select
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as RecurringType)}
          className={inputClass}
        >
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
        </select>
      </label>
      <label className="text-sm font-medium">
        Nominal
        <input
          name="amount"
          type="number"
          min="1"
          step="1"
          required
          defaultValue={initial?.amount}
          placeholder="0"
          className={inputClass}
        />
      </label>
      <label className="text-sm font-medium">
        Hari setiap bulan
        <input
          name="recurrenceDay"
          type="number"
          min="1"
          max="31"
          step="1"
          required
          defaultValue={initial?.recurrenceDay ?? 1}
          className={inputClass}
        />
      </label>
      <label className="text-sm font-medium">
        Akun
        <select
          name="accountId"
          required
          defaultValue={initial?.accountId ?? accounts[0]?.id}
          className={inputClass}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Kategori
        <select
          key={`${type}-${initial?.categoryId ?? "new"}`}
          name="categoryId"
          required
          defaultValue={initial?.type === type ? initial.categoryId : undefined}
          className={inputClass}
        >
          <option value="">Pilih kategori</option>
          {availableCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label
        className={`text-sm font-medium ${compact ? "" : "md:col-span-2 xl:col-span-2"}`}
      >
        Catatan transaksi
        <input
          name="note"
          maxLength={1000}
          defaultValue={initial?.note}
          placeholder="Opsional"
          className={inputClass}
        />
      </label>
      <div className="flex items-end">
        <Button
          type="submit"
          disabled={accounts.length === 0 || availableCategories.length === 0}
          className="min-h-11 w-full"
        >
          {initial ? "Simpan template" : "Buat pengingat"}
        </Button>
      </div>
    </form>
  );
}
