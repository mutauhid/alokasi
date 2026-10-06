"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, RotateCcw } from "lucide-react";
import {
  commitCsvImportAction,
  previewCsvImportAction,
} from "@/app/(workspace)/actions";
import {
  CsvImportParseError,
  MAX_CSV_FILE_BYTES,
  parseCsvDocument,
  type CsvTable,
} from "@/modules/imports/domain";
import { initialCsvImportPreviewState } from "@/modules/imports/form-state";
import { Button } from "@/components/ui/button";

type Option = { id: string; name: string };
type AmountMode = "signed" | "separate";

const parseMessages: Record<string, string> = {
  CSV_EMPTY: "File CSV kosong.",
  CSV_DELIMITER: "Pemisah kolom koma, titik koma, atau tab tidak ditemukan.",
  CSV_NO_DATA: "CSV harus memiliki header dan setidaknya satu baris data.",
  CSV_TOO_MANY_ROWS: "Maksimal 300 baris dapat diproses dalam satu batch.",
  CSV_TOO_MANY_COLUMNS: "CSV memiliki lebih dari 30 kolom.",
  CSV_CELL_TOO_LONG: "Salah satu sel CSV terlalu panjang.",
  CSV_UNCLOSED_QUOTE: "Ada tanda kutip CSV yang belum ditutup.",
};

function findColumn(headers: string[], patterns: RegExp[], fallback: number) {
  const index = headers.findIndex((header) =>
    patterns.some((pattern) => pattern.test(header.toLocaleLowerCase("id-ID"))),
  );
  return index >= 0 ? index : Math.min(fallback, headers.length - 1);
}

function rupiah(value: string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(BigInt(value));
}

