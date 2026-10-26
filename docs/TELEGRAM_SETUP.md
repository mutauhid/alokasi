# Telegram: pencatatan transaksi dengan konfirmasi

F24 menerima pengeluaran seperti `beli kopi 25rb bca` dan pemasukan seperti
`pemasukan: gaji 5jt bca` di chat pribadi bot. Bot menampilkan draf dengan
tombol Simpan, Koreksi, dan Batal. Saldo, budget, dan laporan berubah hanya
setelah Simpan. Voice note belum didukung.

## Menyiapkan bot

1. Buat bot memakai `/newbot` pada [@BotFather](https://t.me/BotFather).
   Simpan token secara rahasia dan catat username bot tanpa tanda `@`.
2. Isi `TELEGRAM_BOT_USERNAME`, `TELEGRAM_BOT_TOKEN`, dan
   `TELEGRAM_WEBHOOK_SECRET` pada environment server Vercel yang dituju.
   Secret webhook sebaiknya string acak 32+ karakter berisi huruf, angka,
   garis bawah, atau minus. Deploy ulang setelah menambah environment.
3. Terapkan migrasi `20261014000000_telegram_expense_bot` dan
   `20261019000000_telegram_income` pada database environment yang sama.
   Gunakan alur migrasi di `DATABASE_SETUP.md`; jangan gunakan `db push` atau
   mengubah tabel lewat dashboard.
4. Daftarkan webhook Telegram dengan `setWebhook` ke
   `https://<host-alokasi>/api/integrations/telegram/webhook`. Kirim
   `secret_token` dengan nilai `TELEGRAM_WEBHOOK_SECRET`, serta
   `allowed_updates=["message","callback_query"]`.
   Lakukan panggilan API dari mesin pribadi atau secret manager; token bot
   jangan ditempel ke issue, chat, atau log. Periksa hasilnya lewat
   `getWebhookInfo`.
5. Login ke Alokasi, buka **Pengaturan → Catat lewat Telegram**, pilih akun
   serta kategori default pengeluaran dan pemasukan, lalu buka tautan bot
   dalam 15 menit.
   Pengguna Owner/Editor dapat menghubungkan bot; Viewer tidak.
6. Setelah bot berstatus Terhubung, aktifkan **Peringatan budget 80% dan 100%**
   bila ingin menerima notifikasi. Pengaturan ini hanya berlaku bagi akun
   Telegram pengguna yang mengaktifkannya, termasuk di ruang bersama.
7. Untuk ringkasan mingguan, buat `CRON_SECRET` acak dan simpan di environment
   Vercel. Terapkan migrasi `20261026010000_telegram_weekly_summary`, deploy
   konfigurasi `vercel.json`, lalu aktifkan **Ringkasan keuangan mingguan**.
   Vercel memanggil endpoint setiap hari; aplikasi hanya mengirim pada Senin
   menurut zona waktu ruang untuk minggu Senin–Minggu yang telah selesai.
8. Untuk pengingat tagihan/transaksi berulang, terapkan migrasi
   `20261026020000_telegram_recurring_reminders`, deploy cron kedua dari
   `vercel.json`, lalu aktifkan **Pengingat transaksi berulang**. Pesan dikirim
   sekali saat jatuh tempo; transaksi belum masuk saldo sampai pengguna memilih
   Catat sekarang dari menu Pengingat.

Domain kustom tidak diperlukan; URL HTTPS Vercel yang aktif dapat dipakai.
Setiap akun Telegram hanya dapat terhubung ke satu workspace pada fase ini.
Membuat tautan baru memutuskan koneksi lama pada workspace tersebut.

## Pemakaian dan koreksi

- Pengeluaran mengikuti `judul nominal [nama akun]`. Pemasukan wajib memakai
  awalan `pemasukan:`, misalnya `pemasukan: gaji 5jt bca`. Nominal menerima
  `25rb`, `25k`, `5jt`, `5juta`, `25.000`, atau `25000`. Tanpa nama akun,
  akun default dipakai. Nama/akhiran nama akun harus cocok unik dengan akun
  aktif.
- Kategori memakai default sesuai jenis transaksi. Sesudah mengetuk
  **Koreksi**, balas satu field per permintaan: `judul: ...`,
  `nominal: 30rb`, `akun: BCA`, `kategori: Belanja`, atau `catatan: ...`.
  Teks lengkap juga dapat dikirim ulang; awalan pemasukan tetap diperlukan
  saat mengubah pengeluaran menjadi pemasukan.
- Untuk pengeluaran, bot memprioritaskan kategori dari transaksi terdahulu
  dengan judul yang sama. Jika belum ada, kata kunci umum seperti `bensin`,
  `kopi`, atau `listrik` dicocokkan ke kategori aktif. Hasil ambigu atau
  kategori yang tidak tersedia akan memakai kategori pengeluaran default.
- Draf berlaku 24 jam. Tombol Simpan menjalankan validasi membership,
  akun/kategori aktif, tanggal, dan idempotensi transaksi. Batal tidak
  mengubah data keuangan.
- Bot hanya menerima chat pribadi dan memeriksa secret webhook. Teks
  pesan asli tidak disimpan di draf atau audit; draf hanya berisi field
  terstruktur. Revoke dilakukan melalui Pengaturan. Pesan Telegram tetap
  berada dalam riwayat Telegram sampai dihapus oleh pengguna.
- Peringatan budget dikirim setelah pengeluaran dari form manual, Back Tap,
  Telegram, atau pengingat berulang benar-benar tersimpan. Setiap ambang 80%
  dan 100% dikirim maksimal sekali per kategori/periode. Gagal mengirim pesan
  tidak membatalkan transaksi yang sudah tersimpan.

## Uji sebelum dipakai

Gunakan database preview/test: hubungkan akun, kirim `beli kopi 25rb`,
periksa akun default, koreksi menjadi `nominal: 30rb`, lalu Simpan. Pastikan
tepat satu transaksi muncul. Uji juga `pemasukan: gaji 5jt bca` beserta
kategori pemasukan default. Ulangi tekan Simpan, uji akun yang tidak dikenal,
Batal, tautan kedaluwarsa, serta Viewer/revoke.
Migrasi dan webhook produksi hanya dilakukan setelah hasil preview benar.
Untuk fitur peringatan budget, terapkan juga migrasi
`20261026000000_telegram_budget_alerts`, aktifkan toggle, lalu uji transaksi
yang membawa kategori dari di bawah 80% ke 80% dan kemudian ke 100%.
Untuk ringkasan mingguan, cron Vercel hanya berjalan pada deployment production.
Preview dapat diuji manual dengan request GET ke
`/api/cron/telegram-weekly-summary` memakai header
`Authorization: Bearer <CRON_SECRET>` pada hari Senin sesuai zona waktu ruang.
Endpoint pengingat berulang dapat diuji dengan pola header yang sama pada
`/api/cron/telegram-recurring-reminders` setelah membuat template dengan tanggal
jatuh tempo hari ini. Pastikan pesan terkirim sekali dan jumlah transaksi tidak
berubah sebelum Catat sekarang dipilih.
