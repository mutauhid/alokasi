"use client";

import { useId, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Plus,
  ReceiptText,
} from "lucide-react";
import {
  createDebtPaymentAction,
  createDebtRecordAction,
  settleDebtRecordAction,
} from "@/app/(workspace)/debt-actions";
import { SensitiveAmount } from "@/components/amount-privacy";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { AppSelect } from "@/components/ui/app-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type DebtStatus = "unpaid" | "partial" | "settled" | "overdue";

export type DebtPanelItem = {
  id: string;
  kind: "debt" | "receivable";
  origin: "current" | "historical";
  counterparty: string;
  title: string;
  principalAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  startDate: string;
  dueDate: string | null;
  accountName: string | null;
  note: string | null;
  status: DebtStatus;
  payments: Array<{
    id: string;
    amount: string;
    paymentDate: string;
    accountName: string;
    note: string | null;
  }>;
};

const errorMessages: Record<string, string> = {
  "debt-invalid": "Periksa kembali jenis, pihak, nominal, tanggal, dan akun.",
  "debt-payment-invalid": "Periksa nominal, tanggal, dan akun pembayaran.",
  "debt-future": "Tanggal tidak boleh berada di masa depan.",
  "debt-origin": "Sumber catatan dan akun tidak sesuai.",
  "debt-account": "Akun tidak tersedia atau sudah diarsipkan.",
  "debt-before-account": "Tanggal mendahului tanggal mulai akun.",
  "debt-payment-date":
    "Pembayaran tidak boleh mendahului tanggal utang/piutang.",
  "debt-overpayment": "Nominal pembayaran melebihi sisa yang belum lunas.",
  "debt-settled": "Utang atau piutang ini sudah lunas.",
  "debt-not-found": "Catatan tidak ditemukan atau sudah berubah.",
  "debt-idempotency": "Permintaan yang sama berisi data berbeda. Coba lagi.",
  "debt-failed": "Utang/piutang belum dapat disimpan. Coba lagi.",
};

const statusLabels: Record<DebtStatus, string> = {
  unpaid: "Belum dibayar",
  partial: "Dibayar sebagian",
  settled: "Lunas",
  overdue: "Terlambat",
};

