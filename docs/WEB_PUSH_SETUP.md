# Setup Web Push Alokasi

Web Push membutuhkan pasangan VAPID yang tetap untuk satu environment. Kunci ini
bukan credential Apple/Google dan tidak membutuhkan Apple Developer Program.

## 1. Buat VAPID key

Jalankan sekali dari root repository:

```powershell
npx web-push generate-vapid-keys
```

Simpan hasilnya sebagai environment server:

```text
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
WEB_PUSH_SUBJECT=mailto:alamat-kontak@example.com
```

`VAPID_PRIVATE_KEY` tidak boleh memakai prefix `NEXT_PUBLIC_`, dicatat di log,
atau dikirim ke browser. Public key dikirim aplikasi saat halaman Automasi dirender.
Gunakan pasangan berbeda untuk development/staging/production dan jangan mengganti
pasangan pada environment yang sudah memiliki subscription kecuali siap meminta
pengguna mengaktifkan ulang notifikasi.

## 2. Migrasi dan cron

Terapkan migrasi `20261026040000_web_push_notifications`,
`20261027000000_debts_receivables`, dan
`20261102000000_in_app_notifications` dengan alur pada `DATABASE_SETUP.md`.
Migrasi terakhir menambahkan inbox persisten serta jam pengingat per template.

Pastikan `CRON_SECRET` tersedia. `vercel.json` tetap memanggil
`/api/cron/web-push-notifications` setiap hari sebagai fallback; Vercel mengirim
Bearer secret secara otomatis ketika `CRON_SECRET` dikonfigurasi pada project.

Untuk memproses pilihan jam pengingat secara akurat pada paket Vercel Hobby,
aktifkan workflow `.github/workflows/hourly-notifications.yml` dengan repository
secrets berikut:

```text
ALOKASI_CRON_URL=https://alokasi.vercel.app
CRON_SECRET=nilai-yang-sama-dengan-environment-Vercel
```

Workflow memanggil endpoint yang sama setiap jam. Jika salah satu secret belum
tersedia, workflow berhenti aman tanpa request. Vercel Hobby hanya mengizinkan
cron sekali per hari, sehingga konfigurasi per jam langsung di `vercel.json`
akan membuat deployment gagal. Scheduler dapat terlambat beberapa menit; service
memproses template yang jam lokalnya sudah terlewati dan deduplikasi mencegah
pengiriman ganda.

## 3. Aktivasi pengguna

Pengguna membuka **Pengaturan → Automasi → Notifikasi perangkat** dan menekan
**Aktifkan notifikasi**. Dialog izin browser hanya muncul setelah tindakan ini.
Setiap browser/perangkat harus diaktifkan sendiri.

Pada iPhone/iPad, gunakan iOS/iPadOS 16.4 atau lebih baru, tambahkan Alokasi ke
Layar Utama dari Safari, lalu buka Alokasi dari ikon PWA sebelum mengaktifkan
notifikasi. Jika izin pernah ditolak, pengguna perlu mengubah izin dari Settings
perangkat/browser.

## 4. Smoke test

1. Aktifkan Web Push dan matikan opsi penyamaran hanya pada data uji.
2. Buat budget kecil lalu simpan pengeluaran hingga melewati 80%.
3. Buat utang/piutang dengan jatuh tempo tiga hari dari tanggal lokal workspace,
   jalankan cron, lalu pastikan pengingat hanya masuk sekali. Ulangi pada hari
   jatuh tempo dan pastikan catatan yang sudah lunas tidak diingatkan.
4. Pastikan satu notifikasi muncul dan klik membuka Budget pada workspace terkait.
5. Ulangi request/reload; notifikasi threshold yang sama tidak boleh terkirim lagi.
6. Uji jam tenang, logout perangkat, serta membership yang dicabut.
7. Aktifkan kembali penyamaran sebelum memakai data nyata pada layar terkunci.
8. Buat pengingat berulang dengan jam satu atau dua jam berikutnya, jalankan
   workflow manual bila diperlukan, lalu pastikan inbox lonceng memperoleh satu
   item dan transaksi belum tercatat otomatis.

## 5. Inbox aplikasi

Semua jenis notifikasi yang diaktifkan tersimpan pada lonceng di header untuk
workspace aktif, termasuk ketika Web Push belum diaktifkan pada perangkat.
Status dibaca tersinkron melalui database dan berlaku lintas perangkat. Web Push
tetap perlu diaktifkan bila pengguna ingin menerima pemberitahuan saat aplikasi
tidak sedang dibuka.

Mode privasi nominal global menyamarkan isi item inbox pada layar aplikasi.
Opsi privasi Web Push tetap khusus untuk payload yang tampil pada layar terkunci.

Tombol mata pada kartu **Privasi isi notifikasi** hanya mengatur payload yang
muncul di layar terkunci. Tombol mata global pada header aplikasi mengatur
penyamaran nominal di halaman Alokasi; keduanya sengaja independen.

Delivery push bersifat best effort. Transaksi yang berhasil tetap valid ketika
provider push atau perangkat tidak dapat menerima pesan.
