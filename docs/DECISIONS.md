# Catatan keputusan

Diperbarui: 6 Oktober 2026. Dokumen ini membedakan sumber keputusan agar agent tidak mengubah saran menjadi persetujuan pengguna.

## Keputusan dan kebutuhan pengguna

| ID | Tanggal | Sumber | Keputusan |
|---|---|---|---|
| D01 | 21 Sep 2026 | Permintaan PRD dan jawaban target pengguna | Produk untuk individu dan keuangan bersama, dengan budgeting dan dashboard |
| D02 | 22 Sep 2026 | “oke” setelah mockup | Arah visual mockup Alokasi diterima sebagai baseline; bukan bukti persetujuan seluruh detail teknis/edge case |
| D03 | 22 Sep 2026 | “fitur menambahkan kategori” | Pengguna dapat menambah kategori; penajaman F05 yang sudah ada di P0 |
| D04 | 22 Sep 2026 | “scan struk/bukti pembayaran ... autocomplete ... sebelum disubmit” | Scan mengisi draf pengeluaran, pengguna meninjau dan submit; tidak auto-post |
| D05 | 22 Sep 2026 | “range tanggal bulanan ... mengikut tanggal gajian” | Siklus bulanan dapat dikonfigurasi berdasarkan tanggal gajian |
| D06 | 22 Sep 2026 | Permintaan Markdown agar agent tidak menyimpang | Simpan baseline dan panduan repository; pekerjaan saat ini hanya dokumentasi |
| D07 | 22 Sep 2026 | Pengguna meminta memilih frontend/backend/database/auth, memiliki dasar JS/TS dan terbuka PostgreSQL | Agent diberi wewenang memilih baseline teknis; bukan permintaan membuat akun layanan atau deploy |
| D08 | 22 Sep 2026 | “implementasikan dari tahap pertama dengan mengikuti md” dan permintaan melanjutkan pekerjaan yang terinterupsi | Implementasikan tahap Setup proyek: bootstrap tooling dan tampilan dasar, verifikasi, dan dokumentasi menjalankan aplikasi |
| D11 | 23 Sep 2026 | Pengguna meminta bypass verifikasi untuk email dummy setelah kuota SMTP development habis | Izinkan Confirm email dimatikan hanya pada proyek development; registrasi dengan session langsung tetap diverifikasi server dan diprovisi, sedangkan staging/produksi wajib memakai verifikasi email |
| D12 | 23 Sep 2026 | Pengguna mengonfirmasi register, login, dan forgot password berhasil lalu meminta tahap berikutnya | Lanjutkan irisan F02/F03/F05 untuk akun keuangan dan kategori kustom pada ruang pribadi |
| D13 | 23 Sep 2026 | Pengguna mengonfirmasi akun dan kategori sudah bisa lalu meminta tahap berikutnya | Lanjutkan F04 transaksi inti: pemasukan, pengeluaran, transfer, edit, dan hapus pada ruang pribadi |
| D14 | 24 Sep 2026 | Pengguna mengonfirmasi transaksi sudah bisa lalu meminta tahap berikutnya | Lanjutkan irisan F06/F07: budget per kategori pada periode kalender aktif dan dashboard berbasis data pada ruang pribadi |
| D15 | 24 Sep 2026 | Pengguna meminta melanjutkan ke tahap berikutnya setelah tahap budget/dashboard | Lanjutkan irisan F08 dan bagian ekspor F10: laporan terfilter, pencarian, ringkasan, budget versus aktual, dan ekspor CSV transaksi pada ruang pribadi |
| D16 | 24 Sep 2026 | Pengguna meminta memulai tahap berikutnya setelah database test siap | Lanjutkan irisan utama F17/F10: ruang bersama, pemilih ruang, undangan, Owner/Editor/Viewer, aktivitas, dan isolasi akses |
| D17 | 24 Sep 2026 | Pengguna meminta melanjutkan ke tahap berikutnya setelah ruang bersama | Lanjutkan F21: siklus budget per ruang mengikuti tanggal gajian, dengan perubahan prospektif dan histori tetap |
| D18 | 25 Sep 2026 | Pengguna melaporkan navigasi/input transaksi lebih dari satu detik dan menanyakan kontribusi Supabase | Diagnosis dan optimalkan round-trip server tanpa melemahkan validasi Auth atau otorisasi workspace |
| D19 | 25 Sep 2026 | Pengguna meminta melanjutkan ke tahap berikutnya setelah optimasi latency | Aktifkan irisan aman F18: draf privat, simulasi OCR berlabel, koreksi, batal, dan submit eksplisit; pemrosesan/upload gambar nyata menunggu keputusan provider dan retensi |
| D20 | 25 Sep 2026 | Pengguna menunjukkan total bukti Rp502.500 tetapi form berisi Rp125.000 dan menanyakan optimasi/AI OCR | Perjelas bahwa tahap 10 adalah demo tanpa OCR; skor dan field fixture tidak boleh dipresentasikan sebagai hasil pembacaan gambar. OCR nyata menjadi pekerjaan integrasi berikutnya |
| D21 | 26 Sep 2026 | Pengguna meminta memulai pendekatan OCR dan mendeteksi bank untuk bukti transfer/QRIS | Implementasikan OCR lokal browser lebih dulu, dengan parser nominal/tanggal/penerima, klasifikasi transfer/QRIS, serta deteksi bank/e-wallet; hasil tetap draf yang wajib diperiksa |
| D22 | 26 Sep 2026 | Pengguna melaporkan bukti BCA terbaca sebagai DANA dan `25,000.00` menjadi 2.500.000 | Perketat konteks merek DANA, prioritaskan institusi pada header dibanding bank tujuan, dan normalisasi separator ribuan/desimal format Indonesia maupun internasional |
| D23 | 26 Sep 2026 | Pengguna melaporkan bukti transfer BCA masih terbaca sebagai Mandiri karena bank tujuan berada pada baris terpisah | Deteksi institusi membaca konteks lintas baris dan mengutamakan identitas penerbit BCA atau badan hukum Bank Central Asia daripada bank tujuan |
| D24 | 27 Sep 2026 | Pengguna meminta semua cakupan dashboard dan budgeting historis dikerjakan bertahap | Aktifkan tahap 12 untuk pemilih periode historis, tren enam periode, drill-down, serta salin budget periode sebelumnya dengan pratinjau |
| D25 | 27 Sep 2026 | Pengguna meminta melanjutkan ke tahap berikutnya setelah dashboard dan budget historis | Lanjutkan F17/ACL-05: pengalihan Owner dengan persetujuan penerima dan keluar mandiri dari ruang bersama |
| D26 | 27 Sep 2026 | Pengguna meminta melanjutkan ke tahap berikutnya setelah lifecycle ruang bersama | Lanjutkan F10 kontrol data dengan ekspor lengkap ruang untuk Owner sebelum alur penghapusan destruktif |
| D27 | 27 Sep 2026 | Pengguna meminta siklus budgeting langsung mengubah periode saat dipilih | Perubahan tanggal siklus berlaku segera pada periode aktif; tidak lagi menunggu periode aktif lama berakhir |
| D28 | 28 Sep 2026 | Pengguna meminta melanjutkan ke tahap berikutnya setelah siklus langsung berlaku | Lanjutkan F10 dengan penghapusan ruang bersama yang aman setelah ekspor lengkap tersedia |
| D29 | 28 Sep 2026 | Pengguna meminta melanjutkan ke tahap berikutnya setelah penghapusan ruang bersama | Lanjutkan F10 dengan penghapusan akun mandiri: selesaikan kepemilikan ruang bersama, autentikasi ulang, hapus ruang pribadi, anonimkan histori bersama, dan cabut sesi |
| D30 | 28 Sep 2026 | Pengguna meminta Pengaturan dan Keluar berada pada kartu user sidebar, serta profil dan ganti password | Jadikan menu akun sebagai akses Profil & Pengaturan/Keluar pada desktop dan mobile; lengkapi F01 dengan nama tampilan, email baca saja, serta perubahan password yang mengeluarkan semua sesi |
| D31 | 28 Sep 2026 | Pengguna meminta dibimbing membuat Git repository dan CI | Inisialisasi repository lokal pada branch `main`, siapkan GitHub Actions untuk pemeriksaan kualitas dan PostgreSQL sementara, serta dokumentasikan pembuatan remote GitHub tanpa memasukkan rahasia |
| D32 | 28 Sep 2026 | Pengguna memilih melanjutkan setelah CI dan branch protection berhasil serta ingin mengerjakan sendiri langkah eksternal sambil belajar | Siapkan aplikasi untuk staging berbasis Vercel dan proyek Supabase terpisah: validasi runtime, health endpoint, security headers, logging aman, serta runbook yang memisahkan pekerjaan repository dari konfigurasi dashboard pengguna |
| D33 | 29 Sep 2026 | Pengguna melaporkan deployment produksi berhasil dan meminta melanjutkan fitur yang belum ada | Aktifkan F11 transaksi berulang sebagai kandidat P1 pertama: template bulanan dan pengingat dalam aplikasi, tanpa posting otomatis |
| D34 | 30 Sep 2026 | Pengguna meminta saran judul/kategori dari input yang pernah dan sering dipakai, lalu menyetujui rekomendasi implementasi yang ringan | Aktifkan F22: simpan judul terpisah dari catatan dan tampilkan saran berbasis riwayat ruang yang sama tanpa request server per ketikan |
| D34 | 30 Sep 2026 | Pengguna meminta Scan OCR dan tambah transaksi menjadi fokus menu Transaksi, lalu menyetujui saran pemisahan pengingat | Pertahankan Transaksi sebagai menu utama; tempatkan Riwayat dan Pengingat sebagai tampilan terpisah, prioritaskan aksi Scan struk/Tambah transaksi, dan jangan memuat query template pada halaman riwayat |
| D35 | 1 Okt 2026 | Pengguna meminta nominal transaksi langsung tampil dalam format rupiah saat diisi | Form transaksi manual, koreksi OCR, dan template pengingat menampilkan awalan Rp serta pemisah ribuan lokal; server tetap menerima string digit integer tanpa request tambahan |
| D36 | 5 Okt 2026 | Pengguna memilih menunda target tabungan dan meminta PWA installable saja | Aktifkan F23 sebagai PWA yang dapat dipasang dengan manifest, ikon, service worker, dan halaman offline; transaksi tetap memerlukan submit server dan tidak diantrikan atau dianggap tersimpan saat offline |
| D37 | 6 Okt 2026 | Pengguna meminta implementasi F15 setelah meninjau gambaran alurnya, serta meminta branch baru dibuat lebih dahulu | Aktifkan rekonsiliasi saldo manual per akun pada branch `feat/balance-reconciliation`: bandingkan saldo catatan dengan saldo aktual, simpan histori, dan sediakan penyesuaian eksplisit sebagai jalan terakhir |
| D38 | 6 Okt 2026 | Pengguna menyetujui rekomendasi fitur berikutnya dan meminta implementasi F13 | Aktifkan impor transaksi CSV pada branch baru `feat/csv-import`: pemetaan kolom, pratinjau, deteksi kandidat duplikat, pilihan eksplisit, commit batch atomik, dan histori impor |