function rupiah(value: string) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(BigInt(value))}`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function DebtsPanel({
  workspaceId,
  today,
  canManage,
  accounts,
  items,
  totals,
  error,
}: {
  workspaceId: string;
  today: string;
  canManage: boolean;
  accounts: Array<{ id: string; name: string }>;
  items: DebtPanelItem[];
  totals: { debt: string; receivable: string; overdue: number };
  error?: string;
}) {
  const formSeed = useId().replace(/:/gu, "");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [origin, setOrigin] = useState<"current" | "historical">("current");
  const [kindFilter, setKindFilter] = useState<"all" | "debt" | "receivable">(
    "all",
  );
  const selected = items.find((item) => item.id === selectedId);
  const filtered = useMemo(
    () =>
      items.filter((item) => kindFilter === "all" || item.kind === kindFilter),
    [items, kindFilter],
  );

  return (
    <div className="space-y-5">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {errorMessages[error] ?? errorMessages["debt-failed"]}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={ArrowDownLeft}
          label="Sisa utang"
          amount={totals.debt}
          tone="debt"
        />
        <SummaryCard
          icon={ArrowUpRight}
          label="Sisa piutang"
          amount={totals.receivable}
          tone="receivable"
        />
        <Card className="shadow-none">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-11 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-300">
              <CalendarClock className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Terlambat</p>
              <p className="mt-1 text-xl font-semibold">
                {totals.overdue} catatan
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Daftar utang & piutang</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pokok dan pembayaran mengubah saldo akun, bukan laporan arus kas
                atau budget.
              </p>
            </div>
            {canManage && (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" /> Tambah catatan
              </Button>
            )}
          </div>
          <div
            className="mt-5 flex gap-2"
            role="group"
            aria-label="Filter jenis catatan"
          >
            {(["all", "debt", "receivable"] as const).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={kindFilter === value ? "default" : "outline"}
                onClick={() => setKindFilter(value)}
              >
                {value === "all"
                  ? "Semua"
                  : value === "debt"
                    ? "Utang"
                    : "Piutang"}
              </Button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed p-8 text-center">
              <CircleDollarSign
                className="mx-auto size-8 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-3 font-medium">Belum ada catatan</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tambahkan utang atau piutang untuk memantau sisa dan jatuh
                temponya.
              </p>
            </div>
          ) : (
            <div className="mt-5 divide-y">
              {filtered.map((item) => {
                const ItemIcon =
                  item.kind === "debt" ? ArrowDownLeft : ArrowUpRight;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-4 text-left transition-colors hover:text-primary"
                  >
                    <span
                      className={cn(
                        "flex size-11 items-center justify-center rounded-xl",
                        item.kind === "debt"
                          ? "bg-rose-500/12 text-rose-500"
                          : "bg-primary/12 text-primary",
                      )}
                    >
                      <ItemIcon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {item.title}
                      </span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                        {item.counterparty} · {statusLabels[item.status]}
                        {item.dueDate
                          ? ` · jatuh tempo ${dateLabel(item.dueDate)}`
                          : ""}
                      </span>
                    </span>
                    <SensitiveAmount
                      className={cn(
                        "text-right text-sm font-semibold",
                        item.status === "overdue" && "text-destructive",
                      )}
                    >
                      {rupiah(item.outstandingAmount)}
                    </SensitiveAmount>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto p-0 sm:max-w-xl"
        >
          <SheetHeader className="border-b p-5 pr-16">
            <SheetTitle>Tambah utang atau piutang</SheetTitle>
            <SheetDescription>
              Catat kewajiban baru atau saldo lama tanpa mencampurnya dengan
              arus kas.
            </SheetDescription>
          </SheetHeader>
          <form action={createDebtRecordAction} className="space-y-5 p-5">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input
              type="hidden"
              name="idempotencyKey"
              value={`debt-${formSeed}`}
            />
            <fieldset>
              <legend className="text-sm font-semibold">Jenis</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <RadioCard
                  name="kind"
                  value="debt"
                  label="Utang"
                  description="Saya menerima dana"
                  defaultChecked
                  icon={ArrowDownLeft}
                />
                <RadioCard
                  name="kind"
                  value="receivable"
                  label="Piutang"
                  description="Saya memberi dana"
                  icon={ArrowUpRight}
                />
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-semibold">Sumber catatan</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="rounded-xl border p-3 text-sm">
                  <input
                    className="mr-2 accent-primary"
                    type="radio"
                    name="origin"
                    value="current"
                    checked={origin === "current"}
                    onChange={() => setOrigin("current")}
                  />
                  Baru terjadi
                </label>
                <label className="rounded-xl border p-3 text-sm">
                  <input
                    className="mr-2 accent-primary"
                    type="radio"
                    name="origin"
                    value="historical"
                    checked={origin === "historical"}
                    onChange={() => setOrigin("historical")}
                  />
                  Catatan lama
                </label>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Catatan lama tidak mengubah saldo saat dibuat; pembayaran
                berikutnya tetap mengubah saldo.
              </p>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pihak terkait">
                <input
                  name="counterparty"
                  required
                  maxLength={100}
                  placeholder="Contoh: Budi"
                  className="min-h-11 w-full rounded-lg border bg-background px-3"
                />
              </Field>
              <Field label="Judul">
                <input
                  name="title"
                  required
                  maxLength={100}
                  placeholder="Contoh: Pinjaman motor"
                  className="min-h-11 w-full rounded-lg border bg-background px-3"
                />
              </Field>
              <Field label="Nominal pokok">
                <RupiahInput
                  name="principalAmount"
                  required
                  className="min-h-11 w-full rounded-lg border bg-background px-3"
                />
              </Field>
              <Field label="Tanggal mulai">
                <input
                  name="startDate"
                  type="date"
                  required
                  max={today}
                  defaultValue={today}
                  className="min-h-11 w-full rounded-lg border bg-background px-3"
                />
              </Field>
              <Field label="Jatuh tempo (opsional)">
                <input
                  name="dueDate"
                  type="date"
                  className="min-h-11 w-full rounded-lg border bg-background px-3"
                />
              </Field>
              {origin === "current" ? (
                <Field label="Akun penerima/sumber dana">
                  <AppSelect
                    name="accountId"
                    required
                    className="min-h-11 w-full rounded-lg border bg-background px-3"
                    placeholder="Pilih akun"
                    options={accounts.map((account) => ({
                      value: account.id,
                      label: account.name,
                    }))}
                  />
                </Field>
              ) : (
                <input type="hidden" name="accountId" value="" />
              )}
            </div>
            <Field label="Catatan (opsional)">
              <textarea
                name="note"
                maxLength={1000}
                rows={3}
                className="w-full rounded-lg border bg-background px-3 py-3"
              />
            </Field>
            <Button type="submit" className="w-full">
              Simpan catatan
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelectedId(undefined)}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto p-0 sm:max-w-xl"
        >
          {selected && (
            <>
              <SheetHeader className="border-b p-5 pr-16">
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>
                  {selected.kind === "debt" ? "Utang kepada" : "Piutang dari"}{" "}
                  {selected.counterparty}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 p-5">
                <div className="grid grid-cols-2 gap-3 rounded-2xl border p-4">
                  <Detail
                    label="Pokok"
                    value={rupiah(selected.principalAmount)}
                    sensitive
                  />
                  <Detail
                    label="Sudah dibayar"
                    value={rupiah(selected.paidAmount)}
                    sensitive
                  />
                  <Detail
                    label="Sisa"
                    value={rupiah(selected.outstandingAmount)}
                    sensitive
                    strong
                  />
                  <Detail
                    label="Status"
                    value={statusLabels[selected.status]}
                    strong
                  />
                  <Detail
                    label="Tanggal mulai"
                    value={dateLabel(selected.startDate)}
                  />
                  <Detail
                    label="Jatuh tempo"
                    value={
                      selected.dueDate
                        ? dateLabel(selected.dueDate)
                        : "Tidak ditentukan"
                    }
                  />
                  <Detail
                    label="Pencatatan awal"
                    value={
                      selected.origin === "current"
                        ? `Saldo ${selected.accountName ?? "akun"} disesuaikan`
                        : "Catatan lama · saldo awal tidak berubah"
                    }
                  />
                  {selected.note && (
                    <Detail label="Catatan" value={selected.note} />
                  )}
                </div>

                {canManage && selected.status !== "settled" && (
                  <form
                    action={createDebtPaymentAction}
                    className="space-y-4 rounded-2xl border bg-secondary/25 p-4"
                  >
                    <div>
                      <h3 className="font-semibold">Catat pembayaran</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selected.kind === "debt"
                          ? "Pembayaran mengurangi saldo akun."
                          : "Pembayaran menambah saldo akun."}
                      </p>
                    </div>
                    <input
                      type="hidden"
                      name="workspaceId"
                      value={workspaceId}
                    />
                    <input
                      type="hidden"
                      name="debtRecordId"
                      value={selected.id}
                    />
                    <input
                      type="hidden"
                      name="idempotencyKey"
                      value={`payment-${formSeed}-${selected.id}`}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Nominal">
                        <RupiahInput
                          name="amount"
                          placeholder={rupiah(selected.outstandingAmount)}
                          className="min-h-11 w-full rounded-lg border bg-background px-3"
                        />
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Isi untuk cicilan, atau gunakan tombol{" "}
                          {selected.kind === "debt" ? "bayar" : "terima"} penuh.
                        </span>
                      </Field>
                      <Field label="Tanggal">
                        <input
                          name="paymentDate"
                          type="date"
                          min={selected.startDate}
                          max={today}
                          defaultValue={today}
                          required
                          className="min-h-11 w-full rounded-lg border bg-background px-3"
                        />
                      </Field>
                      <Field label="Akun">
                        <AppSelect
                          name="accountId"
                          required
                          className="min-h-11 w-full rounded-lg border bg-background px-3"
                          placeholder="Pilih akun"
                          options={accounts.map((account) => ({
                            value: account.id,
                            label: account.name,
                          }))}
                        />
                      </Field>
                      <Field label="Catatan (opsional)">
                        <input
                          name="note"
                          maxLength={500}
                          className="min-h-11 w-full rounded-lg border bg-background px-3"
                        />
                      </Field>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        type="submit"
                        variant="outline"
                        formAction={settleDebtRecordAction}
                      >
                        {selected.kind === "debt"
                          ? "Bayar penuh"
                          : "Terima penuh"}
                      </Button>
                      <Button type="submit">Simpan cicilan</Button>
                    </div>
                  </form>
                )}

                <div>
                  <h3 className="flex items-center gap-2 font-semibold">
                    <ReceiptText className="size-4 text-primary" /> Riwayat
                    pembayaran
                  </h3>
                  {selected.payments.length === 0 ? (
                    <p className="mt-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                      Belum ada pembayaran.
                    </p>
                  ) : (
                    <div className="mt-3 divide-y rounded-xl border px-4">
                      {selected.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-start justify-between gap-3 py-3 text-sm"
                        >
                          <div>
                            <p className="font-medium">
                              {dateLabel(payment.paymentDate)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {payment.accountName}
                              {payment.note ? ` · ${payment.note}` : ""}
                            </p>
                          </div>
                          <SensitiveAmount className="font-semibold">
                            {rupiah(payment.amount)}
                          </SensitiveAmount>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  amount,
  tone,
}: {
  icon: typeof ArrowDownLeft;
  label: string;
  amount: string;
  tone: "debt" | "receivable";
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-xl",
            tone === "debt"
              ? "bg-rose-500/12 text-rose-500"
              : "bg-primary/12 text-primary",
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <SensitiveAmount className="mt-1 block text-xl font-semibold">
            {rupiah(amount)}
          </SensitiveAmount>
        </div>
      </CardContent>
    </Card>
  );
}

function RadioCard({
  name,
  value,
  label,
  description,
  defaultChecked,
  icon: Icon,
}: {
  name: string;
  value: string;
  label: string;
  description: string;
  defaultChecked?: boolean;
  icon: typeof ArrowDownLeft;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      <Icon className="size-5 text-primary" />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function Detail({
  label,
  value,
  sensitive,
  strong,
}: {
  label: string;
  value: string;
  sensitive?: boolean;
  strong?: boolean;
}) {
  const content = sensitive ? (
    <SensitiveAmount>{value}</SensitiveAmount>
  ) : (
    value
  );
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 break-words text-sm", strong && "font-semibold")}>
        {content}
      </p>
    </div>
  );
}
