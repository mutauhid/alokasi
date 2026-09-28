# Rencana implementasi dan status

Diperbarui 28 September 2026. Setup UI dan fondasi database telah dibangun; aplikasi finansial penuh belum selesai. Status di bawah membedakan fondasi dari implementasi P0.

## Status nyata

| Deliverable | Status |
|---|---|
| PRD v1.0 | Tersedia |
| Mockup interaktif | Tersedia dalam percakapan; arah visual diterima |
| Panduan agent dan aturan domain | Tersedia |
| Core stack dan arsitektur | Dipilih; lihat TECH_STACK.md |
| Tahap 1 percakapan: setup proyek dan tampilan dasar | Diimplementasikan: Next.js/TS, Tailwind/shadcn, navigasi responsif, environment template, lint/build, smoke test |
| Tahap 2 percakapan: database | Selesai: schema Prisma, tujuh migrasi PostgreSQL 17.6, role runtime terpisah, TLS terverifikasi, dan suite database khusus tersedia |
| Tahap 3 percakapan: auth dan ruang pribadi | Diimplementasikan; pengguna melaporkan smoke manual register, login, dan forgot password berhasil pada development. Pengujian SMTP/keamanan produksi masih terbuka |
| Tahap 4 percakapan: akun dan kategori | Diimplementasikan; pengguna melaporkan smoke manual berhasil |
| Tahap 5 percakapan: transaksi inti | Diimplementasikan; pengguna melaporkan smoke manual berhasil |
| Tahap 6 percakapan: budget dan dashboard | Diimplementasikan untuk ruang pribadi: CRUD budget periode aktif, realisasi, pengeluaran tanpa budget, saldo, arus kas, kategori terbesar, dan transaksi terbaru |
| Tahap 7 percakapan: laporan dan ekspor | Diimplementasikan untuk ruang pribadi: filter tanggal/jenis/akun/kategori, pencarian, ringkasan, budget versus aktual, daftar sumber, dan CSV transaksi |
| Tahap 8 percakapan: ruang bersama dan peran | Diimplementasikan sebagian besar F17: buat/pilih ruang, undangan tautan, penerimaan email terverifikasi, Owner/Editor/Viewer, pencabutan, identitas pencatat, dan aktivitas |
| Tahap 9 percakapan: siklus gajian | Diimplementasikan untuk F21 inti; waktu berlaku prospektif awal telah digantikan tahap 15 |
| Tahap 10 percakapan: prototipe scan struk | Diimplementasikan untuk irisan aman F18: pratinjau gambar lokal, fixture berlabel, draf privat, koreksi, batal, dan submit satu pengeluaran secara atomik |
| Tahap 11 percakapan: OCR lokal dan deteksi institusi | Diimplementasikan: Tesseract.js browser, parser total/tanggal/penerima, deteksi transfer/QRIS, bank/e-wallet dan payment rail, tanpa upload gambar/teks mentah |
| Tahap 12 percakapan: dashboard dan budget historis | Diimplementasikan: pemilih periode tersimpan, tren enam periode, drill-down terfilter, histori baca saja, dan salin budget selektif tanpa overwrite |
| Tahap 13 percakapan: lifecycle ruang bersama | Diimplementasikan: permintaan pengalihan Owner, penerimaan/pembatalan, konflik konkuren, dan keluar mandiri Editor/Viewer |
| Tahap 14 percakapan: ekspor lengkap ruang | Diimplementasikan untuk F10: JSON terstruktur khusus Owner berisi akun, kategori, siklus/periode, budget, dan transaksi aktif/terhapus dari snapshot konsisten |
| Tahap 15 percakapan: siklus langsung berlaku | Diimplementasikan untuk F21: perubahan Owner langsung merebasis periode aktif, mempertahankan ID budget aktif, menyimpan prefix sebagai histori transisi, dan mendukung versi berulang pada hari yang sama |
| Tahap 16 percakapan: hapus ruang bersama | Diimplementasikan untuk F10: ringkasan dampak, konfirmasi nama persis, autentikasi ulang password, pemeriksaan Owner/versi, penghapusan atomik, dan kembali ke ruang pribadi |
| Tahap 17 percakapan: hapus akun pengguna | Diimplementasikan untuk F10: ringkasan dampak, blokir Owner ruang bersama, konfirmasi email, autentikasi ulang, penghapusan ruang pribadi, pencabutan membership, anonimisasi histori bersama, revoke session global, dan cleanup identitas Auth |
| Tahap 18 percakapan: menu akun dan profil | Diimplementasikan untuk F01/UX: Pengaturan dan Keluar dipindahkan ke menu akun desktop/mobile; profil menampilkan email, mengubah nama tampilan, dan mengganti password dengan autentikasi ulang serta global sign-out |
| Tahap 19 percakapan: Git repository dan CI | Repository `main`, remote GitHub, branch protection, serta workflow quality/build/unit dan PostgreSQL integration test tersedia. Run GitHub pertama menemukan lockfile optional dependency Linux tidak lengkap; lockfile lintas platform telah diregenerasi pada branch perbaikan dan menunggu verifikasi run GitHub |
| Optimasi navigasi, 25 September | Provisioning tidak lagi dijalankan pada setiap halaman; periode dideduplikasi per render dan create transaksi menghapus pre-read pada jalur normal |
| Email undangan otomatis, retry cleanup Auth, backup/pemulihan, serta konfigurasi deployment | Belum diimplementasikan/difinalisasi |
| Upload/storage/provider OCR eksternal | Belum diimplementasikan; consent, retensi, biaya, callback, dan lifecycle file masih terbuka |
| Pemeriksaan fondasi | Lint, TypeScript, format, build produksi lulus; 10 smoke browser lulus (exit 0); rincian pada ACCEPTANCE.md |
| Pengujian database khusus | 33 tes lulus melalui Supabase Session pooler: constraint, Prisma, provisioning, service finansial, undangan/ACL/lifecycle, penghapusan ruang dan akun, siklus gajian, submit draf struk, dan salin budget historis. Bukan pengujian produksi |

