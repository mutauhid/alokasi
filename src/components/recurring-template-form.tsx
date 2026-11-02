"use client";

import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowDownLeft, ArrowUpRight, Check } from "lucide-react";
import {
  createRecurringTemplateAction,
  updateRecurringTemplateAction,
} from "@/app/(workspace)/actions";
import { CategoryRadioGroup } from "@/components/category-radio-group";
import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { RupiahInput } from "@/components/ui/rupiah-input";

type Option = { id: string; name: string };
type CategoryOption = Option & { type: "income" | "expense" };
type RecurringType = "income" | "expense";

const inputClass =
  "mt-2 min-h-12 min-w-0 w-full max-w-full rounded-xl border bg-background px-3.5 text-sm shadow-xs transition-colors focus:border-primary";

const reminderTypes = [
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
];

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
    reminderMinute: number;
  };
  compact?: boolean;
}) {
  const amountInputId = useId();
  const [type, setType] = useState<RecurringType>(initial?.type ?? "expense");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const availableCategories = categories.filter(
    (category) => category.type === type,
  );
  const action = initial
    ? updateRecurringTemplateAction
    : createRecurringTemplateAction;

  function changeType(nextType: RecurringType) {
    setType(nextType);
    if (
      !categories.some(
        (category) => category.id === categoryId && category.type === nextType,
      )
    ) {
      setCategoryId("");
    }
  }

  return (
    <form
      action={action}
      className={
        compact
          ? "grid min-w-0 gap-5"
          : "grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      }
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {initial && (
        <>
          <input type="hidden" name="id" value={initial.id} />
          <input type="hidden" name="version" value={initial.version} />
        </>
      )}

      <fieldset className={compact ? "min-w-0" : "min-w-0 md:col-span-2"}>
        <legend className="text-sm font-semibold">Jenis transaksi</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {reminderTypes.map((item) => {
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

      <div className={compact ? "min-w-0" : "min-w-0 md:col-span-2"}>
        <label className="text-sm font-semibold" htmlFor={amountInputId}>
          Nominal
        </label>
        <RupiahInput
          id={amountInputId}
          name="amount"
          required
          calculator
          defaultValue={initial?.amount}
          className={`${inputClass} h-16 text-xl font-semibold tracking-[-0.02em] sm:text-2xl`}
        />
      </div>

      <label
        className={`min-w-0 text-sm font-semibold ${compact ? "" : "md:col-span-2"}`}
      >
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

      <label className="min-w-0 text-sm font-semibold">
        Hari setiap bulan
        <input
          name="recurrenceDay"
          type="number"
          inputMode="numeric"
          min="1"
          max="31"
          step="1"
          required
          defaultValue={initial?.recurrenceDay ?? 1}
          className={inputClass}
        />
        <span className="mt-1.5 block text-xs font-normal text-muted-foreground">
          Tanggal 29–31 mengikuti hari terakhir bulan bila diperlukan.
        </span>
      </label>

      <label className="min-w-0 text-sm font-semibold">
        Jam notifikasi
        <input
          name="reminderTime"
          type="time"
          step="3600"
          required
          defaultValue={clockValue(initial?.reminderMinute ?? 540)}
          className={inputClass}
        />
        <span className="mt-1.5 block text-xs font-normal text-muted-foreground">
          Pilih jam bulat sesuai zona waktu ruang aktif. Pengingat tidak
          mencatat transaksi otomatis.
        </span>
      </label>

      <label className="min-w-0 text-sm font-semibold">
        Akun
        <AppSelect
          name="accountId"
          required
          defaultValue={initial?.accountId ?? accounts[0]?.id}
          className={inputClass}
          placeholder="Pilih akun"
          options={accounts.map((account) => ({
            value: account.id,
            label: account.name,
          }))}
        />
      </label>

      <div className={compact ? "min-w-0" : "min-w-0 md:col-span-2"}>
        <CategoryRadioGroup
          categories={availableCategories}
          value={categoryId}
          onValueChange={setCategoryId}
          type={type}
          hint="Pilih satu kategori yang paling sesuai."
        />
      </div>

      <label
        className={`min-w-0 text-sm font-semibold ${compact ? "" : "md:col-span-2"}`}
      >
        Catatan opsional
        <textarea
          name="note"
          maxLength={1000}
          defaultValue={initial?.note}
          placeholder="Contoh: dibayar melalui autodebet"
          rows={3}
          className={`${inputClass} min-h-24 resize-y py-3`}
        />
      </label>

      <RecurringSubmitButton
        editing={Boolean(initial)}
        disabled={accounts.length === 0 || availableCategories.length === 0}
        compact={compact}
      />
    </form>
  );
}

function clockValue(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function RecurringSubmitButton({
  editing,
  disabled,
  compact,
}: {
  editing: boolean;
  disabled: boolean;
  compact: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <div
      className={compact ? "flex min-w-0 items-end" : "min-w-0 md:col-span-2"}
    >
      <Button
        type="submit"
        disabled={disabled || pending}
        className="min-h-12 w-full rounded-xl"
      >
        {pending
          ? "Menyimpan..."
          : editing
            ? "Simpan perubahan"
            : "Buat pengingat"}
      </Button>
    </div>
  );
}
