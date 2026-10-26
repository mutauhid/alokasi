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

Terapkan migrasi `20261026040000_web_push_notifications` dengan alur pada
`DATABASE_SETUP.md`. Pastikan `CRON_SECRET` tersedia. `vercel.json` memanggil
`/api/cron/web-push-notifications` setiap hari; Vercel mengirim Bearer secret
secara otomatis ketika `CRON_SECRET` dikonfigurasi pada project.

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
3. Pastikan satu notifikasi muncul dan klik membuka Budget pada workspace terkait.
4. Ulangi request/reload; notifikasi threshold yang sama tidak boleh terkirim lagi.
5. Uji jam tenang, logout perangkat, serta membership yang dicabut.
6. Aktifkan kembali penyamaran sebelum memakai data nyata pada layar terkunci.

Tombol mata pada kartu **Privasi isi notifikasi** hanya mengatur payload yang
muncul di layar terkunci. Tombol mata global pada header aplikasi mengatur
penyamaran nominal di halaman Alokasi; keduanya sengaja independen.

Delivery push bersifat best effort. Transaksi yang berhasil tetap valid ketika
provider push atau perangkat tidak dapat menerima pesan.