## Pilihan teknis hasil delegasi D07

T01: **Next.js App Router + TypeScript, backend Route Handlers Node.js, PostgreSQL managed di Supabase, Prisma ORM/Migrate, dan Supabase Auth**. UI memakai Tailwind CSS dan shadcn/ui; validasi Zod; pengujian Vitest/Playwright. Arsitektur satu aplikasi bermodul; data bisnis hanya diakses backend. Alasan, tradeoff, dan batas keamanan ada di [TECH_STACK.md](TECH_STACK.md).

T01 menggantikan status “frontend/backend, database, auth belum ditentukan”. Pemilihan dilakukan oleh agent atas permintaan pengguna. D08 menghasilkan fondasi frontend/tooling; D09 menambahkan database development. Auth dan hosting produksi belum dibuat. Hosting aplikasi, SMTP, dan OCR tetap terbuka.

T02 (implementasi D08): halaman tahap 1 memakai state “belum terhubung” dan nilai `—`, tanpa transaksi demo atau CRUD memory-only. Pemilih ruang hanya mengubah konteks pratinjau URL dan tidak memberi/membuktikan hak akses. Halaman eksplisit dipilih agar rute tidak dikenal menghasilkan HTTP 404, sementara loading hanya berlaku untuk rute aplikasi.

