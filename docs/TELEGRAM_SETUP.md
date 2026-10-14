# Telegram: pencatatan pengeluaran dengan konfirmasi

F24 menerima pesan teks di chat pribadi bot, misalnya `beli kopi 25rb`
atau `beli kopi 25rb bca`. Bot menampilkan draf dengan tombol Simpan,
Koreksi, dan Batal. Saldo, budget, dan laporan berubah hanya setelah Simpan.
Voice note belum didukung.

## Menyiapkan bot

1. Buat bot memakai `/newbot` pada [@BotFather](https://t.me/BotFather).
   Simpan token secara rahasia dan catat username bot tanpa tanda `@`.
2. Isi `TELEGRAM_BOT_USERNAME`, `TELEGRAM_BOT_TOKEN`, dan
   `TELEGRAM_WEBHOOK_SECRET` pada environment server Vercel yang dituju.
   Secret webhook sebaiknya string acak 32+ karakter berisi huruf, angka,
   garis bawah, atau minus. Deploy ulang setelah menambah environment.
3. Terapkan migrasi `20261014000000_telegram_expense_bot` pada database
   environment yang sama. Gunakan alur migrasi di `DATABASE_SETUP.md`;
   jangan gunakan `db push` atau mengubah tabel lewat dashboard.
4. Daftarkan webhook Telegram dengan `setWebhook` ke
   `https://<host-alokasi>/api/integrations/telegram/webhook`. Kirim
   `secret_token` dengan nilai `TELEGRAM_WEBHOOK_SECRET`, serta
   `allowed_updates=["message","callback_query"]`.
   Lakukan panggilan API dari mesin pribadi atau secret manager; token bot
   jangan ditempel ke issue, chat, atau log. Periksa hasilnya lewat
   `getWebhookInfo`.
5. Login ke Alokasi, buka **Pengaturan → Catat lewat Telegram**, pilih akun
   dan kategori pengeluaran default, lalu buka tautan bot dalam 15 menit.
   Pengguna Owner/Editor dapat menghubungkan bot; Viewer tidak.

Domain kustom tidak diperlukan; URL HTTPS Vercel yang aktif dapat dipakai.
Setiap akun Telegram hanya dapat terhubung ke satu workspace pada fase ini.
Membuat tautan baru memutuskan koneksi lama pada workspace tersebut.

## Pemakaian dan koreksi

- Pesan mengikuti bentuk `judul nominal [nama akun]`. Nominal menerima
  `25rb`, `25k`, `25.000`, atau `25000`. Tanpa nama akun, akun default
  dipakai. Nama/akhiran nama akun harus cocok unik dengan akun aktif.
- Kategori memakai default. Sesudah mengetuk **Koreksi**, balas permintaan
  bot dengan kalimat lengkap atau `judul: ...`, `nominal: 30rb`,
  `akun: BCA`, `kategori: Belanja`, atau `catatan: ...`.
- Draf berlaku 24 jam. Tombol Simpan menjalankan validasi membership,
  akun/kategori aktif, tanggal, dan idempotensi transaksi. Batal tidak
  mengubah data keuangan.
- Bot hanya menerima chat pribadi dan memeriksa secret webhook. Teks
  pesan asli tidak disimpan di draf atau audit; draf hanya berisi field
  terstruktur. Revoke dilakukan melalui Pengaturan. Pesan Telegram tetap
  berada dalam riwayat Telegram sampai dihapus oleh pengguna.

## Uji sebelum dipakai

Gunakan database preview/test: hubungkan akun, kirim `beli kopi 25rb`,
periksa akun default, koreksi menjadi `nominal: 30rb`, lalu Simpan. Pastikan
tepat satu transaksi muncul. Ulangi tekan Simpan, uji `beli kopi 25rb bca`,
akun yang tidak dikenal, Batal, tautan kedaluwarsa, serta Viewer/revoke.
Migrasi dan webhook produksi hanya dilakukan setelah hasil preview benar.