## Pemetaan istilah tahap

“Tahap pertama” dalam instruksi implementasi pengguna mengacu ke **Setup proyek** pada urutan percakapan: tooling dan tampilan dasar. Ini bagian bootstrap dari Fase 0, **bukan** penyelesaian seluruh “Fase 1 — fondasi dan transaksi MVP” di bawah. Pemisahan ini tidak mengubah scope fitur PRD.

## Hasil bootstrap

- Tersedia shell Alokasi dan tujuh halaman eksplisit dengan navigasi, pemilih pratinjau ruang, token desain terang/gelap, dan status fitur yang belum terhubung.
- `.env.example` dan `.gitignore` tersedia. Aplikasi dapat dijalankan tanpa credential; tidak ada akun provider atau deployment yang dibuat.
- Komponen shadcn Button/Card/Badge/Sheet diambil dari registry resmi lalu disesuaikan untuk token, heading, label bahasa Indonesia, dan utilitas lokal.
- Package dipin pada package.json/package-lock.json. ESLint 9 adalah pengecualian kompatibilitas sementara yang dicatat di TECH_STACK.md; harus ditinjau sebelum produksi.
- Tahap 2 mengimplementasikan dan memverifikasi schema fisik serta migrasi PostgreSQL/Prisma. Berikutnya: autentikasi Supabase, onboarding, dan otorisasi service. Jangan menyatakan peran aplikasi sudah ditegakkan oleh constraint database saja.

## Hasil tahap 2

- `prisma/schema.prisma` memodelkan user, workspace, membership, invitation, account, category, transaction, BudgetPeriod, budget, dan audit.
- Constraint SQL menangani tipe/nominal transaksi, referensi lintas ruang, nama kategori termasuk arsip, Owner, idempotency key, serta periode kalender bersebelahan.
- Schema `app` privat; role runtime tidak memiliki superuser/BYPASSRLS/CREATE. Tidak ada perubahan pada schema `auth`.
- Fixture tes di-rollback; belum ada seed onboarding atau endpoint finansial.
- Setup dan batas tanggung jawab service berikutnya tercantum di [DATABASE_SETUP.md](DATABASE_SETUP.md). Tahap 2 bukan penyelesaian seluruh Fase 1 MVP.

## Hasil tahap 3

