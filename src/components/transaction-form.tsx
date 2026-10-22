"use client";

import { useState } from "react";
import {
  createTransactionAction,
  updateTransactionAction,
} from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { TransactionTitleField } from "@/components/transaction-title-field";
import { CategoryRadioGroup } from "@/components/category-radio-group";
import type { TransactionSuggestion } from "@/modules/transactions/suggestions";

type Option = { id: string; name: string };
type CategoryOption = Option & { type: "income" | "expense" };
type TransactionType = "income" | "expense" | "transfer";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-xs";

export function TransactionForm({
  workspaceId,
  accounts,
  categories,
  idempotencyKey,
  defaultDate,
  suggestions = [],
  initial,
  compact = false,
}: {
  workspaceId: string;
  accounts: Option[];
  categories: CategoryOption[];
  idempotencyKey?: string;
  defaultDate?: string;
  suggestions?: TransactionSuggestion[];
  initial?: {
    id: string;
    version: number;
    type: TransactionType;
    title: string;
    amount: string;
    transactionDate: string;
    accountId: string;
    destinationAccountId: string;
    categoryId: string;
    note: string;
  };
  compact?: boolean;
}) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [accountId, setAccountId] = useState(
    initial?.accountId ?? accounts[0]?.id ?? "",
  );
  const action = initial ? updateTransactionAction : createTransactionAction;
  const availableCategories = categories.filter(
    (category) => category.type === type,
  );
  function changeType(nextType: TransactionType) {
    setType(nextType);
    if (
      nextType === "transfer" ||
      !categories.some(
        (category) => category.id === categoryId && category.type === nextType,
      )
    ) {
      setCategoryId("");
    }
  }

  function applySuggestion(suggestion: TransactionSuggestion) {
    setTitle(suggestion.title);
    if (suggestion.categoryId) setCategoryId(suggestion.categoryId);
  }

  return (
    <form
      action={action}
      className={
        compact ? "grid gap-4" : "grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      }
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {initial ? (
        <>
          <input type="hidden" name="id" value={initial.id} />
          <input type="hidden" name="version" value={initial.version} />
        </>
      ) : (
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      )}
      <label className="text-sm font-medium">
        Jenis
        <select
          name="type"
          value={type}
          onChange={(event) =>
            changeType(event.target.value as TransactionType)
          }
          className={inputClass}
        >
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
          <option value="transfer">Transfer</option>
        </select>
      </label>
      <label className="text-sm font-medium">
        Nominal
        <RupiahInput
          name="amount"
          required
          defaultValue={initial?.amount}
          className={inputClass}
        />
      </label>
      <div className={compact ? "" : "md:col-span-2"}>
        <TransactionTitleField
          value={title}
          onValueChange={setTitle}
          type={type}
          suggestions={suggestions}
          onApplySuggestion={applySuggestion}
          showShortHint={!initial}
        />
      </div>
      <label className="text-sm font-medium">
        Tanggal
        <input
          name="transactionDate"
          type="date"
          required
          max={defaultDate}
          defaultValue={initial?.transactionDate ?? defaultDate}
          className={inputClass}
        />
      </label>
      <label className="text-sm font-medium">
        {type === "transfer" ? "Akun asal" : "Akun"}
        <select
          name="accountId"
          required
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          className={inputClass}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>
      {type === "transfer" ? (
        <label className="text-sm font-medium">
          Akun tujuan
          <select
            name="destinationAccountId"
            required
            defaultValue={initial?.destinationAccountId}
            className={inputClass}
          >
            <option value="">Pilih akun tujuan</option>
            {accounts
              .filter((account) => account.id !== accountId)
              .map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
          </select>
        </label>
      ) : (
        <div className={compact ? "" : "md:col-span-2 xl:col-span-4"}>
          <CategoryRadioGroup
            categories={availableCategories}
            value={categoryId}
            onValueChange={setCategoryId}
            type={type}
            hint="Pilih satu kategori yang paling sesuai."
          />
        </div>
      )}
      <label
        className={`text-sm font-medium ${compact ? "" : "md:col-span-2 xl:col-span-3"}`}
      >
        Catatan opsional
        <input
          name="note"
          maxLength={1000}
          defaultValue={initial?.note}
          placeholder="Contoh: makan siang"
          className={inputClass}
        />
      </label>
      <div className="flex items-end">
        <Button
          type="submit"
          disabled={
            accounts.length === 0 ||
            (type === "transfer" && accounts.length < 2)
          }
          className="min-h-11 w-full"
        >
          {initial ? "Simpan perubahan" : "Simpan transaksi"}
        </Button>
      </div>
    </form>
  );
}
