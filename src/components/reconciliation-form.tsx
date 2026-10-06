"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftRight, CheckCircle2, Scale } from "lucide-react";
import { createBalanceReconciliationAction } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";

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
    <form action={createBalanceReconciliationAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="accountId" value={accountId} />
      <input
        type="hidden"
        name="reconciliationDate"
        value={reconciliationDate}
      />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="actualBalance" value={actualBalance} />

      <label className="block text-sm font-medium">
        Saldo aktual
        <span className="mt-1.5 flex min-h-11 items-center gap-1.5 rounded-lg border bg-background px-3 shadow-xs focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50">
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

      <label className="block text-sm font-medium">
        Catatan pemeriksaan <span className="font-normal">(opsional)</span>
        <textarea
          name="note"
          rows={3}
          maxLength={500}
          placeholder="Contoh: Dicocokkan dengan mutasi rekening"
          className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm shadow-xs"
        />
      </label>

      <div className="rounded-xl border bg-muted/40 p-4" aria-live="polite">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Selisih</span>
          <strong
            className={
              difference !== null && difference !== 0n
                ? "text-destructive"
                : "text-foreground"
            }
          >
            {difference === null ? "—" : rupiah(difference)}
          </strong>
        </div>
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

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {difference === 0n ? (
          <Button
            type="submit"
            name="resolution"
            value="matched"
            className="min-h-11"
          >
            <CheckCircle2 /> Simpan saldo cocok
          </Button>
        ) : difference !== null ? (
          <Button
            type="submit"
            name="resolution"
            value="adjusted"
            variant="secondary"
            className="min-h-11"
          >
            <Scale /> Sesuaikan saldo dan simpan
          </Button>
        ) : null}
        {difference !== null && difference !== 0n && (
          <Button asChild type="button" variant="outline" className="min-h-11">
            <Link
              href={
                "/transactions?workspaceId=" + encodeURIComponent(workspaceId)
              }
            >
              <ArrowLeftRight /> Periksa transaksi
            </Link>
          </Button>
        )}
      </div>
    </form>
  );
}