- Halaman registrasi, login, verifikasi email, lupa/reset password, dan logout mengikuti desain Alokasi.
- Supabase SSR menyimpan session dalam cookie. Proxy memperbarui session dan melakukan redirect optimistis; server memanggil `getUser()` sebelum provisioning/data terlindungi.
- Proyek development dapat mematikan Confirm email untuk akun dummy. Jika Supabase langsung menerbitkan session, registrasi memverifikasi user melalui `getUser()`, melakukan provisioning idempotent, lalu menuju dashboard; mode staging/produksi tetap wajib memakai verifikasi email.
- Provisioning verified user bersifat atomik dan idempotent: profil, ruang pribadi, Owner, kategori bawaan, aturan siklus default tanggal 1, dan periode aktif. Akun aplikasi nonaktif tidak diaktifkan kembali otomatis.
- Mutation auth memeriksa same-origin, redirect internal, dan header no-store. Forgot password memberi respons generik.
- Ruang bersama, undangan, profil/zona waktu, CRUD finansial, dan ACL service fitur belum termasuk irisan ini. Detail operasional ada di [AUTH_SETUP.md](AUTH_SETUP.md).
- Smoke manual yang dilaporkan pengguna pada 23 September 2026 berhasil untuk register, login, dan forgot password dalam konfigurasi development. Ini belum membuktikan kebijakan SMTP produksi, tautan kedaluwarsa/reuse, atau seluruh lifecycle session.

## Hasil tahap 4

- Halaman Akun membaca PostgreSQL dan mendukung pembuatan bank/tunai/e-wallet dengan saldo awal integer rupiah serta tanggal mulai, perubahan nama, dan arsip hanya saat saldo nol.
- Saldo dihitung dari saldo awal ditambah pemasukan, dikurangi pengeluaran, serta transfer keluar/masuk. Transfer tidak mengubah total dana.
- Pengaturan kategori mendukung tambah, ubah nama, arsip, dan pulihkan untuk pemasukan/pengeluaran. Normalisasi Unicode/spasi dan reservasi nama arsip mengikuti DOMAIN_RULES.
- Semua mutasi mengambil ruang pribadi dari identitas server, memeriksa Owner aktif, memakai version check, dan mencatat audit metadata.
- Unit test dan build lulus. UI terautentikasi diperiksa read-only pada desktop dan 360 px tanpa overflow. Suite integrasi pada database test khusus kini lulus untuk scope ruang, mutasi akun/kategori, saldo, konflik versi, dan audit.
- Pengguna melaporkan alur akun dan kategori sudah bisa pada 23 September 2026.

## Hasil tahap 5

- Form transaksi mendukung pemasukan, pengeluaran, dan transfer dengan nominal integer rupiah, tanggal lokal, akun/kategori aktif, serta catatan opsional.
- Transfer disimpan sebagai satu operasi bisnis. Daftar saldo menerapkan transfer keluar/masuk tanpa memasukkannya ke pemasukan atau pengeluaran.
- Submit memakai idempotency key dan hash payload. Edit memakai optimistic version check; hapus adalah soft-delete dengan konfirmasi dan memperbarui saldo dari sumber data yang sama.
- Semua query dan mutasi dibatasi ruang pribadi dari session server. Form tidak dapat memilih workspace ID, akun arsip, atau kategori arsip.
- 15 unit test, 10 regresi Playwright, lint, TypeScript, format, dan build lulus. UI transaksi terautentikasi diperiksa read-only pada desktop dan 360 px tanpa overflow. Test integrasi service lulus untuk scope ruang, idempotensi payload, create/update/delete, saldo, dan audit.
- Pengguna melaporkan alur transaksi sudah bisa pada 24 September 2026.

## Hasil tahap 6

- Halaman Budget membuat, mengubah, dan menghapus limit kategori pengeluaran pada periode kalender aktif. Realisasi membaca transaksi aktif pada batas tanggal eksplisit yang sama; transaksi tanpa budget ditampilkan terpisah.
- Status normal, hampir habis, habis, dan terlampaui dihitung dengan integer; sisa alokasi boleh negatif. Menghapus budget tidak menghapus transaksi.
- Dashboard membaca data server untuk total saldo, pemasukan, pengeluaran, arus kas bersih, kategori pengeluaran terbesar, ringkasan budget, transaksi terbaru, dan saldo per akun. Saldo awal dan transfer tidak masuk arus kas periode.
- Seluruh query dan mutasi dibatasi workspace dari session server. Mutasi budget memakai validasi kategori expense aktif, version check, transaksi database, dan audit metadata.
- 20 unit test, 10 regresi Playwright, lint, TypeScript, format, dan build lulus. UI terautentikasi diverifikasi read-only dengan data development. Test integrasi service budget lulus untuk create/update/delete, realisasi, sisa, pengeluaran tanpa budget, scope ruang, dan audit.

