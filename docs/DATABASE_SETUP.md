# Setup database — tahap 2

Scope awal dokumen ini adalah schema PostgreSQL `app`, Prisma Client/Migrate, constraint integritas, dan tes database. Auth serta service ruang pribadi/bersama, akun, kategori, transaksi, budget, dashboard, dan laporan kini tersedia; batas operasional terbaru dicatat di IMPLEMENTATION_PLAN.md.

## 1. Koneksi development

Gunakan proyek Supabase development khusus Alokasi. Jangan memakai database produksi untuk eksperimen atau tes.

1. Nonaktifkan Data API bila tidak dipakai. Jika tetap aktif untuk keperluan lain, pastikan `app` **tidak** termasuk exposed schemas.
2. Di panel **Connect**, ambil koneksi direct atau **session pooler** untuk migrasi. Session pooler dapat digunakan jika mesin tidak memiliki IPv6. Jangan gunakan transaction pooler untuk migrasi.
3. Salin `.env.example` ke `.env.local` jika belum ada. Jangan menimpa file yang sudah berisi konfigurasi.
4. Isi `DIRECT_URL` memakai role migrasi yang dapat membuat/mengubah objek pada schema `app`. URL harus memiliki `schema=app`, misalnya `...?schema=app&sslmode=verify-full`. Pakai CA Supabase bila driver membutuhkan CA root yang sesuai. Jangan mematikan verifikasi sertifikat.
5. Gunakan **password database/role PostgreSQL**, bukan password akun Supabase, publishable key, atau service-role API key. URL-encode password (`@`, `#`, `%`, dan karakter khusus lainnya). Jangan mengirim URL ke chat/log.

`prisma.config.ts` memuat environment melalui `@next/env`; `process.env` mendapat prioritas, lalu file env sesuai lingkungan Next. CLI hanya memakai `DIRECT_URL`; runtime hanya memakai `DATABASE_URL`. Helper koneksi memaksa schema `app` dan TLS `verify-full` pada host remote.