T03 (kompatibilitas tooling): Node 24 LTS/npm 11; versi dependency dikunci pada lockfile. TypeScript 5.9.3 dipilih sesuai rentang parser lint. Percobaan ESLint 10.11.0 menemukan peer dependency yang belum mendukung serta runtime error pada plugin React; baseline sementara ESLint 9.39.5 dengan peringatan end-of-support yang terdokumentasi. Jangan menyatakan seluruh tooling ini masih didukung upstream. Upgrade sebelum produksi tanpa mematikan aturan lint atau memaksa peer dependency.

## Implementasi tahap database — 22–23 September 2026

D09: pengguna meminta “oke next ke tahap berikutnya”, mengisi koneksi Supabase development, lalu meminta melanjutkan setelah limit. Scope tahap ini: schema/migrasi Prisma, koneksi PostgreSQL, role runtime terpisah dan tes. Auth/CRUD tetap tahap berikutnya.

T04: Prisma 7.10.0 stabil dipilih karena tag latest registry menunjuk Prisma 8 prerelease. Client dan adapter dipin pada versi sama. Override transitif `@prisma/config → deepmerge-ts 8.0.2` dan `prisma → mysql2 3.24.4` memperbaiki advisory audit; database aplikasi tetap PostgreSQL. Generate berhasil setelah override; audit instalasi melaporkan 0 vulnerability. Evaluasi ulang override saat upgrade Prisma.