## Hasil tahap 7

- Halaman Laporan memakai periode aktif sebagai default dan mendukung rentang tanggal inklusif, jenis transaksi, akun, kategori, serta pencarian catatan/akun/kategori melalui parameter URL.
- Ringkasan menampilkan pemasukan, pengeluaran, arus kas bersih, transfer internal, pengeluaran per kategori, daftar transaksi sumber, dan budget versus aktual. Perbandingan budget disembunyikan saat filter bebas aktif agar tidak disalahartikan sebagai realisasi periode.
- Ekspor CSV transaksi mengikuti filter dan workspace dari session server; kolom mencakup tanggal, jenis, akun, akun tujuan, kategori, nominal integer IDR, catatan, dan pencatat. CSV memakai UTF-8 BOM, quote escaping, serta perlindungan formula injection.
- 31 unit test, 10 regresi Playwright, lint, TypeScript, format, dan build lulus. UI terautentikasi diverifikasi pada data development dan lebar 360 px tanpa overflow. Unduhan CSV terfilter diterima browser.
- Pada penutupan tahap 7, ruang bersama/peran masih terbuka; status terbarunya ada pada tahap 8 di bawah. Ekspor lengkap ruang, penghapusan akun, pengujian ACL ekspor, dan laporan berskala besar tetap berada pada pekerjaan berikutnya.

## Hasil tahap 8

- Pengguna dapat membuat ruang bersama terpisah dan berpindah ruang melalui pemilih yang membawa ID ruang pada setiap navigasi. Server selalu membaca ulang membership aktif; ID dari browser tidak menjadi bukti akses.
- Owner dapat membuat undangan Editor/Viewer yang terikat email terverifikasi, berlaku tujuh hari, disimpan sebagai hash token, sekali pakai secara atomik, dan dapat dicabut. Tautan dapat disalin manual; pengiriman email otomatis belum dikonfigurasi.
- Anggota menerima undangan pada halaman khusus. Editor dapat menambah transaksi dan hanya mengubah/menghapus transaksi buatannya sendiri. Viewer membaca data tanpa kontrol tulis. Owner tetap mengelola akun, kategori, budget, anggota, dan peran.
- Identitas pencatat tampil pada transaksi ruang bersama. Aktivitas terbaru menampilkan aktor, tindakan, tipe objek, dan waktu tanpa menyimpan nilai finansial/catatan dalam audit.
- Pencabutan membership menghilangkan akses pada permintaan berikutnya tanpa menghapus histori transaksi. Optimistic version dipakai saat mengubah peran atau mencabut anggota.
- 27 tes PostgreSQL lulus; skenario tambahan mencakup create ruang, undangan, penerimaan, token sekali pakai, Editor membuat transaksi, Editor ditolak menghapus transaksi Owner, Viewer ditolak menulis, perubahan peran, dan pencabutan akses.
- Transfer kepemilikan dengan persetujuan penerima, Editor/Viewer keluar sendiri, hapus ruang, pengiriman email undangan, dan matriks ACL ekspor lengkap masih terbuka. F17 belum ditandai selesai penuh sampai lifecycle tersebut tersedia.

## Hasil tahap 9

- Owner dapat memilih hari mulai 1–31 per ruang dari Pengaturan dan melihat pratinjau periode transisi serta periode reguler berikutnya sebelum menyimpan. Editor/Viewer hanya melihat aturan ruang.
- `CycleSetting` menyimpan hari, tanggal efektif, dan versi. Perubahan mulai pada akhir periode aktif; periode aktif dan historis tidak ditulis ulang. Hari 29–31 dihitung ulang dari hari asli setiap bulan sehingga Februari tidak menyebabkan drift.
- Rencana yang belum efektif dapat diganti atomik. Optimistic version mendeteksi form lama; periode masa depan yang tidak dikenali atau memiliki budget ditolak tanpa penghapusan data.
- Dashboard, Budget, Laporan, CSV default, dan label periode memakai resolver `BudgetPeriod` yang sama. Label menampilkan rentang tanggal penuh dan menandai periode transisi.
- Migrasi ketiga berhasil pada development dan test. Verifikasi terbaru: 42 unit test, 28 test PostgreSQL, lint, TypeScript, Prisma validate/generate, dan format lulus.
- Pemilih periode historis, grafik enam periode, penyalinan budget ke transisi, serta smoke browser manual setelah mengubah tanggal masih terbuka. F21 inti aktif, tetapi skenario PERIOD-10–PERIOD-13 dan PERIOD-15 belum seluruhnya memiliki bukti end-to-end.