Jika muncul `SELF_SIGNED_CERT_IN_CHAIN`, unduh server root certificate dari Database Settings → SSL Configuration. Simpan `certs/prod-supabase.cer`, lalu isi `DATABASE_SSL_ROOT_CERT=certs/prod-supabase.cer` pada `.env.local` (dan env test ketika diperlukan). Hasil `db:check:runtime` harus menunjukkan `tls: true` dan `tlsVerified: true`. Jangan memakai sertifikat dari endpoint yang belum diverifikasi sebagai sumber kepercayaan. Lihat [panduan SSL Supabase](https://supabase.com/docs/guides/platform/ssl-enforcement).

```powershell
npm ci
npm run db:validate
npm run db:check
npm run db:migrate
npm run db:generate
npm run db:status
```

`db:migrate` memakai **migrate deploy**, menerapkan migrasi versioned tanpa reset/shadow database. Jalankan hanya pada target yang telah diperiksa. Command Prisma sendiri dapat menampilkan metadata host/database; jangan menyalin output mentah ke kanal publik. `db:check` hanya menampilkan status, versi, dan izin tanpa credential.

Kode `28P01` berarti autentikasi PostgreSQL ditolak: periksa role, password, dan username pooler termasuk project reference. `ENOTFOUND`/timeout mengarah ke host/jaringan. Pemeriksaan ini tidak mencetak pesan mentah driver yang mungkin mengandung detail koneksi.

## 2. Role aplikasi dengan izin minimum

Role runtime terpisah dari migrasi. Contoh bootstrap administratif berikut dijalankan **setelah migrasi**, oleh administrator database. Ini pengaturan role, bukan pengganti migrasi tabel. Gunakan password acak kuat melalui kanal administratif privat; jangan commit password atau menyalin contoh placeholder sebagai password nyata.

Untuk proyek development baru, tersedia `npm run db:setup:runtime`: membuat role `alokasi_runtime`, password acak, grant di bawah, dan memperbarui hanya `DATABASE_URL` di `.env.local`. Script menolak role yang sudah ada dan tidak merotasi password otomatis. Pada workspace saat ini role sudah dibuat; gunakan pemeriksaan runtime, jangan menjalankan ulang setup. Contoh SQL berikut adalah alternatif manual, bukan langkah yang perlu diulang.

```sql
CREATE ROLE alokasi_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
-- Atur password role melalui kanal admin privat sebelum memakai connection string.
GRANT USAGE ON SCHEMA app TO alokasi_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  app.users, app.workspaces, app.memberships, app.invitations,
  app.financial_accounts, app.categories, app.transactions,
  app.budget_periods, app.budgets
TO alokasi_runtime;
GRANT SELECT, INSERT ON app.audit_events TO alokasi_runtime;
GRANT EXECUTE ON FUNCTION app.lock_workspace(),
  app.check_workspace_owner(), app.check_period_contiguity()
TO alokasi_runtime;
```

Runtime tidak mendapat akses `_prisma_migrations`, CREATE schema/tabel, atau perubahan/penghapusan audit. Grant eksplisit untuk objek baru ditambahkan pada rollout berikutnya. Jangan memberi role runtime ke `anon`/`authenticated`, dan jangan menambahkan `BYPASSRLS`. Role yang mewarisi hak luas juga tidak sesuai baseline.

Isi `DATABASE_URL` memakai role ini, dengan `schema=app` dan TLS terverifikasi. Untuk session pooler Supabase, username biasanya berbentuk `alokasi_runtime.<project-ref>`; ikuti format Connect proyek. Runtime deployment serverless dapat memakai transaction pooler sesuai dukungan provider. Development boleh menggunakan session pooler.

```powershell
npm run db:check:runtime
```

`getDatabase()` di `src/server/db/client.ts` bersifat lazy dan server-only, memakai pool maksimum 5 koneksi. Tidak ada query log. Jangan mencetak error driver/payload mentah pada endpoint; petakan ke error publik dan log kode teknis teredaksi. Semua pemanggil kelak wajib memverifikasi auth dan membership setiap request.

## 3. Integritas yang dipasang

- UUID; uang `BIGINT` → TypeScript `bigint` → string digit pada API. Tanggal transaksi/periode SQL `DATE`; timestamp teknis `TIMESTAMPTZ`.
- Foreign key komposit membawa workspace untuk akun asal/tujuan, kategori, pembuat/pengubah transaksi, dan periode budget.
- Bentuk transaksi dan jenis kategori cocok; transfer satu row dengan dua akun berbeda; budget kategori expense dan limit positif.
- Nama kategori disimpan NFC, trim/rapikan spasi. `name_key = lower(name)` memakai aturan PostgreSQL sebagai sumber kanonisasi; jangan membuat key dengan aturan browser yang berbeda. Keunikan mencakup arsip.
- Membership unik; tepat satu Owner aktif diperiksa pada akhir transaksi. Ruang pribadi mempunyai `personal_owner_id` unik dan hanya menerima membership Owner itu.
- Periode unik dan bersebelahan tanpa gap pada rentang yang dibentuk. Migrasi F21 menambahkan `cycle_settings`, melepas constraint bulan kalender, dan mengikat tiap periode ke versi aturan yang membentuknya.
- Idempotency key unik per ruang/pembuat, tetap terikat pada transaksi soft-deleted. `request_hash` SHA-256 menjadi dasar service untuk menolak retry dengan payload berbeda.
- Referential delete RESTRICT menjaga histori. User dapat dinonaktifkan dan dianonimkan dengan melepas `auth_subject`/email; prosedur penghapusan lengkap belum dibuat. Audit menyimpan daftar **nama field**, bukan nilai/catatan/token.
- Migrasi custom SQL memakai transaksi dan revoke PUBLIC/anon/authenticated pada schema, tabel, fungsi. Tidak mengubah schema `auth` Supabase.

Pembuatan workspace dan membership Owner harus satu transaksi. Pengalihan Owner: kunci workspace, demosi Owner lama, promosi anggota tujuan, lalu commit. Constraint deferred memeriksa state akhir. Perubahan membership/periode menggunakan lock baris workspace; gunakan urutan lock konsisten jika operasi mencakup beberapa ruang.

## 4. Batas tahap database

Constraint bukan otorisasi. Prisma runtime memiliki akses lintas workspace secara teknis; belum ada RLS end-user. Auth/membership/role harus diperiksa service pada tahap selanjutnya sebelum endpoint dibuka.

Service berikutnya juga harus menerapkan: zona waktu valid, tanggal tidak di masa depan/sebelum pembukaan akun, akun/kategori aktif, arsip akun hanya saat saldo nol, larangan mengubah jenis kategori yang pernah dipakai, audit mutasi, idempotent response dan perbandingan hash, optimistic version, penerimaan undangan sesuai email terverifikasi, serta perlindungan batas periode historis. Kolom dan constraint adalah fondasi, bukan bukti alur ini selesai.

Tidak ada seed finansial global. Kategori bawaan, aturan siklus tanggal 1, dan periode awal dibuat per workspace secara idempoten saat onboarding. Tabel `receipt_drafts` menyimpan field OCR lokal, deteksi institusi, dan koreksi tanpa gambar atau teks mentah; belum ada tabel file atau upload bukti.

## 5. Pengujian PostgreSQL

Sediakan database **khusus test**, terapkan migrasi yang sama menggunakan role migrasinya. Isi `TEST_DATABASE_URL` di `.env.test.local`; suite tidak memakai `DATABASE_URL` atau `DIRECT_URL` sebagai fallback. Fixture constraint dibungkus `BEGIN`/`ROLLBACK`; fixture service yang perlu menguji commit menghapus data buatannya secara eksplisit. Suite tidak melakukan reset/drop schema. Constraint deferred diuji dengan `SET CONSTRAINTS ALL IMMEDIATE` sebelum rollback.

```powershell
npm run db:migrate:test
npm run db:status:test
npm run db:check:test
npm run test:db
npm run lint
npm run typecheck
npm run format:check
npm run build
```

Jangan menjalankan build bersamaan dengan dev yang memakai direktori `.next` yang sama. Tes database gagal dengan pesan konfigurasi jika `TEST_DATABASE_URL` belum diisi; tes yang belum dijalankan tidak dihitung lulus. Suite saat ini memeriksa constraint serta service ruang pribadi untuk akun, kategori, transaksi, dan budget. Matriks ACL Owner/Editor/Viewer pada ruang bersama, konkurensi simultan, pemulihan backup, dan alur auth belum tercakup penuh.

Untuk verifikasi pertama pada development yang benar-benar baru: `npm run test:db:development` memeriksa semua tabel aplikasi kosong, lalu meneruskan koneksi development hanya ke proses tes. Semua fixture di-rollback dan tidak ada reset/drop. Setelah data pengguna mulai masuk, gunakan database test terpisah. Tes mencakup client Prisma/adapter serta constraint; tidak menyatakan ACL aplikasi sudah selesai.

## 6. Pemeliharaan migrasi

Jangan mengedit migrasi yang telah berhasil diterapkan. Buat migrasi baru dan simpan custom SQL. Jangan memakai `db push`/reset untuk menyelesaikan drift di database berisi data. `migrate dev` membutuhkan database development dan shadow khusus yang terisolasi; tidak otomatis dijalankan pada Supabase pengguna.

Referensi resmi: [Prisma 7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7), [Prisma bersama Supabase](https://supabase.com/docs/guides/database/prisma), [variabel environment Next.js](https://nextjs.org/docs/app/guides/environment-variables). Contoh role luas pada quickstart provider tidak dipakai sebagai role runtime Alokasi.