T05: constraint SQL tambahan dicatat dalam migrasi. Workspace personal memakai `personal_owner_id` unik; pemeriksaan Owner dan kontinuitas periode deferred memvalidasi state akhir transaksi. Periode P0 dikunci ke bulan kalender; F21 memerlukan migrasi baru ketika fase aktif. Batas service yang belum selesai dijelaskan di DATABASE_SETUP.md.

T06: koneksi remote wajib `sslmode=verify-full`, termasuk CLI dan test. CA proyek dipasok melalui `DATABASE_SSL_ROOT_CERT`; tidak memakai `rejectUnauthorized: false`. `test:db:development` adalah runner opt-in untuk development baru/kosong; menolak data aplikasi yang sudah ada dan menjalankan fixture rollback. CI/pengembangan selanjutnya memakai `TEST_DATABASE_URL` khusus test.

T15 (24 September 2026): pengguna menyediakan database test terpisah melalui Supabase Session pooler. Runner migrasi/status/check mendukung flag `--test` dan hanya membaca `TEST_DATABASE_URL`, tanpa fallback ke development. Karena koneksi remote dapat mengantre, Prisma memberi interactive transaction `maxWait` 15 detik dan `timeout` 30 detik; test service menyeluruh memiliki timeout 60 detik. Migrasi dan 26 tes integrasi lulus dengan TLS terverifikasi. Credential tetap hanya berada di file env lokal.

## Implementasi tahap autentikasi — 23 September 2026

D10: “oke lanjutkan ke tahap berikutnya” setelah tahap database selesai memberi scope tahap autentikasi dan onboarding ruang pribadi. Implementasi memakai Supabase Auth email/password dan cookie SSR, konsisten dengan T01. Tidak membuat akun pengguna atau mengirim email tes tanpa alamat yang diberikan pengguna.

T07: Next.js Proxy memakai `getClaims()` untuk refresh session dan redirect cepat, sedangkan halaman/service terlindungi memakai `getUser()` untuk identitas terkini. Proxy bukan otorisasi data. Auth mutation memakai Route Handlers, same-origin POST, redirect internal allowlist, dan cache no-store.

T08: user terverifikasi diprovisi atomik/idempotent menjadi satu profil, ruang pribadi, membership Owner, delapan kategori awal, dan BudgetPeriod kalender aktif. Metadata nama hanya presentasi. Akun aplikasi dengan `disabled_at` ditolak dan tidak diaktifkan kembali saat login. Zona waktu masih default Asia/Jakarta sampai layar profil/onboarding lengkap dibuat.

T09: ruang bersama tidak lagi disimulasikan lewat query UI setelah login. Pembuatan ruang bersama dan invitation dikerjakan pada irisan F17 berikutnya. Ini mencegah pratinjau dianggap data/izin nyata.

T10: mode bypass email D11 tidak memakai perubahan langsung pada schema `auth`, service-role key di aplikasi, atau penandaan email terverifikasi buatan. Supabase harus menerbitkan session dari konfigurasi development; aplikasi lalu memanggil `getUser()` sebelum provisioning. Akun lama tidak diubah secara diam-diam.

## Implementasi akun dan kategori — 23 September 2026

D12 mengaktifkan tahap 4 pada ruang pribadi. T11: mutasi memakai Server Actions dengan autentikasi Supabase dan membership Owner yang dibaca ulang pada server. ID ruang tidak diterima dari form/browser. Akun dan kategori memakai optimistic version check serta audit yang hanya menyimpan nama field berubah. Saldo akun dihitung dari saldo awal dan transaksi aktif; saldo awal bukan pemasukan. Pengujian integrasi tetap harus memakai `TEST_DATABASE_URL` khusus dan tidak boleh diarahkan diam-diam ke database development yang telah berisi data pengguna.

D13 mengaktifkan tahap 5 transaksi inti. T12: transfer disimpan sebagai satu transaksi dengan akun asal/tujuan dan dimutasi atomik. Submit membawa idempotency key per render; payload dinormalisasi dan di-hash agar retry identik mengembalikan transaksi yang sama, sedangkan key sama dengan isi berbeda ditolak. Edit/hapus memakai version check dan soft-delete; query saldo mengabaikan transaksi yang dihapus. Form dan service menolak tanggal masa depan, tanggal sebelum akun mulai, referensi lintas ruang, serta akun/kategori arsip.

D14 mengaktifkan tahap 6 budget dan dashboard. T13: budget unik per kategori pengeluaran dan BudgetPeriod, memakai integer rupiah, optimistic version check, hard-delete untuk alokasi saja, dan audit metadata; menghapus budget tidak menghapus transaksi. Dashboard dan halaman Budget memakai batas periode `[startDate, endDateExclusive)` yang sama. Pengeluaran tanpa budget tetap masuk total pengeluaran dan dilaporkan terpisah. Status realisasi mengikuti ambang PRD; sisa alokasi boleh negatif dan tidak dipresentasikan sebagai saldo dana.