## Optimasi navigasi dan transaksi — 25 September 2026

- Diagnosis terhadap request RSC 1,79–2,64 detik menemukan provisioning idempoten dijalankan penuh pada setiap navigasi. Jalur tersebut sebelumnya melakukan rangkaian upsert user, workspace, kategori, aturan siklus, dan periode sebelum membaca halaman.
- Jalur normal kini membaca user beserta membership aktif, lalu hanya memanggil provisioning bila ruang pribadi memang belum ada. Sinkronisasi email/nama hanya menulis saat nilainya berubah.
- Resolver periode memakai memoization satu render untuk mencegah query periode yang sama dari shell dan komponen halaman. Create transaksi langsung mencoba insert idempoten; query lookup tambahan hanya dijalankan pada retry/konflik unik.
- Pemeriksaan read-only dari mesin development mencatat `db:check:runtime` sekitar 1,18 detik dan `auth:check` sekitar 0,63 detik termasuk startup npm/Node, sehingga lokasi/latency Supabase tetap berpengaruh. Mode `next dev` juga lebih lambat pada kunjungan route pertama karena kompilasi.
- Regresi setelah perubahan: 42 unit test, 28 test PostgreSQL, lint, TypeScript, dan format lulus. Pengukuran browser terautentikasi setelah perubahan masih perlu dilakukan pengguna karena session browser tidak tersedia pada alat smoke agent.

## Fase 0 — technical design

- Gunakan baseline TECH_STACK.md: Next.js/TypeScript, Route Handlers Node.js, PostgreSQL Supabase, Prisma, Supabase Auth. Pilih versi kompatibel dan finalisasi environment ketika bootstrap diminta.
- Tetapkan skema ruang, keanggotaan, akun, kategori, transaksi, dan BudgetPeriod; kontrak API; strategi otorisasi; migrasi; idempotensi; serta observabilitas.
- Mulai dengan BudgetPeriod bulan kalender agar F21 tidak mengharuskan budget yang terikat string bulan dimigrasi secara berisiko.
- Catat keputusan teknis sebagai keputusan implementasi, bukan persetujuan pengguna yang tidak pernah diberikan.
- Jangan menambah microservices, queue, provider OCR, atau layanan berbayar jika belum dibutuhkan fase aktif.

## Fase 1 — fondasi dan transaksi MVP

Fitur: F01–F05, F17, bagian F10.

- Auth, onboarding, ruang pribadi/bersama, anggota dan izin.
- Akun/saldo awal, kategori kustom, pemasukan, pengeluaran, dan transfer.
- Otorisasi lintas ruang, idempotensi, konflik edit, serta audit.
- Gate: isolasi data, matriks izin, dan saldo konsisten terverifikasi.

## Fase 2 — budgeting dan dashboard MVP

Fitur: F06–F10, melengkapi F17.

- Budget per kategori dan periode kalender, dashboard, transaksi, akun, laporan, filter, ekspor.
- UI mengikuti DESIGN.md; angka berasal dari sumber data yang sama.
- Kontrol data, backup/pemulihan, penghapusan akun, state gagal/kosong, dan aksesibilitas.
- Gate: acceptance P0 lolos; prosedur operasional serta kebijakan retensi siap sebelum rilis publik.

## Fase 3 — kebutuhan lanjutan yang diminta

Status: F21 inti diimplementasikan pada tahap 9; prototipe aman F18 diimplementasikan pada tahap 10.

### F21 — siklus gajian

Direkomendasikan sebelum OCR agar aturan periode sudah stabil saat tanggal hasil scan masuk.

- Konfigurasi hari mulai, resolver anchor, versi aturan, rebasing periode aktif langsung, histori transisi, dan preview.
- Perbarui dashboard, budget, transaksi, laporan, chart, drill-down, dan ekspor secara konsisten.
- Migrasikan data yang perlu tanpa mengubah batas historis atau menimpa budget masa depan secara diam-diam.
- Gate: tanggal 1/25/29/30/31, kabisat, transisi, zona waktu, dan edit tanggal lolos acceptance.

### F18 — scan draf pengeluaran

