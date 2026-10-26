"use client";

import { useActionState, useState } from "react";
import { TriangleAlert } from "lucide-react";
import {
  createTransactionAction,
  updateTransactionAction,
} from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { TransactionTitleField } from "@/components/transaction-title-field";
import { CategoryRadioGroup } from "@/components/category-radio-group";
import type { TransactionSuggestion } from "@/modules/transactions/suggestions";
import { initialTransactionCreateState } from "@/modules/transactions/form-state";

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
  timeZone = "UTC",
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
  timeZone?: string;
}) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [accountId, setAccountId] = useState(
    initial?.accountId ?? accounts[0]?.id ?? "",
  );
  const [transactionDate, setTransactionDate] = useState(
    initial?.transactionDate ?? defaultDate ?? "",
  );
  const [destinationAccountId, setDestinationAccountId] = useState(
    initial?.destinationAccountId ?? "",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [createState, createAction, createPending] = useActionState(
    createTransactionAction,
    initialTransactionCreateState,
  );
  const action = initial ? updateTransactionAction : createAction;
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
          value={transactionDate}
          onChange={(event) => setTransactionDate(event.target.value)}
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
            value={destinationAccountId}
            onChange={(event) => setDestinationAccountId(event.target.value)}
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
        className={`text-sm font-medium ${compact ? "" : `md:col-span-2 ${createState.duplicate ? "xl:col-span-4" : "xl:col-span-3"}`}`}
      >
        Catatan opsional
        <input
          name="note"
          maxLength={1000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Contoh: makan siang"
          className={inputClass}
        />
      </label>
      {!initial && createState.error && (
        <p
          role="alert"
          className={`rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive ${compact ? "" : "md:col-span-2 xl:col-span-4"}`}
        >
          {createState.error}
        </p>
      )}
      {!initial && createState.duplicate && (
        <div
          role="alert"
          className={`rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 ${compact ? "" : "md:col-span-2 xl:col-span-4"}`}
        >
          <div className="flex gap-3">
            <TriangleAlert
              className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">
                Transaksi serupa baru saja dicatat
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {createState.duplicate.title} · Rp
                {new Intl.NumberFormat("id-ID").format(
                  BigInt(createState.duplicate.amount),
                )}{" "}
                · {createState.duplicate.accountName} ·{" "}
                {new Intl.DateTimeFormat("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(
                  new Date(
                    `${createState.duplicate.transactionDate}T00:00:00.000Z`,
                  ),
                )}{" "}
                · dicatat pukul{" "}
                {new Intl.DateTimeFormat("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone,
                }).format(new Date(createState.duplicate.createdAt))}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Judul yang sama tetap diperbolehkan. Ubah data jika ini tidak
                sengaja, atau pilih Tetap simpan jika memang transaksi berbeda.
              </p>
            </div>
          </div>
        </div>
      )}
      <div
        className={`flex items-end ${!initial && createState.duplicate && !compact ? "md:col-span-2 justify-end xl:col-span-4" : ""}`}
      >
        <Button
          type="submit"
          name={
            !initial && createState.duplicate
              ? "duplicateConfirmation"
              : undefined
          }
          value={createState.duplicate?.confirmation}
          disabled={
            createPending ||
            accounts.length === 0 ||
            (type === "transfer" && accounts.length < 2)
          }
          className={`min-h-11 ${!initial && createState.duplicate ? "w-full sm:w-auto sm:min-w-44" : "w-full"}`}
        >
          {initial
            ? "Simpan perubahan"
            : createPending
              ? "Memeriksa…"
              : createState.duplicate
                ? "Tetap simpan"
                : "Simpan transaksi"}
        </Button>
      </div>
    </form>
  );
}