function ColumnSelect({
  label,
  value,
  onChange,
  headers,
  optional = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  headers: string[];
  optional?: boolean;
}) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-h-11 w-full rounded-lg border bg-background px-3"
      >
        {optional && <option value={-1}>Tidak digunakan</option>}
        {headers.map((header, index) => (
          <option key={`${header}-${index}`} value={index}>
            {header}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CsvImportWizard({
  workspaceId,
  accounts,
  incomeCategories,
  expenseCategories,
}: {
  workspaceId: string;
  accounts: Option[];
  incomeCategories: Option[];
  expenseCategories: Option[];
}) {
  const [preview, previewAction, previewPending] = useActionState(
    previewCsvImportAction,
    initialCsvImportPreviewState,
  );
  const [table, setTable] = useState<CsvTable | null>(null);
  const [fileName, setFileName] = useState("");
  const [localError, setLocalError] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [incomeCategoryId, setIncomeCategoryId] = useState(
    incomeCategories[0]?.id ?? "",
  );
  const [expenseCategoryId, setExpenseCategoryId] = useState(
    expenseCategories[0]?.id ?? "",
  );
  const [dateColumn, setDateColumn] = useState(0);
  const [titleColumn, setTitleColumn] = useState(0);
  const [noteColumn, setNoteColumn] = useState(-1);
  const [amountMode, setAmountMode] = useState<AmountMode>("signed");
  const [amountColumn, setAmountColumn] = useState(0);
  const [incomeColumn, setIncomeColumn] = useState(0);
  const [expenseColumn, setExpenseColumn] = useState(0);
  const [positiveType, setPositiveType] = useState<"income" | "expense">(
    "income",
  );

  async function readFile(file: File | undefined) {
    setTable(null);
    setLocalError("");
    setFileName("");
    if (!file) return;
    if (file.size > MAX_CSV_FILE_BYTES) {
      setLocalError("Ukuran file maksimal 500 KB.");
      return;
    }
    try {
      const parsed = parseCsvDocument(await file.text());
      setTable(parsed);
      setFileName(file.name);
      setDateColumn(findColumn(parsed.headers, [/tanggal/u, /^date$/u], 0));
      setTitleColumn(
        findColumn(
          parsed.headers,
          [/deskripsi/u, /keterangan/u, /merchant/u, /uraian/u, /description/u],
          1,
        ),
      );
      setNoteColumn(findColumn(parsed.headers, [/catatan/u, /^note$/u], -1));
      const credit = findColumn(
        parsed.headers,
        [/kredit/u, /credit/u, /pemasukan/u, /masuk/u],
        0,
      );
      const debit = findColumn(
        parsed.headers,
        [/debit/u, /pengeluaran/u, /keluar/u],
        0,
      );
      const hasSeparate =
        parsed.headers.some((header) =>
          /kredit|credit|pemasukan|masuk/iu.test(header),
        ) &&
        parsed.headers.some((header) =>
          /debit|pengeluaran|keluar/iu.test(header),
        );
      setAmountMode(hasSeparate ? "separate" : "signed");
      setIncomeColumn(credit);
      setExpenseColumn(debit);
      setAmountColumn(
        findColumn(parsed.headers, [/nominal/u, /jumlah/u, /amount/u], 2),
      );
    } catch (error) {
      setLocalError(
        error instanceof CsvImportParseError
          ? (parseMessages[error.code] ?? "CSV tidak dapat dibaca.")
          : "CSV tidak dapat dibaca.",
      );
    }
  }

  const previewPayload = useMemo(() => {
    if (!table) return "";
    const mapping =
      amountMode === "signed"
        ? {
            amountMode,
            dateColumn,
            titleColumn,
            noteColumn,
            amountColumn,
            positiveType,
          }
        : {
            amountMode,
            dateColumn,
            titleColumn,
            noteColumn,
            incomeColumn,
            expenseColumn,
          };
    return JSON.stringify({
      fileName,
      accountId,
      incomeCategoryId,
      expenseCategoryId,
      rows: table.rows,
      mapping,
    });
  }, [
    accountId,
    amountColumn,
    amountMode,
    dateColumn,
    expenseCategoryId,
    expenseColumn,
    fileName,
    incomeCategoryId,
    incomeColumn,
    noteColumn,
    positiveType,
    table,
    titleColumn,
  ]);

  if (preview.phase === "ready") {
    const commitPayload = JSON.stringify({
      fileName: preview.fileName,
      accountId: preview.accountId,
      batchKey: preview.batchKey,
      sourceRowCount: preview.sourceRowCount,
      rows: preview.rows,
    });
    const duplicates = preview.rows.filter(
      (row) => row.possibleDuplicate,
    ).length;
    return (
      <div className="space-y-5">
        <div className="rounded-xl border bg-muted/40 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="mt-0.5 size-5 text-primary"
              aria-hidden="true"
            />
            <div>
              <p className="font-medium">Pratinjau siap diperiksa</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {preview.rows.length} baris valid · {duplicates} kandidat
                duplikat · {preview.issues.length} baris bermasalah
              </p>
            </div>
          </div>
        </div>

        <form action={commitCsvImportAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="payload" value={commitPayload} />
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              Pilih baris yang akan diimpor
            </legend>
            {preview.rows.map((row) => (
              <label
                key={row.rowNumber}
                className="flex min-h-14 items-start gap-3 rounded-xl border p-3 text-sm"
              >
                <input
                  type="checkbox"
                  name="selectedRows"
                  value={row.rowNumber}
                  defaultChecked={!row.possibleDuplicate}
                  className="mt-1 size-4"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">Baris {row.rowNumber}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {row.type === "income" ? "Pemasukan" : "Pengeluaran"}
                    </span>
                    {row.possibleDuplicate && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                        <AlertTriangle className="size-3" aria-hidden="true" />
                        Kemungkinan duplikat
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-muted-foreground">
                    {row.transactionDate} · {row.title}
                    {row.note ? ` · ${row.note}` : ""}
                  </span>
                </span>
                <span className="font-semibold">{rupiah(row.amount)}</span>
              </label>
            ))}
          </fieldset>

          {preview.issues.length > 0 && (
            <div className="rounded-xl bg-destructive/10 p-4 text-sm">
              <p className="font-medium text-destructive">
                Baris berikut tidak dapat diimpor
              </p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {preview.issues.map((issue) => (
                  <li key={`${issue.rowNumber}-${issue.message}`}>
                    Baris {issue.rowNumber}: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={preview.rows.length === 0}>
              Impor baris terpilih
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <RotateCcw className="size-4" />
              Mulai ulang
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Kandidat duplikat tidak dipilih otomatis. Centang baris tersebut
            hanya jika transaksi memang berbeda atau tetap ingin disimpan.
          </p>
        </form>
      </div>
    );
  }

  return (
    <form action={previewAction} className="space-y-5">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="payload" value={previewPayload} />
      <label className="block space-y-2 text-sm">
        <span className="font-medium">File CSV</span>
        <span className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-4 text-center">
          <FileUp className="mb-2 size-6 text-primary" aria-hidden="true" />
          <span>{fileName || "Pilih file .csv hingga 500 KB"}</span>
          <span className="mt-1 text-xs text-muted-foreground">
            Maksimal 300 baris dan 30 kolom
          </span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="sr-only"
            onChange={(event) => void readFile(event.target.files?.[0])}
          />
        </span>
      </label>

      {(localError || (preview.phase === "error" && preview.error)) && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {localError || (preview.phase === "error" ? preview.error : "")}
        </p>
      )}

      {table && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Akun tujuan</span>
              <select
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                className="min-h-11 w-full rounded-lg border bg-background px-3"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Cara membaca nominal</span>
              <select
                value={amountMode}
                onChange={(event) =>
                  setAmountMode(event.target.value as AmountMode)
                }
                className="min-h-11 w-full rounded-lg border bg-background px-3"
              >
                <option value="signed">Satu kolom bertanda +/−</option>
                <option value="separate">
                  Kolom pemasukan dan pengeluaran terpisah
                </option>
              </select>
            </label>
            <ColumnSelect
              label="Kolom tanggal"
              value={dateColumn}
              onChange={setDateColumn}
              headers={table.headers}
            />
            <ColumnSelect
              label="Kolom deskripsi"
              value={titleColumn}
              onChange={setTitleColumn}
              headers={table.headers}
            />
            <ColumnSelect
              label="Kolom catatan"
              value={noteColumn}
              onChange={setNoteColumn}
              headers={table.headers}
              optional
            />
            {amountMode === "signed" ? (
              <>
                <ColumnSelect
                  label="Kolom nominal"
                  value={amountColumn}
                  onChange={setAmountColumn}
                  headers={table.headers}
                />
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Nominal positif berarti</span>
                  <select
                    value={positiveType}
                    onChange={(event) =>
                      setPositiveType(
                        event.target.value as "income" | "expense",
                      )
                    }
                    className="min-h-11 w-full rounded-lg border bg-background px-3"
                  >
                    <option value="income">Pemasukan</option>
                    <option value="expense">Pengeluaran</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <ColumnSelect
                  label="Kolom pemasukan"
                  value={incomeColumn}
                  onChange={setIncomeColumn}
                  headers={table.headers}
                />
                <ColumnSelect
                  label="Kolom pengeluaran"
                  value={expenseColumn}
                  onChange={setExpenseColumn}
                  headers={table.headers}
                />
              </>
            )}
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Kategori pemasukan</span>
              <select
                value={incomeCategoryId}
                onChange={(event) => setIncomeCategoryId(event.target.value)}
                className="min-h-11 w-full rounded-lg border bg-background px-3"
              >
                {incomeCategories.length === 0 && (
                  <option value="">Belum ada kategori pemasukan</option>
                )}
                {incomeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Kategori pengeluaran</span>
              <select
                value={expenseCategoryId}
                onChange={(event) => setExpenseCategoryId(event.target.value)}
                className="min-h-11 w-full rounded-lg border bg-background px-3"
              >
                {expenseCategories.length === 0 && (
                  <option value="">Belum ada kategori pengeluaran</option>
                )}
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            {table.rows.length} baris ditemukan · pemisah{" "}
            {table.delimiter === "\t" ? "tab" : `“${table.delimiter}”`} ·
            tanggal didukung: YYYY-MM-DD atau DD/MM/YYYY
          </div>
          <Button type="submit" disabled={previewPending || !previewPayload}>
            {previewPending ? "Memeriksa…" : "Tampilkan pratinjau"}
          </Button>
        </>
      )}
    </form>
  );
}
