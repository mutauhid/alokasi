export type CompletedWeek = {
  start: Date;
  endExclusive: Date;
};

function localDate(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return new Date(`${values.year}-${values.month}-${values.day}T00:00:00.000Z`);
}

export function previousCompletedWeek(
  now: Date,
  timeZone: string,
): CompletedWeek | null {
  const today = localDate(now, timeZone);
  if (today.getUTCDay() !== 1) return null;
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 7);
  return { start, endExclusive: today };
}

function rupiah(value: bigint) {
  return `Rp${new Intl.NumberFormat("id-ID").format(value)}`;
}

function shortDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(value);
}

export function weeklySummaryMessage(input: {
  workspaceName: string;
  range: CompletedWeek;
  income: bigint;
  expense: bigint;
  transactionCount: number;
  topCategory?: { name: string; amount: bigint };
}) {
  const end = new Date(input.range.endExclusive);
  end.setUTCDate(end.getUTCDate() - 1);
  const lines = [
    `📊 Ringkasan mingguan · ${input.workspaceName}`,
    `${shortDate(input.range.start)}–${shortDate(end)}`,
    "",
    `Pemasukan: ${rupiah(input.income)}`,
    `Pengeluaran: ${rupiah(input.expense)}`,
    `Arus kas bersih: ${rupiah(input.income - input.expense)}`,
    `Jumlah transaksi: ${input.transactionCount}`,
  ];
  if (input.topCategory) {
    lines.push(
      `Kategori terbesar: ${input.topCategory.name} · ${rupiah(input.topCategory.amount)}`,
    );
  } else if (input.transactionCount === 0) {
    lines.push("Belum ada transaksi pada minggu tersebut.");
  }
  return lines.join("\n");
}
