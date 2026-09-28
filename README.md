# Alokasi — Financial Management

Aplikasi pengelolaan keuangan pribadi dan bersama dengan transaksi, budgeting, dashboard, dan laporan. **Fondasi UI, database, autentikasi, ruang pribadi/bersama, peran dan lifecycle anggota, akun, kategori, transaksi inti, budget, dashboard berbasis data, laporan terfilter, ekspor, siklus budget berdasarkan tanggal gajian, OCR lokal, serta kontrol penghapusan ruang dan akun telah diimplementasikan.** Status verifikasi terbaru ada di [ACCEPTANCE.md](docs/ACCEPTANCE.md).

## Menjalankan lokal

Prasyarat: **Node.js 24 LTS (minimal 24.11)** dan **npm 11**. Versi runtime dibatasi melalui `engines` dan `.nvmrc`. Gunakan satu package manager, yaitu npm.

```sh
npm ci
npm run db:migrate
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000); aplikasi mengarahkan ke `/dashboard`. Isi environment Supabase Auth, koneksi database, dan sertifikat TLS lebih dahulu sesuai panduan setup. Font menggunakan font sistem dan ikon berasal dari dependency lokal.

Jika dependency sudah terpasang pada workspace ini, cukup jalankan `npm run dev`.

## Yang tersedia

- Next.js App Router, React, TypeScript strict, Tailwind, komponen shadcn/ui, dan Lucide.
- Sidebar desktop, navigasi mobile, dark mode mengikuti sistem, dan pemilih ruang yang divalidasi ulang oleh server.
- Halaman Dashboard, Transaksi, Budget, Akun, Laporan, Anggota & akses, dan Pengaturan.
- Form finansial berbasis service server, skeleton loading, penanganan error, dan halaman 404.
- ESLint, Prettier, pemeriksaan TypeScript, build produksi, dan smoke test browser.
- Prisma Client server-only, migrasi schema `app`, constraint lintas ruang, role runtime terpisah, dan tes PostgreSQL. Ikuti [panduan database](docs/DATABASE_SETUP.md) untuk koneksi, sertifikat CA/TLS, migrasi, dan pengujian.
- Registrasi/login email-password, verifikasi callback, lupa/reset password, logout, session cookie SSR, serta provisioning ruang pribadi. Ikuti [panduan autentikasi](docs/AUTH_SETUP.md).
- Menu akun desktop/mobile berisi Profil & Pengaturan dan Keluar; profil mendukung perubahan nama tampilan serta password dengan autentikasi ulang.

Ruang pribadi/bersama, login, akun, kategori, transaksi inti, budget, dashboard, laporan, peran anggota, undangan berbasis tautan, transfer kepemilikan, ekspor transaksi/ruang, siklus gajian, draf OCR, serta penghapusan ruang/akun sudah terhubung ke PostgreSQL melalui service server. OCR berjalan lokal di browser dan mendeteksi total, tanggal, penerima, transfer/QRIS, serta bank/e-wallet; gambar dan teks mentah tidak diunggah. Pengiriman email undangan otomatis, provider OCR eksternal, penyimpanan bukti, backup/pemulihan, dan konfigurasi deployment produksi belum tersedia.

## Environment

`.env.example` hanya berisi nama konfigurasi tanpa rahasia. Salin menjadi `.env.local` dan isi nilainya secara lokal. `.env.local` diabaikan Git.

| Variabel | Cakupan |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL publik Supabase Auth |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key auth, bukan akses database |
| `SUPABASE_SECRET_KEY` | Rahasia server Auth Admin; wajib untuk hapus akun mandiri |
| `DATABASE_URL` | Rahasia server, koneksi runtime PostgreSQL |
| `DIRECT_URL` | Rahasia server, koneksi migrasi dengan role terpisah |
| `APP_URL` | Origin aplikasi untuk callback Auth |

Supabase Auth memakai variabel publiknya, sedangkan Prisma hanya memakai koneksi server. Jangan mengisi credential database dengan awalan `NEXT_PUBLIC_`.

## Perintah pemeriksaan

```sh
npm run lint
npm run typecheck
npm run format:check
npm run build
```

`npm run check` menjalankan lint, typecheck, dan build secara berurutan. `npm run format` merapikan source/config; Markdown dikecualikan agar formatter tidak menulis ulang baseline produk.

Untuk menguji build produksi secara manual:

```sh
npm run build
npm run start
```

### Smoke test browser

Gunakan build produksi terbaru. Playwright menjalankan server test sendiri pada port 3100; pastikan port tersebut kosong. Jangan menjalankan dev/build dan E2E bersamaan karena menggunakan output `.next` yang sama.

```sh
npm run build
npx playwright install chromium
npm run test:e2e
```

Alternatif di Windows dengan Microsoft Edge sudah terpasang, tanpa mengunduh browser baru:

```powershell
$env:TEST_BROWSER_CHANNEL = 'msedge'
npm run test:e2e
```

Lima skenario dijalankan pada viewport desktop 1366 px dan mobile 360 px (10 pemeriksaan): render tanpa credential/error runtime, navigasi dan pergantian ruang, status fitur/izin yang jujur, keyboard/menu mobile, serta 404 dan tautan kembali. Mobile menggunakan emulasi viewport Chromium, bukan perangkat fisik. Hasil berada di `playwright-report/` dan `test-results/` (diabaikan Git).

## Struktur kode saat ini

```text
src/app/                  # Root layout, metadata, error, 404, redirect
src/app/(workspace)/      # Halaman eksplisit aplikasi dan loading state
src/components/           # Shell, dashboard, tampilan halaman, empty state
src/components/ui/        # Komponen shadcn/ui yang disesuaikan
src/lib/                  # Navigasi dan utilitas presentasi
src/server/db/            # Client Prisma server-only dan konfigurasi koneksi TLS
prisma/                   # Schema dan migrasi PostgreSQL versioned
scripts/                  # Pemeriksaan/migrasi/setup runtime dan runner test
tests/unit/               # Konfigurasi koneksi dan batas TLS
tests/integration/        # Constraint PostgreSQL dan round-trip Prisma
tests/e2e/                # Smoke test fondasi
docs/                    # Baseline produk dan keputusan teknis
```

Auth, ruang pribadi/bersama, izin dan lifecycle anggota, akun, kategori, transaksi inti, budget, dashboard, laporan, ekspor, siklus gajian, serta penghapusan ruang/akun sudah memakai service server serta PostgreSQL. Operasional produksi, backup/pemulihan, dan cleanup provider tertunda dikerjakan pada tahap berikutnya. Status serta keterbatasan pengujian ada di `docs/IMPLEMENTATION_PLAN.md` dan `docs/ACCEPTANCE.md`.

## Peta dokumen

| Dokumen | Kegunaan |
|---|---|
| [AGENTS.md](AGENTS.md) | Instruksi wajib untuk agent yang bekerja di repository |
| [PRD.md](PRD.md) | Cakupan produk dan acceptance per fitur |
| [Keputusan](docs/DECISIONS.md) | Membedakan permintaan pengguna, default, dan keputusan terbuka |
| [Aturan domain](docs/DOMAIN_RULES.md) | Kontrak kategori, OCR, periode, dan konsistensi keuangan |
| [Desain](docs/DESIGN.md) | Arah visual mockup yang diterima dan perluasan layar |
| [Rencana implementasi](docs/IMPLEMENTATION_PLAN.md) | Urutan kerja, batas fase, dan status |
| [Acceptance](docs/ACCEPTANCE.md) | Skenario verifikasi agar implementasi tidak menyimpang |
| [Stack dan arsitektur](docs/TECH_STACK.md) | Pilihan frontend/backend, database, auth, dan batas akses data |
| [Setup database](docs/DATABASE_SETUP.md) | Migrasi, role runtime, CA/TLS, dan tes PostgreSQL |
| [Setup autentikasi](docs/AUTH_SETUP.md) | Environment, callback, alur email/password, dan batas verifikasi |
| [Git dan CI](docs/GIT_AND_CI_SETUP.md) | Repository GitHub, workflow GitHub Actions, dan perlindungan branch |
| [Deployment staging](docs/STAGING_DEPLOYMENT.md) | Supabase staging, Vercel, health check, security headers, dan smoke test |

## Baseline per 22 September 2026

- Ruang pribadi dan ruang bersama; data setiap ruang terpisah.
- Mockup Alokasi diterima sebagai arah visual.
- Kategori kustom termasuk scope MVP sejak PRD awal.
- Scan struk/bukti pembayaran menjadi draf pengeluaran yang dapat diedit sebelum submit.
- Periode bulanan dapat mengikuti tanggal gajian; perubahan Owner langsung merebasis periode aktif dan menampilkan histori transisi bila diperlukan.
- Owner dapat mengekspor lalu menghapus ruang bersama melalui konfirmasi nama dan autentikasi ulang; akun pengguna serta ruang pribadi anggota tetap terpisah.
- Pengguna dapat menghapus akun setelah menyelesaikan kepemilikan ruang bersama; ruang pribadi dihapus dan histori bersama dianonimkan.
- OCR lokal tersedia dengan deteksi bank/QRIS, review/koreksi, batal, dan submit eksplisit; upload serta penyimpanan bukti belum diimplementasikan.

## Stack terpilih

Next.js App Router + TypeScript untuk frontend dan backend Route Handlers, PostgreSQL managed di Supabase, Prisma ORM/Migrate, dan Supabase Auth. UI memakai Tailwind CSS + shadcn/ui; validasi Zod; pengujian Vitest + Playwright. Lihat TECH_STACK.md untuk alasan dan batas arsitektur.

Catatan tooling: ESLint sementara dikunci ke 9.39.5 karena plugin bawaan `eslint-config-next` yang terpasang belum kompatibel dengan ESLint 10. Versi 9 mendapat peringatan end-of-support dari npm; upgrade terkoordinasi dicatat di TECH_STACK.md dan harus diselesaikan sebelum rilis produksi. TypeScript dipin ke 5.9.3 yang berada dalam rentang dukungan parser lint terpasang. Tidak digunakan `--force` atau `--legacy-peer-deps`.