- Kontrak adapter OCR dan fixtures lebih dulu; tetapkan provider, biaya, retensi, dan penyimpanan sebelum pemrosesan data nyata.
- Implementasikan upload, status ekstraksi, review field, koreksi, batal/retry, dan submit atomik.
- Kegagalan, callback terlambat, duplikasi, serta perubahan izin/kategori saat proses berjalan harus tertangani.
- Gate: seluruh acceptance OCR lolos; tidak ada posting sebelum submit; lifecycle file nyata dapat diverifikasi.

## Hasil tahap 10 — prototipe scan struk, 25 September 2026

- Model `ReceiptDraft` membatasi draf ke workspace dan pembuat, menyimpan hasil ekstraksi terpisah dari koreksi, serta menautkan maksimal satu transaksi.
- Owner/Editor dapat membuat dan membatalkan draf miliknya; Viewer ditolak. Akun selalu dipilih pengguna dan kategori divalidasi ulang saat submit.
- Simulasi fixture mengisi Rp125.000 dengan confidence per field. Koreksi Rp120.000 dan submit membuat satu pengeluaran secara atomik; retry draf yang sama mengembalikan transaksi yang sama.
- Gambar hanya memakai pratinjau blob lokal. UI memvalidasi JPEG/PNG/WebP dan batas 10 MB, tetapi file tidak masuk request server sehingga ini bukan validasi upload produksi.
- Migrasi `20260925000000_receipt_draft_fixture` diterapkan pada development dan test. 49 unit test dan 29 test PostgreSQL lulus.

OCR-01, OCR-02, OCR-07, jalur izin OCR-10/OCR-11, serta pembatalan tanpa posting mendapat bukti test service. OCR-03 mendapat penanda confidence pada UI; OCR-09 dijaga dengan akun kosong yang wajib dipilih. OCR-04–OCR-06, OCR-08, OCR-12–OCR-14, callback provider, file privat, dan OCR nyata belum dapat diklaim karena file tidak pernah dikirim ke server.

## Hasil tahap 11 — OCR lokal dan deteksi bank/QRIS, 26 September 2026

- Tesseract.js, core WASM, dan model bahasa disajikan dari origin aplikasi. Worker dimuat dinamis hanya saat pengguna menekan “Baca gambar”.
- Gambar dinormalisasi di canvas lalu diproses seluruhnya di browser. Server menerima field terstruktur; teks OCR mentah dan gambar tidak masuk request, database, log, atau storage.
- Parser mengutamakan “Total Transaksi/Grand Total/Total Bayar” daripada nominal transfer dan biaya, membaca tanggal Indonesia, serta mengambil penerima/merchant dari label terkait.
- Deteksi mengenali transfer, QRIS, BI-FAST/RTGS/SKN, bank dan aplikasi umum seperti Livin/Mandiri, myBCA/BCA, BRImo/BRI, wondr/BNI, BSI, CIMB, Jago, serta e-wallet umum.
- Bukti transfer menampilkan peringatan agar transfer internal dicatat lewat jenis transaksi Transfer. Akun sumber tidak pernah dipilih OCR.
- Migrasi `20260925010000_local_receipt_ocr` diterapkan pada development dan test. Parser dan validasi mencapai 60 unit test lulus; 29 test PostgreSQL serta submit paralel lulus. Build, lint, TypeScript, Prisma validate, dan format lulus.
- Regresi BCA memastikan `25,000.00` menjadi Rp25.000, identitas penerbit BCA mengalahkan Bank Tujuan Mandiri meski label dan nilainya terpisah baris, dan frasa “Pemindahan Dana” tidak dianggap e-wallet DANA.

Deteksi visual hanya memakai teks OCR, bukan klasifikasi logo piksel khusus. Bukti buram, terpotong, font dekoratif, atau layout baru dapat gagal dan harus diisi manual. Evaluasi corpus beragam serta provider vision fallback belum dikerjakan.

## Hasil tahap 12 — dashboard dan budget historis, 27 September 2026

