"use client";

import type { ReactNode } from "react";
import { useActionState, useId, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  TriangleAlert,
} from "lucide-react";
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
import { AppSelect } from "@/components/ui/app-select";

type Option = { id: string; name: string };
type CategoryOption = Option & { type: "income" | "expense" };
type TransactionType = "income" | "expense" | "transfer";

const inputClass =
  "mt-2 min-h-12 w-full rounded-xl border bg-background px-3.5 text-sm shadow-xs transition-colors focus:border-primary";

const transactionTypes = [
  {
    value: "expense" as const,
    label: "Pengeluaran",
    description: "Uang keluar",
    icon: ArrowUpRight,
  },
  {
    value: "income" as const,
    label: "Pemasukan",
    description: "Uang masuk",
    icon: ArrowDownLeft,
  },
  {
    value: "transfer" as const,
    label: "Transfer",
    description: "Antar akun",
    icon: ArrowLeftRight,
  },
];

function displayDatePreview(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

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
  cancelAction,
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
  cancelAction?: ReactNode;
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
  const dateHintId = useId();
  const amountInputId = useId();
  const datePreview = displayDatePreview(transactionDate);
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
      className={compact ? "grid gap-5" : "grid gap-5 md:grid-cols-2"}
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
      <fieldset className={compact ? "" : "md:col-span-2"}>
        <legend className="text-sm font-semibold">Jenis transaksi</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {transactionTypes.map((item) => {
            const Icon = item.icon;
            const selected = type === item.value;
            return (
              <label
                key={item.value}
                className={`relative flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-[border-color,background-color,box-shadow,transform] motion-safe:hover:-translate-y-0.5 sm:flex-row sm:items-center sm:gap-3 sm:px-3 sm:text-left ${selected ? "border-primary bg-primary/10 shadow-[inset_0_0_0_1px_var(--primary)]" : "bg-background hover:bg-accent/45"}`}
              >
                <input
                  type="radio"
                  name="type"
                  value={item.value}
                  checked={selected}
                  onChange={() => changeType(item.value)}
                  className="peer sr-only"
                />
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold sm:text-sm">
                    {item.label}
                  </span>
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {item.description}
                  </span>
                </span>
                {selected && (
                  <Check
                    className="absolute right-2 top-2 size-3.5 text-primary sm:right-3 sm:top-3"
                    aria-hidden="true"
                  />
                )}
                <span className="pointer-events-none absolute inset-0 rounded-xl ring-primary ring-offset-2 ring-offset-background peer-focus-visible:ring-2" />
              </label>
            );
          })}
        </div>
      </fieldset>
      <div
        className={`text-sm font-semibold ${compact ? "" : "md:col-span-2"}`}
      >
        <label htmlFor={amountInputId}>Nominal</label>
        <RupiahInput
          id={amountInputId}
          name="amount"
          required
          calculator
          defaultValue={initial?.amount}
          className={`${inputClass} h-16 text-xl font-semibold tracking-[-0.02em] sm:text-2xl`}
        />
      </div>
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
      <label className="text-sm font-semibold">
        Tanggal
        <input
          name="transactionDate"
          type="date"
          required
          max={defaultDate}
          value={transactionDate}
          onChange={(event) => setTransactionDate(event.target.value)}
          aria-describedby={dateHintId}
          className={inputClass}
        />
        <span
          id={dateHintId}
          className="mt-1.5 block text-xs font-normal text-muted-foreground"
        >
          {datePreview
            ? `Tanggal terpilih: ${datePreview}`
            : "Gunakan tanggal lokal sesuai perangkatmu."}
        </span>
      </label>
      <label className="text-sm font-semibold">
        {type === "transfer" ? "Akun asal" : "Akun"}
        <AppSelect
          name="accountId"
          required
          value={accountId}
          onValueChange={setAccountId}
          className={inputClass}
          options={accounts.map((account) => ({
            value: account.id,
            label: account.name,
          }))}
        />
      </label>
      {type === "transfer" ? (
        <label className="text-sm font-semibold md:col-span-2">
          Akun tujuan
          <AppSelect
            name="destinationAccountId"
            required
            value={destinationAccountId}
            onValueChange={setDestinationAccountId}
            className={inputClass}
            placeholder="Pilih akun tujuan"
            options={accounts
              .filter((account) => account.id !== accountId)
              .map((account) => ({
                value: account.id,
                label: account.name,
              }))}
          />
        </label>
      ) : (
        <div className={compact ? "" : "md:col-span-2"}>
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
        className={`text-sm font-semibold ${compact ? "" : "md:col-span-2"}`}
      >
        Catatan opsional
        <textarea
          name="note"
          maxLength={1000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Contoh: makan siang"
          rows={3}
          className={`${inputClass} min-h-24 resize-y py-3`}
        />
      </label>
      {!initial && createState.error && (
        <p
          role="alert"
          className={`rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive ${compact ? "" : "md:col-span-2"}`}
        >
          {createState.error}
        </p>
      )}
      {!initial && createState.duplicate && (
        <div
          role="alert"
          className={`rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 ${compact ? "" : "md:col-span-2"}`}
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
        className={
          compact
            ? "flex items-end"
            : "sticky bottom-0 z-10 -mx-5 -mb-6 flex flex-col-reverse gap-2 border-t bg-card/95 px-5 py-4 backdrop-blur md:col-span-2 sm:-mx-7 sm:-mb-7 sm:flex-row sm:justify-end sm:px-7"
        }
      >
        {!initial && cancelAction}
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
          className={`min-h-12 rounded-xl ${compact ? "w-full" : "w-full sm:w-auto sm:min-w-52"}`}
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