D15 mengaktifkan tahap 7 laporan dan ekspor transaksi. T14: filter tanggal memakai batas awal inklusif/akhir eksklusif dan disimpan pada URL; filter bebas tidak mengubah BudgetPeriod. Ringkasan menghitung pemasukan dan pengeluaran saja untuk arus kas, sedangkan transfer dilaporkan terpisah. Perbandingan budget hanya ditampilkan untuk periode aktif tanpa filter tambahan. Endpoint CSV mengambil workspace dari session server, mengikuti filter, memakai nominal string integer dan UTF-8 BOM, serta menetralkan teks yang dapat dibaca spreadsheet sebagai formula.

D16 mengaktifkan tahap 8 ruang bersama. T16: ruang aktif dikirim sebagai `workspaceId`, tetapi server selalu memetakan Supabase identity ke user dan membership aktif sebelum membaca atau memutasi data. Owner mengelola resource ruang; Editor hanya membuat transaksi dan mengubah/menghapus transaksi buatannya; Viewer hanya baca. Undangan menyimpan hash token, terikat email terverifikasi, berlaku tujuh hari, dan diklaim atomik sekali pakai. Karena provider email aplikasi belum dipilih, tahap ini menyediakan tautan yang disalin manual dan tidak mengklaim pengiriman email otomatis. Transfer Owner/persetujuan penerima, keluar/hapus ruang, serta ekspor lengkap tetap pekerjaan lanjutan F17/F10.

D17 mengaktifkan tahap 9 siklus gajian. T17 semula menerapkan perubahan pada akhir periode aktif. Aturan waktu berlaku ini digantikan oleh D27/T27; aturan hari 1–31, otorisasi Owner, versi, perlindungan budget masa depan, dan resolver batas bersama tetap berlaku.

D18 menghasilkan T18: `getUser()` tetap dipakai untuk identitas server terkini, tetapi provisioning hanya berjalan bila ruang pribadi belum terbentuk. Context halaman membaca user dan membership aktif tanpa upsert rutin; resolver periode dideduplikasi dalam satu render; create transaksi tidak melakukan lookup idempotensi sebelum insert pada jalur normal. Optimasi ini mengurangi query remote tanpa memperpanjang umur cache otorisasi antar-request.

D19 menghasilkan T19: F18 tahap 10 memakai `ReceiptDraft` yang privat bagi pembuat, terpisah dari transaksi, dengan hasil fixture deterministik dan confidence per field. Prototipe memakai satu draf aktif yang dapat dilanjutkan per pembuat/ruang agar reload tidak menumpuk draf tanpa file sumber. Gambar JPEG/PNG/WebP maksimal 10 MB hanya divalidasi dan dipratinjau melalui blob URL di browser; file tidak dikirim ke Server Action, database, storage, atau provider. Submit membaca ulang membership aktif, akun, dan kategori di server, lalu membuat tepat satu pengeluaran dan menautkan draf dalam transaksi database yang sama. Provider OCR, file storage, callback, deteksi duplikat gambar, serta lifecycle file tetap belum dipilih.

D20 menghasilkan T20: UI memakai istilah “Demo alur scan struk” dan “Tanpa OCR”, menyebut nominal fixture Rp125.000 secara eksplisit, serta menandai confidence sebagai skor demo. Ini mencegah data fixture dinilai sebagai akurasi ekstraksi. Implementasi OCR nyata tidak boleh memakai skor buatan ini.

D21 menghasilkan T21: OCR lokal memakai Tesseract.js 7 dengan worker, core WASM, dan model `eng` yang disajikan dari origin aplikasi melalui aset hasil `postinstall`. Gambar diproses di browser; hanya nominal, tanggal, penerima, institusi, jenis bukti, metode pembayaran, dan confidence terstruktur yang dikirim ke Server Action. Teks OCR mentah tidak dikirim, disimpan, atau dicatat. Parser memprioritaskan label total pembayaran di atas nominal transfer/biaya, mengenali transfer/QRIS, serta merek bank/e-wallet umum. Deteksi adalah saran yang dapat salah; akun sumber tetap dipilih pengguna dan transfer internal diarahkan ke form manual Transfer.

D22 menghasilkan T22: kata “dana” generik tidak lagi cukup untuk mendeteksi e-wallet DANA; diperlukan baris merek/konteks wallet. Institusi yang muncul di baris awal bukti mendapat prioritas, sedangkan “Bank Tujuan/Penerima” diberi penalti. Parser rupiah membuang pecahan `.00`/`,00` setelah lebih dahulu mempertahankan separator ribuan, sehingga `25.000`, `25,000`, `25,000.00`, dan `25.000,00` semuanya menjadi integer `25000`. Label UI seperti “Jenis Transaksi” ditolak sebagai merchant; field dibiarkan kosong bila penerima tidak dapat dipercaya.