- Dashboard dan Budget menerima `periodId` dari URL, tetapi server selalu membatasi pilihan ke periode tersimpan milik workspace aktif sampai periode aktif. Nilai tidak valid kembali aman ke periode aktif.
- Saldo akun tetap saldo saat ini. Pemasukan, pengeluaran, arus kas, kategori terbesar, transaksi terbaru, realisasi budget, dan pengeluaran belum dianggarkan memakai batas periode terpilih yang sama.
- Grafik arus kas menampilkan maksimal enam periode tersimpan hingga periode terpilih. Transfer dan saldo awal tidak masuk batang; periode aktif serta transisi diberi label.
- Drill-down pemasukan, pengeluaran, kategori, dan transaksi terbaru menuju Laporan dengan rentang inklusif yang diturunkan dari batas periode serta filter terkait.
- Periode historis bersifat baca saja. Owner dapat menyalin kategori terpilih dari periode tepat sebelumnya ke periode aktif setelah melihat pratinjau; kategori arsip dan kategori yang sudah ada tidak dapat dipilih. Service menolak target lama, sumber bukan periode sebelumnya, overwrite, dan retry konflik.
- Tidak ada migrasi schema. Verifikasi: 63 unit test dan 30 test PostgreSQL lulus; browser terautentikasi desktop serta 360 px menunjukkan pemilih, grafik, drill-down, dan tidak ada overflow horizontal. Lint, TypeScript, format, dan build produksi lulus.

Data development baru memiliki satu periode tersimpan, sehingga alur memilih periode lama dan kartu salin belum dapat diperagakan pada data pengguna tanpa memodifikasinya. Keduanya diverifikasi pada fixture database dua periode; UI akan muncul otomatis setelah workspace memiliki periode sebelumnya.

## Hasil tahap 13 — lifecycle ruang bersama, 27 September 2026

- Owner dapat meminta satu anggota aktif menjadi Owner. Permintaan tersimpan pada workspace, berlaku tujuh hari, dapat dibatalkan, dan belum mengubah izin sampai anggota tujuan menerima sendiri.
- Penerimaan mengunci workspace, menurunkan Owner lama menjadi Editor, menaikkan penerima menjadi Owner, membersihkan permintaan, dan mencatat audit dalam satu transaksi database.
- Optimistic version pada workspace dan membership serta constraint satu Owner menjaga retry dan dua penerimaan bersamaan; test membuktikan hanya satu penerimaan berhasil dan tepat satu Owner tersisa.
- Editor/Viewer dapat keluar sendiri. Owner ditolak sampai pengalihan selesai; histori transaksi dan data finansial tidak dihapus. Keluar atau pencabutan calon Owner membersihkan permintaan tertunda.
- Migrasi `20260927000000_ownership_transfer` diterapkan pada database development dan test. Tidak ada tabel baru; state permintaan dan foreign key workspace-membership ditambahkan ke schema yang ada.
- UI Anggota menampilkan kartu berbeda untuk Owner, penerima transfer, dan anggota biasa. Server Actions selalu membaca ulang identitas serta membership dan tidak mempercayai role dari browser.
- Verifikasi: test fokus lifecycle dan suite PostgreSQL penuh 31/31 lulus; Prisma validate/generate, lint, TypeScript, format, dan build produksi lulus.

Pada penutupan tahap 13, penghapusan ruang dan autentikasi ulang masih terpisah; penghapusan ruang diselesaikan pada tahap 16 dan penghapusan akun pada tahap 17. SMTP undangan otomatis tetap pekerjaan terpisah. Alur terautentikasi dua pengguna belum dijalankan di browser; perilaku lintas akun dibuktikan pada test PostgreSQL.

## Hasil tahap 14 — ekspor lengkap ruang, 27 September 2026

- Owner dapat mengunduh satu dokumen JSON dari Pengaturan. Editor dan Viewer tidak mendapat kontrol UI; Route Handler tetap memeriksa role Owner aktif pada server.
- Ekspor membaca satu snapshot `Repeatable Read` yang mencakup metadata ruang, seluruh versi aturan siklus, akun/kategori aktif maupun arsip, periode budget, budget, serta transaksi aktif dan soft-delete.
- Nominal saldo awal, budget, dan transaksi ditulis sebagai string integer IDR. Tanggal bisnis memakai `YYYY-MM-DD`; timestamp memakai ISO 8601.
- Transaksi menyertakan pencatat/pengubah untuk akuntabilitas ruang bersama. Auth subject, token, invitation token hash, idempotency key/request hash, gambar, draf receipt, dan teks OCR mentah tidak disertakan.
- Dokumen memiliki penanda format dan `schemaVersion: 1`; respons memakai attachment JSON, `private, no-store`, dan `nosniff`.
- Test integrasi pada fixture finansial memverifikasi akun, kategori, periode, budget, transaksi, nominal presisi, data arsip/soft-delete, serta tidak adanya metadata idempotensi. Unit 63/63, PostgreSQL 31/31, lint, TypeScript, format, dan build produksi lulus.

