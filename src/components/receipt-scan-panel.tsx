"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { Camera, FileImage, ShieldCheck, Sparkles } from "lucide-react";
import { receiptDraftAction } from "@/app/(workspace)/actions";
import { initialReceiptDraftState } from "@/modules/receipts/form-state";
import type { ReceiptDraftFormState } from "@/modules/receipts/form-state";
import {
  recognizeReceiptLocally,
  type OcrProgress,
} from "@/modules/receipts/client-ocr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RupiahInput } from "@/components/ui/rupiah-input";

type Option = { id: string; name: string };
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-xs";

function Confidence({ value }: { value: number | null }) {
  if (value === null)
    return (
      <span className="mt-1 block text-xs text-destructive">
        Tidak terdeteksi — isi manual
      </span>
    );
  return (
    <span className="mt-1 block text-xs text-muted-foreground">
      {value < 85 ? "Perlu diperiksa" : "Terbaca jelas"} · {value}%
    </span>
  );
}

export function ReceiptScanPanel({
  workspaceId,
  accounts,
  categories,
  initialState = initialReceiptDraftState,
}: {
  workspaceId: string;
  accounts: Option[];
  categories: Option[];
  initialState?: ReceiptDraftFormState;
}) {
  const [state, action, pending] = useActionState(
    receiptDraftAction,
    initialState,
  );
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [selectedFile, setSelectedFile] = useState<File>();
  const [fileError, setFileError] = useState<string>();
  const [ocrProgress, setOcrProgress] = useState<OcrProgress>();
  const [ocrRunning, setOcrRunning] = useState(false);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function chooseFile(file?: File) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(undefined);
    setSelectedFile(undefined);
    setFileError(undefined);
    if (!file) return;
    if (!allowedTypes.has(file.type)) {
      setFileError("Gunakan gambar JPEG, PNG, atau WebP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError("Ukuran gambar maksimal 10 MB.");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function extractReceipt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runOcr();
  }

  async function runOcr() {
    if (!selectedFile || ocrRunning) return;
    setFileError(undefined);
    setOcrRunning(true);
    setOcrProgress({ label: "Menyiapkan gambar", percent: 0 });
    try {
      const extracted = await recognizeReceiptLocally(
        selectedFile,
        setOcrProgress,
      );
      const form = new FormData();
      form.set("workspaceId", workspaceId);
      form.set("intent", "extract");
      form.set("amount", extracted.amount);
      form.set("transactionDate", extracted.transactionDate);
      form.set("merchant", extracted.merchant);
      form.set("note", extracted.note);
      form.set("institution", extracted.institution);
      form.set("evidenceKind", extracted.evidenceKind);
      form.set("paymentRail", extracted.paymentRail);
      form.set("ocrConfidence", String(extracted.confidence.ocr));
      form.set(
        "amountConfidence",
        extracted.confidence.amount?.toString() ?? "",
      );
      form.set("dateConfidence", extracted.confidence.date?.toString() ?? "");
      form.set(
        "merchantConfidence",
        extracted.confidence.merchant?.toString() ?? "",
      );
      form.set(
        "institutionConfidence",
        extracted.confidence.institution?.toString() ?? "",
      );
      startTransition(() => action(form));
    } catch {
      setFileError(
        "Gambar belum dapat dibaca. Coba gambar yang lebih tajam atau gunakan form transaksi manual.",
      );
    } finally {
      setOcrRunning(false);
    }
  }

  const draft = state.draft;
  const fromShortcut = draft?.sourceKind === "ios_shortcut";
  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Scan bukti pembayaran</CardTitle>
          <Badge variant="secondary">
            <Sparkles aria-hidden="true" /> OCR lokal
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Membaca struk, bukti transfer, atau QRIS di browser lalu menyiapkan
          draf yang dapat dikoreksi.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 rounded-xl border border-dashed p-4 text-sm">
          <ShieldCheck
            className="mt-0.5 size-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <p>
            {fromShortcut
              ? "Screenshot tetap di iPhone. Shortcut mengirim teks OCR ke server untuk diparsing sementara; teks mentah tidak disimpan."
              : "Gambar diproses di browser dengan aset OCR milik aplikasi. Gambar dan teks mentah tidak dikirim ke server atau disimpan; hanya field hasil yang kamu periksa yang menjadi draf."}
          </p>
        </div>

        {(fileError || state.error) && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {fileError ?? state.error}
          </p>
        )}
        {state.message && (
          <p role="status" className="rounded-lg bg-secondary p-3 text-sm">
            {state.message}
          </p>
        )}

        {!draft || state.phase === "idle" ? (
          <form
            onSubmit={extractReceipt}
            className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end"
          >
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <label className="text-sm font-medium">
              Foto struk atau bukti pembayaran
              <span className="mt-1.5 flex min-h-28 cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/40 px-4 text-center font-normal text-muted-foreground">
                <FileImage className="size-6" aria-hidden="true" />
                {previewUrl
                  ? "Gambar siap dipratinjau"
                  : "Pilih JPEG, PNG, atau WebP (maks. 10 MB)"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => chooseFile(event.target.files?.[0])}
              />
            </label>
            <Button
              type="submit"
              disabled={!selectedFile || pending || ocrRunning}
              className="min-h-11"
            >
              <Camera aria-hidden="true" />
              {ocrRunning
                ? `${ocrProgress?.label ?? "Membaca gambar"} ${ocrProgress?.percent ?? 0}%`
                : pending
                  ? "Menyimpan draf…"
                  : "Baca gambar"}
            </Button>
          </form>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-medium">
                  {fromShortcut ? "Draf dari iPhone" : "Pratinjau lokal"}
                </p>
                <Badge variant="outline">Draf privat</Badge>
              </div>
              {previewUrl ? (
                // This blob URL never leaves the current browser tab.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Pratinjau struk yang dipilih"
                  className="max-h-[28rem] w-full rounded-xl border object-contain"
                />
              ) : (
                <div className="flex min-h-52 items-center justify-center rounded-xl border bg-muted text-sm text-muted-foreground">
                  {fromShortcut
                    ? "Screenshot tidak diunggah dan tetap berada di iPhone."
                    : "Pratinjau tidak tersedia."}
                </div>
              )}
            </div>

            <div>
              <div className="mb-3">
                <p className="font-semibold">Periksa pengeluaran</p>
                <p className="text-sm text-muted-foreground">
                  Hasil OCR dapat keliru. Cocokkan setiap field dengan gambar
                  sebelum menyimpan.
                </p>
              </div>
              <div className="mb-4 grid gap-2 rounded-lg bg-muted p-3 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Jenis bukti</span>
                  <br />
                  <strong>
                    {draft.detection.evidenceKind === "qris"
                      ? "Pembayaran QRIS"
                      : draft.detection.evidenceKind === "transfer"
                        ? "Bukti transfer"
                        : draft.detection.evidenceKind === "receipt"
                          ? "Struk pembayaran"
                          : "Belum dikenali"}
                  </strong>
                  {draft.detection.paymentRail
                    ? ` · ${draft.detection.paymentRail}`
                    : ""}
                </p>
                <p>
                  <span className="text-muted-foreground">Bank/e-wallet</span>
                  <br />
                  <strong>
                    {draft.detection.institution || "Belum terdeteksi"}
                  </strong>
                  {draft.detection.institutionConfidence !== null
                    ? ` · ${draft.detection.institutionConfidence}%`
                    : ""}
                </p>
              </div>
              {draft.detection.evidenceKind === "transfer" && (
                <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  Pastikan transfer ini adalah pembayaran kepada pihak lain.
                  Jika ini transfer antar akun milikmu, batalkan draf dan catat
                  melalui jenis transaksi Transfer agar arus kas tidak salah.
                </p>
              )}
              <form
                key={draft.id}
                action={action}
                className="grid gap-4 md:grid-cols-2"
              >
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <input type="hidden" name="intent" value="submit" />
                <input type="hidden" name="draftId" value={draft.id} />
                <input type="hidden" name="version" value={draft.version} />
                <label className="text-sm font-medium">
                  Nominal
                  <RupiahInput
                    name="amount"
                    required
                    defaultValue={draft.amount}
                    className={inputClass}
                  />
                  <Confidence value={draft.confidence.amount} />
                </label>
                <label className="text-sm font-medium">
                  Tanggal
                  <input
                    name="transactionDate"
                    type="date"
                    required
                    defaultValue={draft.transactionDate}
                    className={inputClass}
                  />
                  <Confidence value={draft.confidence.date} />
                </label>
                <label className="text-sm font-medium">
                  Merchant
                  <input
                    name="merchant"
                    maxLength={200}
                    defaultValue={draft.merchant}
                    className={inputClass}
                  />
                  <Confidence value={draft.confidence.merchant} />
                </label>
                <label className="text-sm font-medium">
                  Akun
                  <select
                    name="accountId"
                    required
                    defaultValue={draft.accountId}
                    className={inputClass}
                  >
                    <option value="">Pilih akun</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Selalu dipilih pengguna.
                  </span>
                </label>
                <label className="text-sm font-medium">
                  Kategori
                  <select
                    name="categoryId"
                    required
                    defaultValue={draft.categoryId}
                    className={inputClass}
                  >
                    <option value="">Pilih kategori</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Saran kategori wajib diperiksa.
                  </span>
                </label>
                <label className="text-sm font-medium md:col-span-2">
                  Catatan opsional
                  <input
                    name="note"
                    maxLength={1000}
                    defaultValue={draft.note}
                    className={inputClass}
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedFile || pending || ocrRunning}
                  onClick={runOcr}
                  className="min-h-11"
                >
                  <Camera aria-hidden="true" />
                  {ocrRunning ? "Membaca ulang…" : "Baca ulang gambar"}
                </Button>
                <Button
                  type="submit"
                  disabled={pending || !accounts.length || !categories.length}
                  className="min-h-11"
                >
                  {pending ? "Menyimpan…" : "Simpan pengeluaran"}
                </Button>
              </form>
              <form action={action} className="mt-3">
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <input type="hidden" name="intent" value="cancel" />
                <input type="hidden" name="draftId" value={draft.id} />
                <input type="hidden" name="version" value={draft.version} />
                <Button
                  type="submit"
                  variant="ghost"
                  disabled={pending}
                  className="w-full"
                >
                  Batalkan draf
                </Button>
              </form>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