D23 menghasilkan T23: baris `BCA` mandiri dan `PT Bank Central Asia Tbk` diperlakukan sebagai identitas penerbit yang kuat. Penilaian bank memeriksa dua baris sebelumnya sehingga `BANK MANDIRI` yang dipisahkan dari label `Bank Tujuan`, atau didahului `Jenis Transaksi/Transfer ke`, tetap dikenali sebagai tujuan dan tidak mengalahkan penerbit BCA.

D24 menghasilkan T24: periode historis pada Dashboard dan Budget hanya dapat dipilih dari `BudgetPeriod` ruang aktif yang telah terbentuk. Periode lama bersifat baca saja; create/update/delete budget tetap terikat periode aktif. Salin budget hanya menerima periode tepat sebelumnya, kategori aktif yang dipilih, dan target periode aktif. Budget yang sudah ada tidak ditimpa dan retry setelah salin ditolak sebagai konflik. Saldo saat ini tidak mengikuti pemilih periode; drill-down memakai batas tanggal periode terpilih.

D25 menghasilkan T25: ruang bersama menyimpan maksimal satu permintaan pengalihan Owner. Owner memilih anggota aktif non-Owner, anggota tujuan harus menerima sendiri dalam tujuh hari, dan Owner dapat membatalkan permintaan. Penerimaan mengunci workspace lalu menurunkan Owner lama menjadi Editor dan menaikkan penerima menjadi Owner dalam satu transaksi; optimistic version dan constraint database menangani retry atau penerimaan bersamaan. Editor/Viewer dapat keluar sendiri, sedangkan Owner ditolak sampai transfer selesai. Keluar atau pencabutan anggota tujuan membatalkan permintaan tertunda tanpa menghapus histori.

D26 menghasilkan T26: ekspor lengkap ruang memakai Route Handler terautentikasi dan hanya menerima Owner aktif yang dibaca ulang server. Snapshot `Repeatable Read` mencakup workspace, aturan siklus, akun termasuk arsip, kategori termasuk arsip, periode budget, budget, serta transaksi aktif/terhapus. Nominal JSON disimpan sebagai string integer; token auth, token undangan, idempotency key/hash, gambar, draf, dan teks OCR mentah tidak diekspor. Ekspor ini tidak menggantikan backup operasional atau prosedur pemulihan.

D27 menghasilkan T27: perubahan hari mulai siklus langsung merebasis `BudgetPeriod` yang mencakup hari ini. ID periode aktif dipertahankan sehingga budget aktif tetap terhubung; realisasi dihitung ulang memakai batas baru tanpa mengubah tanggal transaksi. Jika anchor baru berada setelah awal lama, prefix lama disimpan sebagai periode transisi historis tanpa memindahkan budget aktif. Jika anchor baru berada sebelum awal lama, awal lama dipertahankan dan periode aktif dipendekkan sebagai transisi agar periode tertutup sebelumnya tidak diubah dan tidak terjadi overlap. Periode masa depan tanpa budget dapat dibentuk ulang; adanya budget masa depan menolak perubahan dengan pesan jelas. Versi tetap meningkat, termasuk beberapa perubahan pada tanggal efektif yang sama, dan mutasi mengunci workspace dalam transaksi serializable.

D28 menghasilkan T28: hanya Owner aktif dapat menghapus ruang bersama. UI menampilkan hitungan data terdampak, meminta nama ruang persis, dan meminta autentikasi ulang password. Service mengunci workspace, memeriksa ulang Owner serta versi, lalu menghapus invitation, audit, draf scan, transaksi, budget, periode, aturan siklus, kategori, akun, dan membership sebelum menghapus workspace dalam satu transaksi serializable. Akun pengguna dan ruang pribadi setiap anggota tidak dihapus. Penghapusan akun pengguna, OAuth reauthentication, backup/restore, dan kedaluwarsa cadangan tetap pekerjaan terpisah.

D29 menghasilkan T29: penghapusan akun mandiri hanya tersedia dari ruang pribadi dan memerlukan email akun persis serta autentikasi ulang password. Service mengunci user, menolak bila user masih menjadi Owner ruang bersama, menghapus seluruh data ruang pribadi, menghapus draf privat pada ruang bersama, mencabut membership aktif, membatalkan permintaan transfer menuju user, lalu mengosongkan auth subject, email, dan nama sambil menandai user nonaktif dalam satu transaksi serializable. Transaksi bersama dan membership historis tetap ada agar integritas finansial terjaga dengan identitas anonim. Setelah commit, aplikasi meminta Supabase mencabut seluruh refresh token dan menghapus identitas Auth melalui secret server-only; request aplikasi dengan access token lama tetap ditolak karena mapping user telah dinonaktifkan. Kegagalan cleanup provider diarahkan ke status operasional tertunda tanpa mengaktifkan kembali akun. OAuth reauthentication, backup/restore, penghapusan cadangan, dan prosedur retry cleanup provider tetap pekerjaan deployment.

