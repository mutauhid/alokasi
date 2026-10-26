export function localCalendarDate(now: Date, timeZone: string) {
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

function rupiah(value: bigint) {
  return `Rp${new Intl.NumberFormat("id-ID").format(value)}`;
}

export function recurringReminderMessage(input: {
  workspaceName: string;
  name: string;
  type: "income" | "expense";
  amount: bigint;
  dueDate: Date;
  accountName: string;
  categoryName: string;
}) {
  const date = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(input.dueDate);
  return [
    `⏰ Pengingat ${input.type === "expense" ? "pengeluaran" : "pemasukan"}`,
    input.workspaceName,
    "",
    `Judul: ${input.name}`,
    `Nominal: ${rupiah(input.amount)}`,
    `Jatuh tempo: ${date}`,
    `Akun: ${input.accountName}`,
    `Kategori: ${input.categoryName}`,
    "",
    "Belum dicatat ke saldo. Buka menu Pengingat di Alokasi untuk mencatat atau melewati kejadian ini.",
  ].join("\n");
}
