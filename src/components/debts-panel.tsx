"use client";

import {
  useId,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  HandCoins,
  Landmark,
  Plus,
  ReceiptText,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  createDebtPaymentAction,
  createDebtRecordAction,
  settleDebtRecordAction,
} from "@/app/(workspace)/debt-actions";
import { SensitiveAmount, useAmountsHidden } from "@/components/amount-privacy";
import { AppSelect } from "@/components/ui/app-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RupiahInput } from "@/components/ui/rupiah-input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type DebtStatus = "unpaid" | "partial" | "settled" | "overdue";
type DebtKind = "debt" | "receivable";

export type DebtPanelItem = {
  id: string;
  kind: DebtKind;
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

function amount(value: string) {
  return new Intl.NumberFormat("id-ID").format(BigInt(value));
}

function rupiah(value: string) {
  return `Rp ${amount(value)}`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function paymentPercentage(item: DebtPanelItem) {
  const principal = BigInt(item.principalAmount);
  if (principal <= 0n) return 0;
  return Math.min(
    100,
    Math.max(0, Number((BigInt(item.paidAmount) * 100n) / principal)),
  );
}

function kindLabel(kind: DebtKind) {
  return kind === "debt" ? "Utang" : "Piutang";
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
  const [kindFilter, setKindFilter] = useState<"all" | DebtKind>("all");
  const selected = items.find((item) => item.id === selectedId);
  const filtered = useMemo(
    () =>
      items.filter((item) => kindFilter === "all" || item.kind === kindFilter),
    [items, kindFilter],
  );
  const overdueItems = items.filter((item) => item.status === "overdue");
  const counts = {
    all: items.length,
    debt: items.filter((item) => item.kind === "debt").length,
    receivable: items.filter((item) => item.kind === "receivable").length,
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Keuangan pribadi
          </p>
          <h1 className="text-[26px] font-semibold tracking-[-0.04em] sm:text-3xl">
            Utang & Piutang
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Pantau kewajiban, tagihan personal, dan jatuh temponya.
          </p>
        </div>
        {canManage && (
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="min-h-11 w-full rounded-xl shadow-[0_10px_30px_-14px_var(--primary)] sm:w-auto"
          >
            <Plus className="size-4" aria-hidden="true" /> Tambah catatan
          </Button>
        )}
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {errorMessages[error] ?? errorMessages["debt-failed"]}
        </p>
      )}

      <section
        className="grid grid-cols-2 gap-3 lg:grid-cols-3"
        aria-label="Ringkasan utang dan piutang"
      >
        <SummaryCard
          icon={ArrowDownLeft}
          label="Sisa utang"
          amountValue={totals.debt}
          count={counts.debt}
          tone="debt"
        />
        <SummaryCard
          icon={ArrowUpRight}
          label="Sisa piutang"
          amountValue={totals.receivable}
          count={counts.receivable}
          tone="receivable"
        />
        <Card className="hidden gap-0 overflow-hidden rounded-2xl border-amber-500/20 bg-gradient-to-br from-card to-amber-500/[0.045] py-0 shadow-none lg:block">
          <CardContent className="flex min-h-[7.8rem] items-center gap-4 p-4 sm:p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-300">
              <CalendarClock className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Terlambat
              </p>
              <p className="mt-1 text-xl font-semibold tracking-[-0.025em] tabular-nums">
                {totals.overdue} catatan
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {totals.overdue > 0
                  ? "Perlu segera ditindaklanjuti"
                  : "Tidak ada tunggakan"}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {totals.overdue > 0 && (
        <section
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/12 to-amber-500/[0.035] p-4 sm:gap-4 sm:p-5"
        >
          <div className="flex min-w-0 flex-1 gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                Ada {totals.overdue} catatan yang terlambat
              </p>
              <p className="mt-1 hidden text-sm leading-relaxed text-muted-foreground sm:block">
                Periksa kewajiban yang sudah melewati jatuh tempo agar tidak
                tertunda lebih lama.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="size-11 shrink-0 rounded-xl border-amber-500/35 bg-background/60 px-0 sm:h-11 sm:w-auto sm:px-4"
            aria-label="Lihat catatan yang terlambat"
            onClick={() => setSelectedId(overdueItems[0]?.id)}
          >
            <span className="hidden sm:inline">Lihat catatan</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </section>
      )}

      <Card className="gap-0 overflow-hidden rounded-2xl py-0 shadow-none">
        <CardContent className="p-0">
          <div className="border-b p-4 sm:p-6">
            <h2 className="text-lg font-semibold tracking-[-0.025em] sm:text-xl">
              Daftar utang & piutang
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Kelola semua catatan utang dan piutangmu.
            </p>
            <div
              className="mt-4 grid grid-cols-3 gap-2 sm:flex"
              role="group"
              aria-label="Filter jenis catatan"
            >
              {(["all", "debt", "receivable"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={kindFilter === value ? "default" : "outline"}
                  aria-pressed={kindFilter === value}
                  onClick={() => setKindFilter(value)}
                  className="min-h-10 rounded-xl px-3"
                >
                  {value === "all"
                    ? "Semua"
                    : value === "debt"
                      ? "Utang"
                      : "Piutang"}{" "}
                  <span className="tabular-nums opacity-70">
                    ({counts[value]})
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-14 text-center">
              <CircleDollarSign
                className="size-8 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-3 font-medium">Belum ada catatan</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {items.length === 0
                  ? "Tambahkan utang atau piutang untuk memantau sisa dan jatuh temponya."
                  : `Belum ada catatan ${kindFilter === "debt" ? "utang" : "piutang"}.`}
              </p>
            </div>
          ) : (
            <ul className="divide-y px-3 sm:px-5">
              {filtered.map((item) => (
                <DebtRecordRow
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={() => setSelectedId(item.id)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CreateDebtSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        workspaceId={workspaceId}
        formSeed={formSeed}
        today={today}
        origin={origin}
        setOrigin={setOrigin}
        accounts={accounts}
      />

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelectedId(undefined)}
      >
        <SheetContent
          side="responsive"
          showCloseButton={false}
          closeLabel="Tutup detail utang atau piutang"
          className="gap-0 overflow-y-auto overscroll-contain bg-card p-0 pb-[max(5.75rem,env(safe-area-inset-bottom))] md:max-w-[32rem] md:pb-6"
        >
          {selected && (
            <DebtDetail
              selected={selected}
              workspaceId={workspaceId}
              today={today}
              canManage={canManage}
              accounts={accounts}
              formSeed={formSeed}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DebtRecordRow({
  item,
  selected,
  onSelect,
}: {
  item: DebtPanelItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const ItemIcon = item.kind === "debt" ? ArrowDownLeft : ArrowUpRight;
  return (
    <li className="py-2 first:pt-3 last:pb-3">
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`Lihat detail ${kindLabel(item.kind).toLowerCase()} ${item.title}`}
        onClick={onSelect}
        className="group grid w-full grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-xl px-2 py-3.5 text-left transition-[background-color,box-shadow,transform] hover:bg-accent/40 active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-pressed:bg-accent/55 aria-pressed:shadow-[inset_3px_0_0_var(--primary)] sm:grid-cols-[2.75rem_minmax(0,1fr)_minmax(9.5rem,auto)] sm:items-center sm:px-3"
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
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate font-semibold leading-snug">
              {item.title}
            </span>
            <StatusBadge status={item.status} />
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {item.counterparty} · {kindLabel(item.kind)}
            {item.dueDate ? ` · jatuh tempo ${dateLabel(item.dueDate)}` : ""}
          </span>
          <PaymentProgress item={item} compact className="mt-3 max-w-md" />
        </span>
        <span className="col-start-2 flex min-w-0 items-center justify-between gap-3 sm:col-start-auto sm:block sm:text-right">
          <span className="text-xs text-muted-foreground sm:block">Sisa</span>
          <SensitiveAmount
            className={cn(
              "break-words text-sm font-semibold",
              item.kind === "debt" ? "text-rose-500" : "text-primary",
            )}
          >
            {rupiah(item.outstandingAmount)}
          </SensitiveAmount>
          <ArrowRight
            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:ml-auto sm:mt-2"
            aria-hidden="true"
          />
        </span>
      </button>
    </li>
  );
}

function DebtDetail({
  selected,
  workspaceId,
  today,
  canManage,
  accounts,
  formSeed,
}: {
  selected: DebtPanelItem;
  workspaceId: string;
  today: string;
  canManage: boolean;
  accounts: Array<{ id: string; name: string }>;
  formSeed: string;
}) {
  const ItemIcon = selected.kind === "debt" ? ArrowDownLeft : ArrowUpRight;
  return (
    <>
      <SheetHeader className="sticky top-0 z-10 border-b bg-card/95 px-5 py-4 pr-16 backdrop-blur-xl sm:px-6 md:py-5">
        <SheetCloseButton label="Tutup detail utang atau piutang" />
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              selected.kind === "debt"
                ? "bg-rose-500/12 text-rose-500"
                : "bg-primary/12 text-primary",
            )}
          >
            <ItemIcon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <SheetTitle className="truncate text-lg">
              {selected.title}
            </SheetTitle>
            <SheetDescription className="mt-0.5 truncate">
              {selected.kind === "debt" ? "Utang kepada" : "Piutang dari"}{" "}
              {selected.counterparty}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="space-y-4 px-4 py-5 sm:px-6">
        <section
          className={cn(
            "rounded-2xl border p-5",
            selected.kind === "debt"
              ? "border-rose-500/25 bg-gradient-to-br from-rose-500/12 to-card"
              : "border-primary/25 bg-gradient-to-br from-primary/12 to-card",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                {selected.kind === "debt"
                  ? "Sisa yang harus dibayar"
                  : "Sisa yang harus diterima"}
              </p>
              <SensitiveAmount
                className={cn(
                  "mt-2 block break-words text-3xl font-semibold tracking-[-0.045em]",
                  selected.kind === "debt" ? "text-rose-400" : "text-primary",
                )}
              >
                {rupiah(selected.outstandingAmount)}
              </SensitiveAmount>
            </div>
            <StatusBadge status={selected.status} />
          </div>
        </section>

        <section className="rounded-2xl border bg-muted/15 p-4">
          <PaymentProgress item={selected} showAmounts />
        </section>

        <section className="rounded-2xl border p-4 sm:p-5">
          <h3 className="font-semibold">Informasi catatan</h3>
          <dl className="mt-3 divide-y text-sm">
            <InfoRow
              icon={UserRound}
              label="Pihak terkait"
              value={selected.counterparty}
            />
            <InfoRow
              icon={HandCoins}
              label="Jenis"
              value={kindLabel(selected.kind)}
            />
            <InfoRow
              icon={CalendarClock}
              label="Tanggal mulai"
              value={dateLabel(selected.startDate)}
            />
            <InfoRow
              icon={Clock3}
              label="Jatuh tempo"
              value={
                selected.dueDate
                  ? dateLabel(selected.dueDate)
                  : "Tidak ditentukan"
              }
            />
            <InfoRow
              icon={CheckCircle2}
              label="Status"
              value={statusLabels[selected.status]}
            />
            <InfoRow
              icon={Landmark}
              label="Pencatatan awal"
              value={
                selected.origin === "current"
                  ? `Saldo ${selected.accountName ?? "akun"} disesuaikan`
                  : "Catatan lama · saldo awal tidak berubah"
              }
            />
          </dl>
          {selected.note && (
            <div className="mt-4 rounded-xl bg-muted/30 p-3 text-sm">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Catatan
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">
                {selected.note}
              </p>
            </div>
          )}
        </section>

        {canManage && selected.status !== "settled" && (
          <PaymentForm
            selected={selected}
            workspaceId={workspaceId}
            today={today}
            accounts={accounts}
            formSeed={formSeed}
          />
        )}
        <PaymentHistory selected={selected} />
      </div>
    </>
  );
}

function PaymentForm({
  selected,
  workspaceId,
  today,
  accounts,
  formSeed,
}: {
  selected: DebtPanelItem;
  workspaceId: string;
  today: string;
  accounts: Array<{ id: string; name: string }>;
  formSeed: string;
}) {
  const descriptionId = `payment-help-${selected.id}`;
  return (
    <form
      action={createDebtPaymentAction}
      className="space-y-4 rounded-2xl border bg-secondary/20 p-4 sm:p-5"
    >
      <div>
        <h3 className="font-semibold">Catat pembayaran</h3>
        <p
          id={descriptionId}
          className="mt-1 text-xs leading-relaxed text-muted-foreground"
        >
          {selected.kind === "debt"
            ? "Pembayaran mengurangi saldo akun yang dipilih."
            : "Penerimaan pembayaran menambah saldo akun yang dipilih."}
        </p>
      </div>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="debtRecordId" value={selected.id} />
      <input
        type="hidden"
        name="idempotencyKey"
        value={`payment-${formSeed}-${selected.id}`}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nominal pembayaran">
          <RupiahInput
            name="amount"
            placeholder={amount(selected.outstandingAmount)}
            aria-describedby={descriptionId}
            className="min-h-11 w-full rounded-xl border bg-background px-3"
          />
          <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
            Isi nominal cicilan atau pilih pelunasan penuh.
          </span>
        </Field>
        <Field label="Tanggal pembayaran">
          <input
            name="paymentDate"
            type="date"
            min={selected.startDate}
            max={today}
            defaultValue={today}
            required
            className="min-h-11 w-full rounded-xl border bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
            Format mengikuti bahasa perangkat; tanggal disimpan tanpa mengubah
            zona waktu workspace.
          </span>
        </Field>
        <Field label="Akun">
          <AppSelect
            name="accountId"
            required
            placeholder={
              selected.kind === "debt"
                ? "Pilih akun pembayaran"
                : "Pilih akun penerimaan"
            }
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
            placeholder="Contoh: Cicilan pertama"
            className="min-h-11 w-full rounded-xl border bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {selected.kind === "debt" ? "Bayar penuh" : "Terima penuh"} langsung
        mencatat seluruh sisa setelah akun dan tanggal lolos validasi.
      </p>
      <PaymentSubmitActions kind={selected.kind} />
    </form>
  );
}

function PaymentSubmitActions({ kind }: { kind: DebtKind }) {
  const { pending } = useFormStatus();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button
        type="submit"
        variant="outline"
        formAction={settleDebtRecordAction}
        disabled={pending}
        className="min-h-11 rounded-xl"
      >
        <Check className="size-4" aria-hidden="true" />
        {pending
          ? "Menyimpan..."
          : kind === "debt"
            ? "Bayar penuh"
            : "Terima penuh"}
      </Button>
      <Button type="submit" disabled={pending} className="min-h-11 rounded-xl">
        {pending ? "Menyimpan..." : "Simpan cicilan"}
      </Button>
    </div>
  );
}

function PaymentHistory({ selected }: { selected: DebtPanelItem }) {
  return (
    <section className="rounded-2xl border p-4 sm:p-5">
      <h3 className="flex items-center gap-2 font-semibold">
        <ReceiptText className="size-4 text-primary" aria-hidden="true" />{" "}
        Riwayat pembayaran
      </h3>
      {selected.payments.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed px-4 py-7 text-center">
          <ReceiptText
            className="size-7 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-medium">Belum ada pembayaran.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Riwayat akan muncul setelah pembayaran dicatat.
          </p>
        </div>
      ) : (
        <div className="mt-3 divide-y">
          {selected.payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-start gap-3 py-3.5 first:pt-1 last:pb-0"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CheckCircle2 className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {dateLabel(payment.paymentDate)}
                </p>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {payment.accountName}
                  {payment.note ? ` · ${payment.note}` : ""}
                </p>
              </div>
              <SensitiveAmount className="break-words text-right text-sm font-semibold text-primary">
                {rupiah(payment.amount)}
              </SensitiveAmount>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CreateDebtSheet({
  open,
  onOpenChange,
  workspaceId,
  formSeed,
  today,
  origin,
  setOrigin,
  accounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  formSeed: string;
  today: string;
  origin: "current" | "historical";
  setOrigin: (value: "current" | "historical") => void;
  accounts: Array<{ id: string; name: string }>;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="responsive"
        showCloseButton={false}
        closeLabel="Tutup form tambah utang atau piutang"
        className="gap-0 overflow-y-auto overscroll-contain bg-card p-0 pb-[max(5.75rem,env(safe-area-inset-bottom))] md:max-w-[34rem] md:pb-6"
      >
        <SheetHeader className="sticky top-0 z-10 border-b bg-card/95 px-5 py-4 pr-16 backdrop-blur-xl sm:px-6 md:py-5">
          <SheetCloseButton label="Tutup form tambah utang atau piutang" />
          <SheetTitle className="text-lg">Tambah utang atau piutang</SheetTitle>
          <SheetDescription>
            Catat kewajiban baru atau saldo lama tanpa mencampurnya dengan arus
            kas.
          </SheetDescription>
        </SheetHeader>
        <form action={createDebtRecordAction} className="space-y-5 p-4 sm:p-6">
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
              <RadioCard
                name="origin"
                value="current"
                label="Baru terjadi"
                description="Sesuaikan saldo"
                checked={origin === "current"}
                onChange={() => setOrigin("current")}
                icon={WalletCards}
              />
              <RadioCard
                name="origin"
                value="historical"
                label="Catatan lama"
                description="Saldo awal tetap"
                checked={origin === "historical"}
                onChange={() => setOrigin("historical")}
                icon={Clock3}
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
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
                className="min-h-11 w-full rounded-xl border bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>
            <Field label="Judul">
              <input
                name="title"
                required
                maxLength={100}
                placeholder="Contoh: Pinjaman motor"
                className="min-h-11 w-full rounded-xl border bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>
            <Field label="Nominal pokok">
              <RupiahInput
                name="principalAmount"
                required
                className="min-h-11 w-full rounded-xl border bg-background px-3"
              />
            </Field>
            <Field label="Tanggal mulai">
              <input
                name="startDate"
                type="date"
                required
                max={today}
                defaultValue={today}
                className="min-h-11 w-full rounded-xl border bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="mt-1.5 block text-xs text-muted-foreground">
                Format tanggal mengikuti bahasa perangkat.
              </span>
            </Field>
            <Field label="Jatuh tempo (opsional)">
              <input
                name="dueDate"
                type="date"
                className="min-h-11 w-full rounded-xl border bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>
            {origin === "current" ? (
              <Field label="Akun penerima/sumber dana">
                <AppSelect
                  name="accountId"
                  required
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
              placeholder="Tambahkan konteks bila diperlukan"
              className="w-full rounded-xl border bg-background px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
          <PendingCreateButton />
        </form>
      </SheetContent>
    </Sheet>
  );
}

function PendingCreateButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="min-h-11 w-full rounded-xl"
    >
      {pending ? "Menyimpan..." : "Simpan catatan"}
    </Button>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  amountValue,
  count,
  tone,
}: {
  icon: typeof ArrowDownLeft;
  label: string;
  amountValue: string;
  count: number;
  tone: DebtKind;
}) {
  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden rounded-2xl py-0 shadow-none",
        tone === "debt"
          ? "border-rose-500/15 bg-gradient-to-br from-card to-rose-500/[0.04]"
          : "border-primary/15 bg-gradient-to-br from-card to-primary/[0.04]",
      )}
    >
      <CardContent className="min-h-[7.8rem] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">
            {label}
          </p>
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-11",
              tone === "debt"
                ? "bg-rose-500/12 text-rose-500"
                : "bg-primary/12 text-primary",
            )}
          >
            <Icon className="size-4.5 sm:size-5" aria-hidden="true" />
          </span>
        </div>
        <SensitiveAmount
          className={cn(
            "mt-2 block break-words text-lg font-semibold tracking-[-0.035em] sm:text-2xl",
            tone === "debt" ? "text-rose-500" : "text-primary",
          )}
        >
          {rupiah(amountValue)}
        </SensitiveAmount>
        <p className="mt-1 text-xs text-muted-foreground">{count} catatan</p>
      </CardContent>
    </Card>
  );
}

function PaymentProgress({
  item,
  compact = false,
  showAmounts = false,
  className,
}: {
  item: DebtPanelItem;
  compact?: boolean;
  showAmounts?: boolean;
  className?: string;
}) {
  const amountsHidden = useAmountsHidden();
  const percentage = paymentPercentage(item);
  return (
    <div className={className}>
      {compact && (
        <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span>Terbayar</span>
          <SensitiveAmount className="font-medium">
            {percentage}%
          </SensitiveAmount>
        </div>
      )}
      {!compact && (
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold">Progres pembayaran</span>
          <SensitiveAmount className="font-semibold">
            {percentage}%
          </SensitiveAmount>
        </div>
      )}
      <div
        className={cn(
          "overflow-hidden rounded-full bg-muted",
          compact ? "h-1.5" : "h-2",
        )}
        role="progressbar"
        aria-label="Progres pembayaran"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={amountsHidden ? undefined : percentage}
        aria-valuetext={
          amountsHidden
            ? "Progres pembayaran disembunyikan"
            : `${percentage}% sudah dibayar`
        }
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none",
            item.kind === "debt" ? "bg-rose-400" : "bg-primary",
          )}
          style={{ width: amountsHidden ? "0%" : `${percentage}%` }}
        />
      </div>
      {showAmounts && (
        <div className="mt-2 flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <SensitiveAmount>{rupiah(item.paidAmount)} dibayar</SensitiveAmount>
          <SensitiveAmount className="text-right">
            {rupiah(item.principalAmount)} pokok
          </SensitiveAmount>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: DebtStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-current/20",
        status === "overdue" &&
          "bg-amber-500/10 text-amber-700 dark:text-amber-300",
        status === "settled" && "bg-primary/10 text-primary",
        status === "partial" && "bg-sky-500/10 text-sky-700 dark:text-sky-300",
        status === "unpaid" && "bg-muted text-muted-foreground",
      )}
    >
      {statusLabels[status]}
    </Badge>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3 py-3 first:pt-1 last:pb-0">
      <Icon
        className="mt-0.5 size-4 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 break-words font-medium">{value}</dd>
      </div>
    </div>
  );
}

function RadioCard({
  name,
  value,
  label,
  description,
  defaultChecked,
  checked,
  onChange,
  icon: Icon,
}: {
  name: string;
  value: string;
  label: string;
  description: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: () => void;
  icon: ElementType;
}) {
  return (
    <label className="flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/35 has-[:checked]:border-primary has-[:checked]:bg-primary/8 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function SheetCloseButton({ label }: { label: string }) {
  return (
    <SheetClose asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-3 top-3 size-11 rounded-xl"
        aria-label={label}
        title={label}
      >
        <X className="size-4.5" aria-hidden="true" />
      </Button>
    </SheetClose>
  );
}
