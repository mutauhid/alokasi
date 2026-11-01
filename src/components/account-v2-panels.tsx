"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  Archive,
  Banknote,
  CreditCard,
  Info,
  Landmark,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  X,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  createAccountAction,
  renameAccountAction,
} from "@/app/(workspace)/actions";
import { ArchiveAccountButton } from "@/components/archive-account-button";
import { SensitiveAmount } from "@/components/amount-privacy";
import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type AccountKind = "bank" | "cash" | "ewallet";

export const accountKinds = {
  bank: { label: "Bank", icon: Landmark },
  cash: { label: "Tunai", icon: Banknote },
  ewallet: { label: "E-wallet", icon: CreditCard },
} as const;

const MAX_POSITIVE = "9223372036854775807";
const MAX_NEGATIVE_MAGNITUDE = "9223372036854775808";

function normalizeSignedAmount(value: string) {
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const digits = trimmed.replace(/\D/gu, "");
  if (!digits) return negative ? "-" : "";
  const normalized = digits.replace(/^0+(?=\d)/u, "");
  const maximum = negative ? MAX_NEGATIVE_MAGNITUDE : MAX_POSITIVE;
  if (
    normalized.length > maximum.length ||
    (normalized.length === maximum.length && normalized > maximum)
  ) {
    return null;
  }
  if (normalized === "0") return "0";
  return negative ? `-${normalized}` : normalized;
}

function formatSignedAmount(value: string) {
  if (!value || value === "-") return value;
  const negative = value.startsWith("-");
  const digits = negative ? value.slice(1) : value;
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/gu, ".");
  return negative ? `-${formatted}` : formatted;
}

function SignedRupiahInput({ name }: { name: string }) {
  const [value, setValue] = useState("0");
  const [tooLarge, setTooLarge] = useState(false);
  return (
    <>
      <span className="mt-2 flex min-h-12 items-center gap-2 rounded-xl border bg-background px-3 shadow-xs focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
        <span aria-hidden="true" className="shrink-0 text-muted-foreground">
          Rp
        </span>
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          required
          value={formatSignedAmount(value)}
          aria-label="Saldo awal dalam rupiah"
          aria-invalid={tooLarge || undefined}
          onChange={(event) => {
            const normalized = normalizeSignedAmount(event.target.value);
            setTooLarge(normalized === null);
            if (normalized !== null) setValue(normalized);
          }}
          className="min-w-0 flex-1 bg-transparent tabular-nums outline-none"
        />
      </span>
      <input type="hidden" name={name} value={value} />
      {tooLarge && (
        <span role="alert" className="mt-1.5 block text-xs text-destructive">
          Nominal melebihi batas penyimpanan.
        </span>
      )}
    </>
  );
}

function PendingButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="min-h-12 flex-1 rounded-xl sm:flex-none sm:min-w-44"
    >
      {pending && (
        <LoaderCircle
          className="size-4 motion-safe:animate-spin"
          aria-hidden="true"
        />
      )}
      {pending ? "Menyimpan…" : children}
    </Button>
  );
}