D30 menghasilkan T30: navigasi utama tetap berisi fitur finansial dan Anggota & akses. Kartu user di bagian bawah sidebar menjadi tombol menu akun yang menampilkan nama/email, tautan Profil & Pengaturan, serta Keluar; pola yang sama tersedia pada sheet mobile. Halaman Pengaturan menampilkan profil akun di atas pengaturan ruang. Nama tampilan diperbarui pada metadata Supabase dan profil aplikasi setelah identitas/membership dibaca ulang. Perubahan password memerlukan password saat ini, password baru berbeda minimal delapan karakter, konfirmasi cocok, lalu global sign-out agar semua sesi login ulang. Email ditampilkan baca saja; alur perubahan email/verifikasi ulang belum termasuk.

D32 menghasilkan T31: build CI tetap tidak membutuhkan credential agar pemeriksaan source dapat berjalan aman, sedangkan readiness runtime diperiksa melalui `/api/health`. Endpoint hanya melaporkan konfigurasi/database `ok`, `failed`, atau `skipped`; nama variabel, host, URL, dan pesan driver tidak dikirim. Security header berlaku global dan CSP dibentuk saat build dari origin Supabase publik, dengan izin minimum untuk blob preview serta Web Worker/WASM OCR lokal. Vercel menjadi baseline hosting terkelola dan proyek Supabase staging harus terpisah; provisioning akun/provider tetap dilakukan pengguna melalui dashboard.

D33 menghasilkan T32: F11 tahap 21 memakai template pemasukan/pengeluaran bulanan dengan nominal integer, akun, kategori, catatan, hari 1–31, dan satu tanggal jatuh tempo berikutnya. Template hanya menghasilkan pengingat; saldo, budget, dashboard, dan laporan baru berubah setelah Owner atau Editor yang berwenang memilih **Catat sekarang**. Pengguna dapat melewati satu kejadian tanpa transaksi. Hari 29–31 dipotong ke akhir bulan dan kembali ke hari aslinya pada bulan berikutnya. Owner dapat mengelola semua template ruang, Editor hanya template buatannya, dan Viewer hanya membaca. Pencatatan serta kemajuan jadwal terjadi atomik dengan kunci unik template/tanggal; akun atau kategori yang masih dipakai template aktif tidak dapat diarsipkan.

D34 menghasilkan T33: F22 memakai field `title` maksimal 100 karakter yang terpisah dari `note`. Kandidat diringkas dari maksimal 100 transaksi terbaru yang sudah dibaca halaman, dibatasi 12 per jenis, lalu maksimal lima kecocokan difilter di browser setelah dua karakter; tidak ada endpoint atau query pada setiap ketikan. Kandidat selalu dibatasi workspace, jenis transaksi, dan kategori aktif. Klik saran hanya mengisi judul serta kategori; nominal, tanggal, dan akun tidak berubah. Transfer boleh menyarankan judul tanpa kategori.

D35 menghasilkan T34: satu komponen input Rupiah memformat digit di browser untuk tiga alur pembentukan transaksi. Nilai yang dikirim ke Server Action tetap string digit mentah agar validasi `bigint`, idempotensi, dan penyimpanan `BIGINT` tidak berubah. Komponen tidak membaca database, tidak memanggil endpoint, dan menolak nilai di atas batas PostgreSQL `BIGINT`.

D36 menghasilkan T35: PWA memakai manifest App Router, ikon standar/maskable, registrasi service worker, dan fallback `/offline`. Service worker memakai network-first hanya untuk navigasi dan hanya melakukan precache atas halaman offline, manifest, serta ikon publik. Respons terautentikasi, RSC, API, transaksi, dashboard, laporan, dan data finansial tidak dimasukkan ke cache. Fase ini tidak memakai IndexedDB, Background Sync, antrean mutasi, push notification, atau penyimpanan transaksi offline.

D37 menghasilkan T36: F15 menyimpan snapshot rekonsiliasi immutable per akun, tanggal, dan pembuat. Saldo catatan dihitung dari saldo awal, transaksi aktif sampai tanggal tersebut, serta penyesuaian rekonsiliasi sebelumnya. Saldo yang cocok menyimpan bukti tanpa mutasi; selisih hanya mengubah saldo setelah Owner/Editor memilih penyesuaian eksplisit. Penyesuaian tidak menjadi pemasukan, pengeluaran, transfer, atau realisasi budget, tetapi tetap terlihat pada riwayat, audit, saldo akun, dan ekspor lengkap ruang. Viewer hanya membaca. Transaksi bertanggal mundur atau koreksi setelah snapshot menandai hasil lama perlu diperiksa kembali. Rekonsiliasi memakai idempotency key dan isolasi workspace; saldo awal tidak ditimpa.

