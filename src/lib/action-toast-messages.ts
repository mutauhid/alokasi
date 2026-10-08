export type ActionToastMessage = {
  title: string;
  description: string;
};

const actionToastMessages = {
  "account-created": {
    title: "Akun berhasil ditambahkan",
    description: "Akun baru sudah siap dipakai untuk mencatat transaksi.",
  },
  "account-renamed": {
    title: "Nama akun diperbarui",
    description: "Nama terbaru sudah digunakan di seluruh ruang ini.",
  },
  "account-archived": {
    title: "Akun berhasil diarsipkan",
    description:
      "Riwayat tetap aman dan akun tidak muncul pada transaksi baru.",
  },
  "reconciliation-created": {
    title: "Rekonsiliasi tersimpan",
    description: "Saldo akun sudah diperbarui jika penyesuaian dipilih.",
  },
  "transaction-created": {
    title: "Transaksi berhasil dicatat",
    description: "Saldo, budget, dan ringkasan keuangan sudah diperbarui.",
  },
  "transaction-updated": {
    title: "Transaksi berhasil diperbarui",
    description: "Perubahan sudah diterapkan pada saldo dan laporan terkait.",
  },
  "transaction-deleted": {
    title: "Transaksi berhasil dihapus",
    description: "Saldo dan ringkasan keuangan sudah dihitung ulang.",
  },
  "receipt-submitted": {
    title: "Pengeluaran berhasil dicatat",
    description: "Draf bukti pembayaran sudah menjadi transaksi tersimpan.",
  },
  "budget-created": {
    title: "Budget berhasil dibuat",
    description: "Batas pengeluaran kategori sudah aktif untuk periode ini.",
  },
  "budget-updated": {
    title: "Budget berhasil diperbarui",
    description: "Limit terbaru langsung dipakai pada perhitungan periode ini.",
  },
  "budget-deleted": {
    title: "Budget berhasil dihapus",
    description: "Transaksi yang sudah tercatat tetap tersimpan dengan aman.",
  },
  "budget-copied": {
    title: "Budget berhasil disalin",
    description: "Kategori pilihan sudah ditambahkan ke periode aktif.",
  },
  "category-created": {
    title: "Kategori berhasil dibuat",
    description: "Kategori baru sudah tersedia saat mencatat transaksi.",
  },
  "category-renamed": {
    title: "Kategori berhasil diperbarui",
    description: "Nama terbaru sudah diterapkan tanpa mengubah histori.",
  },
  "category-archived": {
    title: "Kategori berhasil diarsipkan",
    description:
      "Histori tetap tersimpan dan kategori tidak dipakai transaksi baru.",
  },
  "category-restored": {
    title: "Kategori berhasil dipulihkan",
    description: "Kategori kembali tersedia untuk transaksi dan budget.",
  },
  "cycle-updated": {
    title: "Siklus budget diperbarui",
    description:
      "Periode aktif terbaru sudah diterapkan tanpa mengubah transaksi.",
  },
  "profile-updated": {
    title: "Profil berhasil diperbarui",
    description: "Nama tampilan terbaru sudah tersimpan.",
  },
  "recurring-created": {
    title: "Pengingat berhasil dibuat",
    description: "Transaksi berulang akan muncul sesuai jadwalnya.",
  },
  "recurring-updated": {
    title: "Pengingat berhasil diperbarui",
    description: "Jadwal dan detail terbaru sudah tersimpan.",
  },
  "recurring-archived": {
    title: "Pengingat dinonaktifkan",
    description: "Template tidak akan menghasilkan pengingat berikutnya.",
  },
  "recurring-posted": {
    title: "Transaksi jatuh tempo dicatat",
    description: "Transaksi tersimpan dan jadwal berikutnya sudah disiapkan.",
  },
  "recurring-skipped": {
    title: "Periode berhasil dilewati",
    description: "Tidak ada transaksi dibuat dan jadwal sudah dimajukan.",
  },
  "workspace-created": {
    title: "Ruang bersama berhasil dibuat",
    description: "Ruang baru siap diatur dan dibagikan kepada anggota.",
  },
  "invitation-revoked": {
    title: "Undangan berhasil dicabut",
    description: "Tautan undangan tersebut tidak dapat digunakan lagi.",
  },
  "invitation-accepted": {
    title: "Undangan berhasil diterima",
    description: "Anda sekarang dapat mengakses ruang bersama ini.",
  },
  "member-role-changed": {
    title: "Peran anggota diperbarui",
    description: "Hak akses terbaru berlaku mulai sekarang.",
  },
  "member-revoked": {
    title: "Akses anggota dicabut",
    description: "Anggota tersebut tidak lagi dapat membuka ruang ini.",
  },
  "ownership-transfer-requested": {
    title: "Permintaan kepemilikan dikirim",
    description: "Anggota tujuan perlu menyetujui pengalihan tersebut.",
  },
  "ownership-transfer-cancelled": {
    title: "Pengalihan kepemilikan dibatalkan",
    description: "Kepemilikan ruang tidak berubah.",
  },
  "ownership-transfer-accepted": {
    title: "Kepemilikan berhasil dialihkan",
    description: "Peran anggota dan kontrol ruang sudah diperbarui.",
  },
  "workspace-left": {
    title: "Anda sudah keluar dari ruang",
    description: "Akses dicabut tanpa mengubah histori transaksi ruang.",
  },
  "workspace-deleted": {
    title: "Ruang bersama berhasil dihapus",
    description: "Ruang dan seluruh data terkait sudah dihapus.",
  },
} as const satisfies Record<string, ActionToastMessage>;

export function getActionToastMessage(code?: string) {
  if (!code) return undefined;
  return actionToastMessages[code as keyof typeof actionToastMessages];
}

export function successToastDismissUrl(
  pathname: string,
  search: string,
  hash = "",
) {
  const query = new URLSearchParams(search);
  query.delete("success");
  return `${pathname}${query.size ? `?${query.toString()}` : ""}${hash}`;
}