Ekspor masih dibangun di memori dan belum diuji dengan dataset besar; ini adalah salinan data pengguna, bukan backup database atau mekanisme restore. Penghapusan ruang/akun dengan autentikasi ulang tetap tahap berikutnya.

## Hasil tahap 15 — siklus budget langsung berlaku, 27 September 2026

- Owner mendapat pratinjau rentang aktif baru sebelum menyimpan. Tombol menerapkan aturan saat itu juga, bukan membuat jadwal untuk akhir periode.
- Service mengunci workspace dan merebasis periode yang mencakup hari ini dalam transaksi serializable. ID periode aktif dipertahankan agar budget yang sudah dibuat tetap terhubung.
- Jika batas baru bergerak maju, bagian awal periode lama disimpan sebagai histori transisi. Jika batas baru bergerak mundur melewati awal aktif lama, awal lama tetap dan periode dipendekkan sebagai transisi agar histori tertutup tidak ditulis ulang.
- Tanggal transaksi tidak diubah. Dashboard, budget, laporan default, dan drill-down langsung menghitung rentang baru melalui resolver `BudgetPeriod` yang sama.
- Periode masa depan tanpa budget dapat dibentuk ulang. Budget masa depan tetap menyebabkan penolakan jelas sehingga limit tidak hilang atau berpindah diam-diam.
- Migrasi `20260927010000_immediate_payday_cycles` mengizinkan beberapa versi siklus memiliki tanggal efektif sama; nomor versi tetap monoton sebagai optimistic concurrency key.
- Verifikasi akhir: migrasi development/test, 63 unit test, 31 test PostgreSQL, Prisma validate/generate, lint, TypeScript, format, dan build produksi lulus.

Perubahan tidak memigrasikan budget masa depan dan tidak menghitung ulang periode yang telah ditutup. Kedua tindakan tersebut memerlukan alur pemetaan tersendiri bila kelak dibutuhkan.

## Hasil tahap 16 — penghapusan ruang bersama, 28 September 2026

- Halaman Anggota menampilkan zona penghapusan hanya untuk Owner ruang bersama, lengkap dengan jumlah keanggotaan, akun, kategori, transaksi, budget, dan draf scan yang akan terdampak serta anjuran mengekspor data lebih dahulu.
- Tombol destruktif baru aktif setelah nama ruang diketik persis dan password diisi. Server tetap memvalidasi payload, identitas terverifikasi, role Owner, tipe ruang, versi workspace, nama, dan password; kontrol UI bukan batas otorisasi.
- Password dikirim langsung dari Server Action ke Supabase Auth untuk login ulang akun yang sama, tidak masuk database, audit, URL, atau log aplikasi.
- Penghapusan mengunci workspace dan membersihkan seluruh data ruang dalam satu transaksi serializable. User, ruang pribadi, dan ruang lain para anggota tetap ada; setelah sukses Owner diarahkan ke halaman Anggota ruang pribadinya.
- Tidak ada migrasi schema pada tahap ini. Penghapusan akun user, sesi seluruh perangkat, OAuth reauthentication, backup/restore, dan kebijakan kedaluwarsa cadangan tetap pekerjaan berikutnya.
- Verifikasi akhir: 63 unit test dan 32 test PostgreSQL lulus; lint, TypeScript, format, dan build produksi juga lulus.

## Backlog kandidat — bukan komitmen aktif

F11 transaksi berulang, F12 target tabungan, F13 impor CSV, F14 utang/piutang, F15 rekonsiliasi, F16 rollover. P2: split bill/settlement, integrasi bank, AI insight, dan fitur eksplorasi lain. Jangan mengimplementasikan kandidat hanya karena tercantum.

## Format handoff setiap irisan pekerjaan

- ID fitur/fase yang dikerjakan dan statusnya.
- Keputusan baru serta dokumen yang diperbarui.
- Perubahan kode/migrasi/API/UI yang benar-benar selesai.
- Acceptance yang diuji dan hasilnya; bagian yang belum diuji.
- Masalah terbuka dan pekerjaan berikutnya, tanpa mengklaim sukses palsu.

Fase boleh berubah atas instruksi pengguna. Perbarui rencana dan keputusan, lalu lanjutkan pekerjaan yang sudah diotorisasi; jangan menjadikan dokumen ini alasan meminta konfirmasi berulang.
