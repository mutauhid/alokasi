# Menyiapkan staging Alokasi

Staging adalah lingkungan online untuk menguji build yang menyerupai production tanpa memakai data development atau production. Baseline yang dipilih adalah Vercel untuk Next.js serta proyek Supabase terpisah untuk PostgreSQL dan Auth. Docker dan VPS tidak diperlukan untuk alur ini.

## Batas tahap ini

Repository sudah menyediakan security headers, pemeriksaan kesiapan `/api/health`, log server terstruktur yang tidak mencetak pesan error mentah, CI, dan panduan konfigurasi. Belum ada deployment otomatis, domain produksi, SMTP, backup/restore teruji, atau monitoring eksternal.

## 1. Buat proyek Supabase staging

Langkah ini dilakukan sendiri di dashboard Supabase karena membuat resource pada akun Anda.

1. Buat proyek baru khusus staging, misalnya `alokasi-staging`. Jangan memakai proyek development/test yang telah berisi data.
2. Simpan database password pada password manager. Jangan kirim password, connection string, secret key, atau recovery code melalui chat.
3. Pastikan schema `app` tidak dimasukkan ke exposed schemas/Data API.
4. Pertahankan **Confirm email** aktif. Custom SMTP dipasang sebelum mengundang pengguna staging di luar anggota proyek.
5. Ambil publishable key dan secret key dari pengaturan API. Secret key hanya ditempatkan pada environment server.

## 2. Siapkan database staging

Buat file `.env.staging.local` dari `.env.example`. File ini sudah cocok dengan pola `.gitignore`; tetap periksa `git status` sebelum commit.

Isi:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
DATABASE_URL=postgresql://RUNTIME_ROLE:...@HOST/postgres?schema=app
DIRECT_URL=postgresql://MIGRATION_ROLE:...@HOST/postgres?schema=app
DATABASE_SSL_ROOT_CERT=
APP_URL=https://NAMA-PROYEK.vercel.app
```

Gunakan direct connection untuk `DIRECT_URL`, atau session pooler bila jaringan lokal tidak mendukung IPv6. Untuk `DATABASE_URL` di Vercel, gunakan **transaction pooler** dan tambahkan `pgbouncer=true` sesuai panduan Prisma provider. Aplikasi otomatis membatasi pool lokal menjadi satu koneksi per instance ketika `VERCEL=1`. Terapkan migrasi dari komputer lokal dengan environment file tersebut:

```powershell
node --env-file=.env.staging.local scripts/db-migrate.mjs --status
node --env-file=.env.staging.local scripts/db-migrate.mjs
node --env-file=.env.staging.local scripts/db-check.mjs
```

Periksa target proyek sebelum menjalankan migrasi. Jangan menjalankan integration test pada staging karena fixture test ditujukan untuk database test khusus.

Role `DATABASE_URL` harus mempunyai izin minimum sesuai [DATABASE_SETUP.md](DATABASE_SETUP.md), sedangkan `DIRECT_URL` memiliki izin DDL untuk migrasi. Jangan memakai service role Auth sebagai credential PostgreSQL.

## 3. Impor repository ke Vercel

Langkah ini dilakukan sendiri di dashboard Vercel karena menghubungkan akun GitHub dan membuat deployment.

1. Pilih **Add New Project**, lalu impor repository `mutauhid/alokasi`.
2. Framework seharusnya terdeteksi sebagai Next.js. Pertahankan perintah instalasi `npm ci` dan build `npm run build`.
3. Tambahkan semua variabel runtime dari `.env.staging.local` ke environment **Preview** dan **Production** proyek staging. Jangan menambahkan `DIRECT_URL` ke runtime aplikasi jika migrasi tetap dijalankan terpisah.
4. Atur `APP_URL` menjadi origin HTTPS deployment tanpa path dan tanpa trailing path tambahan.
5. Deploy, lalu catat domain `*.vercel.app` yang stabil. Bila domain berubah, perbarui `APP_URL` dan deploy ulang karena variabel `NEXT_PUBLIC_*` dibundel saat build.

## 4. Konfigurasikan Supabase Auth

Di dashboard Supabase staging:

1. Set **Site URL** ke nilai `APP_URL` staging.
2. Tambahkan redirect URL persis `https://DOMAIN-STAGING/auth/confirm`.
3. Hindari wildcard luas untuk domain production.
4. Pastikan Confirm email aktif.
5. Konfigurasikan custom SMTP, domain pengirim, dan template sebelum pengujian undangan/registrasi nyata.

Setelah URL Auth diubah, redeploy aplikasi untuk memastikan build dan environment konsisten.

## 5. Verifikasi deployment

Health endpoint tidak memerlukan login dan hanya mengembalikan status generik. Respons `200` berarti konfigurasi runtime lengkap dan query `SELECT 1` berhasil. Respons `503` membedakan kegagalan konfigurasi atau database tanpa membocorkan nama variabel, host, maupun pesan driver.

```powershell
curl.exe -i https://DOMAIN-STAGING/api/health
curl.exe -I https://DOMAIN-STAGING/login
```

Pastikan respons halaman memiliki minimal:

- `Content-Security-Policy`;
- `Strict-Transport-Security`;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy`.

Di Vercel Runtime Logs, error operasional berbentuk JSON dengan `event` dan kode aman. Log tidak boleh berisi password, connection string, email, token, catatan transaksi, isi OCR, atau pesan error provider mentah.

## 6. Smoke test manual

Gunakan dua akun staging yang memang boleh diuji:

1. registrasi, konfirmasi email, login, lupa password, dan ganti password;
2. buat akun keuangan, kategori, pemasukan, pengeluaran, transfer, dan budget;
3. buat ruang bersama, undang akun kedua, lalu uji Editor dan Viewer;
4. uji laporan/ekspor, perubahan siklus, histori budget, dan OCR lokal;
5. gunakan ruang dan akun uji khusus untuk penghapusan destruktif;
6. periksa desktop dan mobile 360 px serta log runtime setelah setiap kegagalan.

Catat hasil pada `docs/ACCEPTANCE.md` tanpa menyimpan email nyata, password, token, atau URL berkredensial.

## 7. Sebelum menyebut production-ready

- custom SMTP dan deliverability sudah diuji;
- backup otomatis tersedia dan satu restore drill berhasil;
- alert untuk error/health tersedia;
- prosedur migrasi, rollback aplikasi, dan penanganan cleanup Auth gagal tersedia;
- smoke test staging dua pengguna lulus;
- paket/kuota provider dan lokasi data sudah ditinjau;
- domain production dan callback Auth persis sudah dikonfigurasi.