export function CreateAccountDialog({
  workspaceId,
  today,
}: {
  workspaceId: string;
  today: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button
          type="button"
          className="min-h-11 w-full rounded-xl px-5 sm:w-auto sm:min-w-40"
        >
          <Plus className="size-4.5" aria-hidden="true" />
          Tambah akun
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[3px] data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
        <DialogPrimitive.Content className="accounts-v2-dialog fixed inset-x-0 bottom-0 z-50 max-h-[94dvh] overflow-y-auto overscroll-contain rounded-t-3xl border bg-card shadow-2xl data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-2rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95">
          <div className="sticky top-0 z-10 border-b bg-card/95 px-5 py-5 pr-16 backdrop-blur-xl sm:px-7 sm:py-6">
            <div className="flex items-start gap-3.5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Landmark className="size-5.5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
                  Tambah akun baru
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Tambahkan sumber dana baru untuk pencatatan transaksi dan
                  rekonsiliasi.
                </DialogPrimitive.Description>
              </div>
            </div>
          </div>
          <form
            action={createAccountAction}
            className="space-y-5 px-5 py-6 sm:px-7"
            aria-label="Form tambah akun"
          >
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <div className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/[0.07] p-4 text-sm leading-relaxed">
              <Info
                className="mt-0.5 size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p>
                Saldo awal menjadi titik mulai pencatatan dan tidak dihitung
                sebagai pemasukan.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-semibold sm:col-span-2">
                Nama akun
                <input
                  name="name"
                  required
                  maxLength={100}
                  autoFocus
                  placeholder="Contoh: BCA utama"
                  className="mt-2 min-h-12 w-full rounded-xl border bg-background px-3 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
                />
              </label>
              <label className="block text-sm font-semibold">
                Jenis akun
                <AppSelect
                  name="type"
                  required
                  defaultValue="bank"
                  className="mt-2 min-h-12 w-full rounded-xl border bg-background px-3 text-sm shadow-xs"
                  options={Object.entries(accountKinds).map(
                    ([value, detail]) => ({ value, label: detail.label }),
                  )}
                />
              </label>
              <label className="block text-sm font-semibold">
                Saldo awal
                <SignedRupiahInput name="openingBalance" />
              </label>
              <label className="block text-sm font-semibold sm:col-span-2">
                Tanggal mulai
                <input
                  name="openingDate"
                  type="date"
                  required
                  max={today}
                  defaultValue={today}
                  className="mt-2 min-h-12 w-full rounded-xl border bg-background px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
                />
                <span className="mt-1.5 block text-xs font-normal text-muted-foreground">
                  Format tampilan mengikuti bahasa perangkat; tanggal disimpan
                  sebagai tanggal workspace.
                </span>
              </label>
            </div>
            <div className="sticky bottom-0 -mx-5 flex flex-col-reverse gap-2 border-t bg-card/95 px-5 pb-[max(0rem,env(safe-area-inset-bottom))] pt-5 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-end sm:bg-transparent sm:px-0 sm:pb-0">
              <DialogPrimitive.Close asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 rounded-xl sm:min-w-32"
                >
                  Batal
                </Button>
              </DialogPrimitive.Close>
              <PendingButton>Simpan akun</PendingButton>
            </div>
          </form>
          <DialogPrimitive.Close
            className="absolute right-4 top-4 z-20 flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Tutup dialog tambah akun"
          >
            <X className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ManageAccountSheet({
  workspaceId,
  account,
}: {
  workspaceId: string;
  account: {
    id: string;
    name: string;
    type: AccountKind;
    balanceLabel: string;
    balanceNegative: boolean;
    version: number;
    reconciliationLabel: string;
    reconciliationTone: "ok" | "warning" | "neutral";
  };
}) {
  const detail = accountKinds[account.type];
  const Icon = detail.icon;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 rounded-xl"
          aria-label={`Kelola akun ${account.name}`}
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="responsive"
        closeLabel="Tutup kelola akun"
        className="accounts-v2-sheet gap-0 overflow-y-auto overscroll-contain bg-card p-0 pb-[max(5.75rem,env(safe-area-inset-bottom))] md:max-w-[34rem] md:pb-6"
      >
        <SheetHeader className="sticky top-0 z-10 border-b bg-card/95 px-5 py-5 pr-16 backdrop-blur-xl sm:px-6">
          <SheetTitle className="text-xl tracking-[-0.02em]">
            Kelola akun
          </SheetTitle>
          <SheetDescription>
            {account.name} · Atur nama dan status akun.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-5 p-4 sm:p-6">
          <section className="grid gap-4 rounded-2xl border bg-secondary/20 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Icon className="size-5.5" aria-hidden="true" />
            </span>
            <div className="grid min-w-0 gap-3 sm:grid-cols-3 sm:divide-x">
              <div className="min-w-0 sm:px-3">
                <p className="text-xs text-muted-foreground">Jenis</p>
                <p className="mt-1 font-semibold">{detail.label}</p>
              </div>
              <div className="min-w-0 sm:px-3">
                <p className="text-xs text-muted-foreground">Saldo saat ini</p>
                <SensitiveAmount
                  className={cn(
                    "mt-1 block break-words font-semibold",
                    account.balanceNegative && "text-destructive",
                  )}
                >
                  {account.balanceLabel}
                </SensitiveAmount>
              </div>
              <div className="min-w-0 sm:px-3">
                <p className="text-xs text-muted-foreground">Rekonsiliasi</p>
                <p
                  className={cn(
                    "mt-1 text-xs font-medium",
                    account.reconciliationTone === "warning" &&
                      "text-amber-700 dark:text-amber-300",
                    account.reconciliationTone === "ok" && "text-primary",
                  )}
                >
                  {account.reconciliationLabel}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border p-4 sm:p-5">
            <h3 className="font-semibold">Pengaturan akun</h3>
            <form action={renameAccountAction} className="mt-4 space-y-4">
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="id" value={account.id} />
              <input type="hidden" name="version" value={account.version} />
              <label className="block text-sm font-medium">
                Nama akun
                <input
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={account.name}
                  className="mt-2 min-h-11 w-full rounded-xl border bg-background px-3 outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
                />
              </label>
              <label className="block text-sm font-medium">
                Jenis akun
                <span className="mt-2 flex min-h-11 items-center gap-2 rounded-xl border bg-muted/45 px-3 text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                  {detail.label}
                </span>
                <span className="mt-1.5 block text-xs font-normal text-muted-foreground">
                  Jenis akun tidak dapat diubah setelah akun dibuat.
                </span>
              </label>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <SheetClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 flex-1 rounded-xl"
                  >
                    Batal
                  </Button>
                </SheetClose>
                <RenameSubmit />
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-destructive/35 bg-destructive/[0.04] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/12 text-destructive">
                <Archive className="size-4.5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold">Arsipkan akun</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Histori tetap tersimpan. Akun hanya dapat diarsipkan ketika
                  saldo Rp0 dan tidak dipakai template transaksi berulang.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <ArchiveAccountButton
                workspaceId={workspaceId}
                id={account.id}
                version={account.version}
                name={account.name}
              />
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RenameSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="min-h-11 flex-1 rounded-xl"
    >
      {pending && (
        <LoaderCircle
          className="size-4 motion-safe:animate-spin"
          aria-hidden="true"
        />
      )}
      {pending ? "Menyimpan…" : "Simpan nama"}
    </Button>
  );
}
