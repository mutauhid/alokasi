"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  CheckCircle2,
  LoaderCircle,
  Scale,
} from "lucide-react";
import { createBalanceReconciliationAction } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";
import { SensitiveAmount } from "@/components/amount-privacy";

const MAX_POSITIVE = "9223372036854775807";
const MAX_NEGATIVE_MAGNITUDE = "9223372036854775808";

function normalizeSignedRupiah(value: string) {
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const digits = trimmed.replace(/\D/g, "");
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
  return negative ? "-" + normalized : normalized;
}

function formatInput(value: string) {
  if (!value || value === "-") return value;
  const negative = value.startsWith("-");
  const digits = negative ? value.slice(1) : value;
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return negative ? "-" + formatted : formatted;
}

function rupiah(value: bigint) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ReconciliationForm({
  workspaceId,
  accountId,
  reconciliationDate,
  recordedBalance,
  idempotencyKey,
}: {
  workspaceId: string;
  accountId: string;
  reconciliationDate: string;
  recordedBalance: string;
  idempotencyKey: string;
}) {
  const [actualBalance, setActualBalance] = useState("");
  const [tooLarge, setTooLarge] = useState(false);
  const actual = /^-?\d+$/u.test(actualBalance) ? BigInt(actualBalance) : null;
  const difference = actual === null ? null : actual - BigInt(recordedBalance);

  return (
    <form
      action={createBalanceReconciliationAction}
      className="space-y-4 rounded-2xl border p-4 sm:p-5"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="accountId" value={accountId} />
      <input
        type="hidden"
        name="reconciliationDate"
        value={reconciliationDate}
      />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="actualBalance" value={actualBalance} />

      <label className="block text-sm font-semibold">
        Saldo aktual
        <span className="mt-2 flex min-h-12 items-center gap-1.5 rounded-xl border bg-background px-3 shadow-xs focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50">
          <span aria-hidden="true" className="text-muted-foreground">
            Rp
          </span>
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            required
            placeholder="0"
            value={formatInput(actualBalance)}
            aria-invalid={tooLarge || undefined}
            onChange={(event) => {
              const normalized = normalizeSignedRupiah(event.target.value);
              setTooLarge(normalized === null);
              if (normalized !== null) setActualBalance(normalized);
            }}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </span>
        {tooLarge && (
          <span role="alert" className="mt-1 block text-xs text-destructive">
            Nominal melebihi batas penyimpanan.
          </span>
        )}
      </label>

      <label className="block text-sm font-semibold">
        Catatan pemeriksaan <span className="font-normal">(opsional)</span>
        <textarea
          name="note"
          rows={3}
          maxLength={500}
          placeholder="Contoh: Dicocokkan dengan mutasi rekening"
          className="mt-2 w-full rounded-xl border bg-background px-3 py-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
        />
      </label>

      <div
        className={
          difference === null
            ? "rounded-2xl border bg-muted/40 p-4"
            : difference === 0n
              ? "rounded-2xl border border-primary/25 bg-primary/[0.07] p-4"
              : "rounded-2xl border border-destructive/30 bg-destructive/[0.06] p-4"
        }
        aria-live="polite"
      >
        <div className="flex items-center gap-3 text-sm">
          {difference !== null && (
            <span
              className={
                difference === 0n
                  ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary"
                  : "flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/12 text-destructive"
              }
            >
              {difference === 0n ? (
                <CheckCircle2 className="size-4.5" aria-hidden="true" />
              ) : difference > 0n ? (
                <ArrowUp className="size-4.5" aria-hidden="true" />
              ) : (
                <ArrowDown className="size-4.5" aria-hidden="true" />
              )}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <span className="text-xs text-muted-foreground">Selisih</span>
            <strong
              className={
                difference !== null && difference !== 0n
                  ? "mt-0.5 block break-words text-xl text-destructive"
                  : "mt-0.5 block break-words text-xl text-foreground"
              }
            >
              {difference === null ? (
                "—"
              ) : (
                <SensitiveAmount>{rupiah(difference)}</SensitiveAmount>
              )}
            </strong>
          </div>
        </div>
        {difference === 0n && (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Saldo cocok. Konfirmasi akan menyimpan snapshot tanpa membuat
            transaksi atau penyesuaian bernilai nol.
          </p>
        )}
        {difference !== null && difference !== 0n && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {difference > 0n
              ? "Saldo aktual lebih besar daripada catatan Alokasi."
              : "Saldo aktual lebih kecil daripada catatan Alokasi."}{" "}
            Periksa transaksi terlebih dahulu; penyesuaian digunakan jika
            penyebabnya tidak dapat ditemukan.
          </p>
        )}
      </div>

      {difference !== null && (
        <div className="rounded-xl border border-dashed p-3 text-xs leading-relaxed text-muted-foreground">
          Periksa kembali tanggal, saldo aktual, dan selisih. Penyesuaian hanya
          dibuat setelah tombol konfirmasi berhasil diproses server.
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
        {difference !== null && difference !== 0n && (
          <Button
            asChild
            type="button"
            variant="outline"
            className="min-h-11 rounded-xl"
          >
            <Link
              href={
                "/transactions?workspaceId=" + encodeURIComponent(workspaceId)
              }
            >
              <ArrowLeftRight /> Periksa transaksi
            </Link>
          </Button>
        )}
        {difference === 0n ? (
          <ReconciliationSubmit resolution="matched" />
        ) : difference !== null ? (
          <ReconciliationSubmit resolution="adjusted" />
        ) : null}
      </div>
    </form>
  );
}

function ReconciliationSubmit({
  resolution,
}: {
  resolution: "matched" | "adjusted";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="resolution"
      value={resolution}
      disabled={pending}
      className="min-h-11 rounded-xl"
    >
      {pending ? (
        <LoaderCircle
          className="size-4 motion-safe:animate-spin"
          aria-hidden="true"
        />
      ) : resolution === "matched" ? (
        <CheckCircle2 aria-hidden="true" />
      ) : (
        <Scale aria-hidden="true" />
      )}
      {pending
        ? "Menyimpan…"
        : resolution === "matched"
          ? "Konfirmasi pencocokan"
          : "Sesuaikan saldo dan konfirmasi"}
    </Button>
  );
}