D38 menghasilkan T37: F13 membaca file CSV maksimal 500 KB/300 baris di browser dan tidak menyimpan file mentah. Pengguna memetakan tanggal, judul, catatan, nominal bertanda atau kolom masuk/keluar, akun, serta kategori default. Server memvalidasi ulang setiap baris dan menandai kandidat duplikat dari akun, tanggal, jenis, nominal, serta judul ternormalisasi. Kandidat tidak dipilih otomatis, tetapi dapat dikonfirmasi eksplisit. Commit serializable menyimpan batch audit dan transaksi terpilih dengan idempotensi per batch/nomor baris. Baseline tidak menebak transfer, membuat kategori, atau mengintegrasikan API bank.

## Default kerja, bukan keputusan eksplisit pengguna

Default di bawah cukup untuk menjaga rancangan konsisten. Gunakan selama tidak ada instruksi yang mengganti; jangan berhenti meminta persetujuan ulang pada tiap detail.

| ID | Default | Alasan/batas |
|---|---|---|
| W01 | Web responsif, bahasa Indonesia, IDR tunggal | Konsisten dengan PRD dan mockup |
| W02 | Nama sementara Alokasi; aksen forest; panel radius 16 px | Default mockup, belum keputusan branding permanen |
| W03 | Owner mengelola kategori, budget, dan pengaturan siklus; Editor mencatat dan mengedit milik sendiri; Viewer hanya baca | Menjaga matriks izin PRD |
| W04 | Satu siklus per ruang; default hari 1, pilihan 1–31 | Dana bersama membutuhkan satu periode konsisten meski gajian anggota berbeda |
| W05 | Hari 29–31 dipotong ke hari terakhir bulan bila perlu | Batas berulang deterministik; tidak menggeser karena libur |
| W06 | Digantikan D27: siklus baru berlaku langsung pada periode aktif, dengan histori transisi bila diperlukan | Instruksi eksplisit terbaru pengguna mengungguli default prospektif lama; algoritme di DOMAIN_RULES.md |
| W07 | Satu gambar scan → satu draf pengeluaran; field dan confidence dapat dikoreksi | Tidak mencakup split item, batch OCR, atau deteksi transfer otomatis |
| W08 | Draf scan hanya terlihat pembuat; data transaksi setelah submit mengikuti akses ruang; gambar tidak otomatis dibagikan | Menghindari perluasan visibilitas berkas sensitif |
| W09 | F05 tetap P0; OCR lokal F18 diaktifkan oleh D21; F21 diaktifkan oleh D17 | Upload/storage/provider eksternal tetap menunggu keputusan lifecycle |

## Belum ditentukan

| Keputusan | Kapan dibutuhkan | Aturan sementara |
|---|---|---|
| Region/paket Supabase dan SMTP produksi | Sebelum deployment | Hosting aplikasi memakai baseline Vercel; pilihan region/paket, domain, serta SMTP tetap ditentukan saat provisioning staging/production |
| Provider OCR/vision fallback, biaya, dan consent | Jika OCR lokal tidak memenuhi target akurasi | OCR lokal tetap jalur privat; jangan kirim berkas nyata ke provider tanpa keputusan baru |
| Retensi berkas scan/draf dan data residency | Sebelum upload/storage bukti | Implementasi lokal tidak menyimpan gambar; upload produksi memerlukan kebijakan lifecycle |
| Lampiran bukti permanen pada transaksi | Jika diminta sebagai perluasan F18 | Baseline hanya pratinjau sumber draf; bukan sistem arsip bukti bersama |
| Tanggal rilis F18/F21 dan ukuran tim | Saat penjadwalan implementasi | Tidak membuat janji durasi atau mengaktifkan semua backlog |
| Gajian variabel, periode per akun, atau siklus 14 hari | Jika kebutuhan tersebut muncul | Di luar siklus bulanan per ruang |
| Retensi akun, backup, audit untuk rilis publik | Sebelum produksi | Angka di PRD masih target usulan; harus diwujudkan dalam prosedur nyata |

## Protokol revisi

Tambahkan baris keputusan baru dengan sumber dan tanggal, tandai keputusan lama yang digantikan, lalu perbarui dokumen terdampak. Perubahan pengguna tidak memerlukan konfirmasi ulang hanya karena baseline sebelumnya berbeda. Keputusan implementasi yang reversibel dapat dicatat sebagai default; jangan mengubahnya menjadi kutipan pengguna.
