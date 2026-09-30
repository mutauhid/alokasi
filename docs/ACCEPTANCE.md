# Skenario penerimaan

Ini spesifikasi pengujian, bukan laporan tes yang sudah lulus. Pilih skenario relevan pada fase/perubahan yang dikerjakan. Semua kebutuhan detail mengacu ke PRD dan DOMAIN_RULES.

## P0 — keuangan dan akses

| ID | Skenario | Hasil wajib |
|---|---|---|
| CORE-01 | Saldo awal 1.000.000, pemasukan 500.000, pengeluaran 100.000 | Saldo 1.400.000; pemasukan laporan hanya 500.000 |
| CORE-02 | Transfer 200.000 antara akun dalam satu ruang | Asal −200.000, tujuan +200.000; total dan arus kas tidak berubah |
| CORE-03 | Proses transfer gagal di tengah | Tidak ada mutasi parsial |
| CORE-04 | Simpan transaksi diklik dua kali/retry dengan key sama | Satu transaksi dan satu efek saldo |
| CORE-05 | Ubah tanggal, akun, nominal, kategori, atau hapus transaksi | Semua saldo, budget, laporan, dan cache lama/baru konsisten |
| CORE-06 | Budget 1.000.000, realisasi 800.000/1.000.000/1.100.000 | Hampir habis 80% / habis 100% / terlampaui 110%, sisa boleh negatif |
| CORE-07 | Pengeluaran kategori tanpa budget | Masuk total pengeluaran dan kelompok belum dianggarkan |
| ACL-01 | Pengguna mengakses ruang orang lain melalui ID/API/file/export | Ditolak; tidak membocorkan data |
| ACL-02 | Viewer memanggil API write; Editor mengubah transaksi orang lain | Ditolak walau tombol di UI disembunyikan |
| ACL-03 | Membership dicabut ketika halaman masih terbuka | Permintaan berikutnya ditolak; histori/saldo tetap |
| ACL-04 | Undangan salah email, expired, reused, revoked | Tidak mengaktifkan membership |
| ACL-05 | Pengalihan Owner bersamaan atau Owner mencoba keluar | Tepat satu Owner; tidak ada ruang tanpa Owner |
| ACL-06 | Dua editor mengubah versi yang sama | Konflik terlihat; tidak ada overwrite diam-diam |

## F01 — menu akun dan profil

| ID | Skenario | Hasil wajib |
|---|---|---|
| PROFILE-01 | Kartu user dibuka pada desktop atau mobile | Nama/email, Profil & Pengaturan, dan Keluar dapat dijangkau dengan keyboard |
| PROFILE-02 | Profil dibuka dari ruang pribadi atau bersama | Data akun sama; pengaturan ruang tetap mengikuti ruang aktif dan role terkini |
| PROFILE-03 | Nama tampilan valid diperbarui | Metadata Auth dan profil aplikasi berubah; sidebar serta identitas transaksi berikutnya memakai nama baru |
| PROFILE-04 | Nama kosong/lebih dari 100 karakter atau session bukan user yang sama | Ditolak server tanpa mengubah profil |
| PROFILE-05 | Password saat ini salah, password baru pendek/sama, atau konfirmasi berbeda | Ditolak sebelum password berubah |
| PROFILE-06 | Password saat ini benar dan password baru valid | Password berubah, semua sesi dicabut, dan pengguna diarahkan login kembali |
| PROFILE-07 | Pengguna memilih Keluar dari menu akun | Session browser saat ini berakhir dan halaman login tampil |

## F17 — lifecycle kepemilikan ruang bersama

| ID | Skenario | Hasil wajib |
|---|---|---|
| OWNER-01 | Owner meminta Editor/Viewer aktif menjadi Owner | Permintaan terlihat oleh target; role belum berubah; ruang tetap memiliki satu Owner |
| OWNER-02 | Anggota selain target mencoba menerima | Ditolak tanpa perubahan role |
| OWNER-03 | Target menerima permintaan aktif | Target menjadi Owner, Owner lama menjadi Editor, permintaan dibersihkan secara atomik |
| OWNER-04 | Dua tab menerima permintaan yang sama | Tepat satu berhasil; lainnya konflik; tetap tepat satu Owner |
| OWNER-05 | Owner membatalkan atau target dicabut/keluar | Permintaan dibersihkan; role tidak berubah |
| OWNER-06 | Editor/Viewer keluar | Akses berikutnya ditolak; transaksi, saldo, budget, dan histori tetap |
| OWNER-07 | Owner mencoba keluar | Ditolak sampai kepemilikan dialihkan atau ruang dihapus melalui alur terpisah |

## F10 — ekspor lengkap ruang

| ID | Skenario | Hasil wajib |
|---|---|---|
| EXPORT-01 | Owner mengunduh ekspor ruang | JSON berisi akun, kategori, aturan/periode, budget, dan transaksi dari ruang aktif yang sama |
| EXPORT-02 | Editor/Viewer atau pengguna ruang lain memanggil endpoint langsung | Ditolak server tanpa membocorkan keberadaan atau data ruang |
| EXPORT-03 | Nominal besar, akun/kategori arsip, dan transaksi soft-delete | Nominal tetap integer presisi; histori dan status arsip/hapus tetap tercantum |
| EXPORT-04 | Ekspor diperiksa untuk metadata internal | Tidak memuat credential, auth subject, token undangan, idempotency key/hash, gambar, atau teks OCR mentah |
| EXPORT-05 | Data berubah saat ekspor dibentuk | Seluruh koleksi berasal dari satu snapshot database yang konsisten |

## F10 — penghapusan ruang bersama

| ID | Skenario | Hasil wajib |
|---|---|---|
| DELETE-01 | Owner membuka zona penghapusan | Hitungan data terdampak dan anjuran ekspor terlihat; tombol belum aktif |
| DELETE-02 | Nama ruang berbeda huruf/kapital/spasi | Ditolak; tidak ada data yang terhapus |
| DELETE-03 | Password salah atau session bukan akun Owner | Autentikasi ulang gagal; tidak ada data yang terhapus |
| DELETE-04 | Editor/Viewer atau Owner ruang lain memanggil action | Ditolak server walau payload dan ID valid |
| DELETE-05 | Versi/Owner berubah setelah form dibuka | Konflik; seluruh ruang tetap utuh |
| DELETE-06 | Owner mengonfirmasi nama persis dan password benar | Seluruh data ruang dihapus atomik; akun user dan ruang pribadi anggota tetap |
| DELETE-07 | Request berikutnya memakai ID ruang yang dihapus | Akses ditolak dan ruang tidak muncul pada pemilih |

## F10 — penghapusan akun pengguna

| ID | Skenario | Hasil wajib |
|---|---|---|
| ACCOUNT-01 | Pengguna membuka zona hapus akun dari ruang pribadi | Dampak pada data pribadi dan membership bersama terlihat; tombol belum aktif |
| ACCOUNT-02 | Pengguna masih menjadi Owner ruang bersama | Submit ditolak; user, ruang pribadi, dan seluruh histori tetap utuh |
| ACCOUNT-03 | Email konfirmasi atau password salah | Ditolak sebelum mutasi data |
| ACCOUNT-04 | Pengguna bukan lagi Owner dan mengonfirmasi data persis | Ruang pribadi beserta seluruh anaknya dihapus atomik; membership bersama dicabut |
| ACCOUNT-05 | Pengguna pernah membuat transaksi di ruang bersama | Transaksi dan nominal tetap ada; identitas user menjadi anonim |
| ACCOUNT-06 | User menjadi target pengalihan kepemilikan | Permintaan pengalihan dibatalkan sebelum membership dicabut |
| ACCOUNT-07 | Penghapusan data aplikasi selesai | Refresh token seluruh sesi dicabut dan identitas Supabase Auth dihapus melalui credential server-only |
| ACCOUNT-08 | Cleanup provider gagal setelah commit database | Akun aplikasi tetap nonaktif, request dengan token lama ditolak, dan status cleanup tertunda terlihat tanpa memulihkan data |

## P0 — kategori kustom

| ID | Skenario | Hasil wajib |
|---|---|---|
| CAT-01 | Owner membuat “Hewan peliharaan” dari form | Kategori terpilih; nominal/tanggal/catatan tidak hilang |
| CAT-02 | Buat “ makan ” ketika “Makan” sudah ada pada jenis/ruang sama | Ditolak sebagai duplikat; bukan kategori kedua |
| CAT-03 | Nama sama pada ruang berbeda | Diizinkan dan terisolasi |
| CAT-04 | Nama kosong/lebih dari 50 karakter; jenis tidak sesuai transaksi | Validasi server dan pesan UI jelas |
| CAT-05 | Arsip kategori dengan transaksi dan budget | Histori serta realisasi tetap; tidak tersedia untuk transaksi baru |
| CAT-06 | Nama bertabrakan dengan kategori arsip | Pemulihan ditawarkan kepada Owner; tidak membuat duplikat |
| CAT-07 | Editor/Viewer mencoba membuat kategori via API | Ditolak |
| CAT-08 | Ubah nama kategori terpakai | ID/nominal/relasi tetap; audit tercatat |

## F11 — transaksi berulang

| ID | Skenario | Hasil wajib |
|---|---|---|
| RECUR-01 | Buat template pemasukan/pengeluaran | Template dan pengingat tersimpan; tidak ada transaksi atau perubahan agregat |
| RECUR-02 | Tanggal jatuh tempo tiba lalu pilih Catat sekarang | Tepat satu transaksi pada tanggal jatuh tempo; jadwal maju satu bulan secara atomik |
| RECUR-03 | Double-click, retry, atau dua tab mencatat kejadian sama | Maksimal satu transaksi untuk template/tanggal tersebut |
| RECUR-04 | Pilih Lewati periode | Jadwal maju satu kejadian; tidak ada transaksi |
| RECUR-05 | Hari 31 melewati Jan–Feb–Mar | Jatuh tempo 31 Jan, akhir Februari, lalu kembali 31 Mar |
| RECUR-06 | Beberapa kejadian sudah terlambat | Hanya satu kejadian diproses per tindakan; sisanya tetap terlihat overdue |
| RECUR-07 | Editor mengubah template Owner/Editor lain atau Viewer melakukan mutasi | Ditolak server; Owner tetap dapat mengelola seluruh template ruang |
| RECUR-08 | ID akun/kategori/template berasal dari ruang lain atau sudah arsip | Ditolak tanpa membuat transaksi atau mengubah jadwal |
| RECUR-09 | Arsip akun/kategori yang dipakai template aktif | Ditolak sampai template diubah atau dinonaktifkan |
| RECUR-10 | Ekspor lengkap dan hapus ruang/akun | Export v2 memuat template/link kejadian; cleanup tidak meninggalkan foreign key yatim |
| RECUR-11 | Dashboard dibuka tujuh hari sebelum atau setelah jatuh tempo | Pengingat terlihat dan jelas menyatakan saldo belum berubah |
| RECUR-12 | Pengguna membuka menu Transaksi | Scan struk dan Tambah transaksi menjadi aksi utama; query/list template tidak dimuat pada tampilan Riwayat |
| RECUR-13 | Pengguna membuka tab Pengingat lalu membuat, mengubah, mencatat, melewati, atau menonaktifkan template | Aksi tetap berada di `/transactions/reminders`, menampilkan hasil yang sesuai, dan tab Transaksi tetap aktif |

## F18 — scan draf pengeluaran (saat fase aktif)

| ID | Skenario | Hasil wajib |
|---|---|---|
| OCR-01 | Scan berhasil total 125.000 | Form needs_review; semua agregat tetap seperti sebelum scan |
| OCR-02 | Pengguna koreksi menjadi 120.000 lalu submit | Pengeluaran tepat 120.000; sumber draf terhubung ke satu transaksi |
| OCR-03 | Amount/tanggal tidak terbaca atau ambigu | Field perlu diperiksa, tidak dikarang; submit menunggu validasi |
| OCR-04 | OCR timeout/gagal, pengguna memilih manual | Input dapat dilanjutkan tanpa transaksi duplikat |
| OCR-05 | Batalkan, kemudian callback sukses datang terlambat | Tidak ada posting atau pengaktifan ulang draf |
| OCR-06 | Retry menghasilkan callback lama setelah koreksi manual | Koreksi tidak tertimpa |
| OCR-07 | Double-click, dua tab, atau retry submit draf sama | Maksimal satu transaksi, respons konsisten |
| OCR-08 | Bukti yang sama diunggah kembali | Peringatan kemungkinan duplikat; tidak auto-post/auto-delete |
| OCR-09 | Rekening penerima ada di bukti | Tidak dipilih sebagai akun sumber secara otomatis |
| OCR-10 | Kategori/akun diarsipkan atau membership dicabut sebelum submit | Submit menolak atau meminta perbaikan sesuai masalah |
| OCR-11 | Viewer upload; anggota lain membaca draf/file privat | Ditolak, termasuk URL/file ID langsung |
| OCR-12 | Scan berisi instruksi, link, script, atau teks berbahaya | Diperlakukan sebagai data; tidak menjalankan instruksi/script/link |
| OCR-13 | Format palsu, terlalu besar, tidak didukung, atau gambar rusak | Ditolak aman; pesan dapat dipahami |
| OCR-14 | File expired/batal/submitted sesuai kebijakan retensi final | Cleanup dapat diverifikasi; URL lama tidak memberi akses permanen |
| OCR-15 | Scan tanggal 24 Sep disubmit 26 Sep dengan siklus 25 | Masuk periode 25 Agu–24 Sep, berdasarkan tanggal transaksi |
| OCR-16 | Bukti transfer internal/pemasukan/pending terdeteksi | Peringatan dan jalan batal/manual; tidak diposting otomatis sebagai pengeluaran |
| OCR-17 | Sukses submit di ruang bersama | Field transaksi terlihat sesuai peran; gambar tidak otomatis dibagikan |

## F21 — siklus gajian

| ID | Skenario | Hasil wajib |
|---|---|---|
| PERIOD-01 | Default hari 1 | Perilaku sama dengan bulan kalender |
| PERIOD-02 | Hari 25; transaksi pada 24 dan 25 Sep | Masuk dua periode bersebelahan, tanpa hitung ganda |
| PERIOD-03 | Hari 29, 30, 31 melewati Februari biasa/kabisat | Anchor memakai clamp dari hari asli; tidak drift menjadi tanggal 28 selamanya |
| PERIOD-04 | Hari 31: Jan–Feb–Mar 2026 dan 2028 | Cocok dengan contoh DOMAIN_RULES; tidak ada gap/overlap |
| PERIOD-05 | Hari mulai 0/32/non-integer atau Editor melakukan perubahan | Ditolak server |
| PERIOD-06 | Ubah hari 1→25 pada 27 Sep | Langsung aktif 25 Sep–24 Okt; 1–24 Sep menjadi histori transisi; budget aktif tetap terhubung |
| PERIOD-07 | Ubah hari 25→1 pada 27 Sep | Langsung menjadi transisi 25–30 Sep; reguler berikutnya mulai 1 Okt; histori sebelum 25 Sep tetap |
| PERIOD-08 | Sudah ada budget periode masa depan | Pratinjau/migrasi eksplisit atau penolakan jelas; tidak hilang diam-diam |
| PERIOD-09 | Ubah siklus dua kali pada tanggal yang sama | Versi meningkat, perubahan terakhir aktif, dan tidak ada gap/overlap |
| PERIOD-10 | Dashboard, kategori, budget, laporan, drill-down, CSV | Angka dan tanggal sumber konsisten pada periode yang sama |
| PERIOD-11 | Mengganti periode pada UI | Saldo saat ini tetap; kartu periode berubah |
| PERIOD-12 | Ruang pribadi hari 25; ruang bersama hari 1 | Masing-masing memakai aturannya; cache tidak tertukar |
| PERIOD-13 | Tengah malam lokal berbeda dengan UTC | Penentuan hari ini memakai zona ruang, tanggal historis tetap |
| PERIOD-14 | Filter bebas 10–15 Sep | Hanya memfilter hasil; tidak mengubah siklus atau limit budget |
| PERIOD-15 | Periode transisi lebih pendek | Rentang/label terlihat; tidak otomatis diberi budget penuh/prorata |

## F06–F07 — dashboard dan budget historis

| ID | Skenario | Hasil wajib |
|---|---|---|
| HISTORY-01 | Pilih periode historis pada Dashboard/Budget | Kartu periode dan realisasi berubah; saldo saat ini tetap; ruang lain tidak dapat dipilih lewat ID |
| HISTORY-02 | Enam periode tersimpan berisi pemasukan, pengeluaran, dan transfer | Grafik memakai batas tiap periode; transfer dikecualikan; periode berjalan/transisi berlabel |
| HISTORY-03 | Klik pemasukan, pengeluaran, kategori terbesar, atau lihat semua | Laporan membuka rentang periode dan filter yang menghasilkan angka tersebut |
| HISTORY-04 | Salin sebagian budget periode sebelumnya | Pratinjau terlihat; hanya kategori dipilih dibuat pada periode aktif; sumber tidak berubah |
| HISTORY-05 | Kategori target sudah ada/arsip, retry, sumber/target tidak sah | Tidak ada overwrite atau duplikasi; submit ditolak jelas |
| HISTORY-06 | Buka budget historis sebagai Owner | Limit/realisasi terlihat, tetapi kontrol create/update/delete tidak tersedia dan service menolak form lama |

## UX dan operasional

- Desktop dan mobile minimal 360 px: tidak ada clipping, horizontal scroll yang tidak perlu, atau tombol utama tak terjangkau.
- Keyboard, fokus, label input, kontras, dan informasi status tidak bergantung pada warna.
- Loading/error/empty dibedakan; error tidak menyamar sebagai nol.
- Pergantian ruang saat form berisi input tidak membuang data tanpa keputusan pengguna.
- Ekspor menjaga nominal/karakter dan mencegah formula injection dari teks pengguna.
- Sebelum produksi: uji pemulihan backup, penghapusan akun, lifecycle data/file, dan redaksi log.

## Bukti saat menandai selesai

Cantumkan ID skenario, versi/commit jika tersedia, jenis pengujian, hasil, dan keterbatasan. Tes domain cocok untuk uang/periode; tes integrasi untuk atomisitas, otorisasi, file, dan callback; uji UI untuk alur review dan responsivitas. Jangan mengklaim pengujian produksi hanya dari mockup.

## Hasil bootstrap tahap 1 — 22 September 2026

Lingkungan: Windows, Node 24.11.1, npm 11.6.2. Playwright 1.63.0 memakai Microsoft Edge headless; desktop 1366×960 dan emulasi mobile 360×800. Sumber test: `tests/e2e/foundation.spec.ts`. Belum ada Git commit untuk dijadikan referensi.

| Pemeriksaan | Hasil |
|---|---|
| `npm run lint` | Lulus tanpa warning lint |
| `npm run typecheck` | Lulus |
| `npm run format:check` | Lulus |
| `npm run build` | Lulus, tujuh route aplikasi eksplisit dan metadata ikon |
| `TEST_BROWSER_CHANNEL=msedge npm run test:e2e` (set env sesuai shell) | 10 passed, exit code 0 |
| Render tanpa credential, error runtime, dan overflow | Lulus pada desktop/mobile; screenshot light/dark dihasilkan |
| Navigasi tujuh halaman, pergantian pratinjau ruang, reload | Lulus |
| Tombol fitur belum tersedia dan informasi peran | Lulus; tidak mengklaim izin sebenarnya sudah diterapkan |
| Skip link, fokus keyboard, menu mobile/Escape | Lulus |
| HTTP 404 dan navigasi kembali | Lulus |
| Inspeksi visual screenshot desktop/mobile | Tampilan terbaca dan panel menumpuk tanpa clipping |
| Tautan internal Markdown | Tidak ada tautan rusak |

Keterbatasan: belum menguji autentikasi, PostgreSQL, kalkulasi uang, izin backend, OCR, atau periode gajian. Skenario CORE/ACL/CAT/OCR/PERIOD di atas belum dianggap selesai. Error boundary dan skeleton tersedia, tetapi uji fault-injection/loading lambat belum termasuk smoke suite ini. Mobile adalah emulasi, belum diuji pada perangkat fisik/Safari.

Tooling: pengujian browser terakhir dijalankan di luar sandbox setelah sandbox Windows tersendat saat teardown; suite terakhir selesai normal dengan exit code 0. Pengecualian dukungan ESLint 9 sementara dicatat di TECH_STACK.md dan harus ditinjau sebelum produksi.

## Hasil tahap 2 — dilanjutkan 23 September 2026

Scope: fondasi schema PostgreSQL/Prisma, bukan penyelesaian alur P0. Dua migrasi (`20260922000000_initial`, `20260922000100_domain_constraints`) berhasil diterapkan pada Supabase development PostgreSQL 17.6. Schema `app` memiliki 10 tabel bisnis; schema internal Supabase Auth tidak dimigrasikan.

| Pemeriksaan | Bukti/status |
|---|---|
| Prisma format/validate/generate | Lulus; client 7.10.0 dihasilkan |
| Migrasi awal/status | Dua migrasi telah diterapkan; `db:status` lulus melalui koneksi TLS terverifikasi |
| Constraint PostgreSQL | 24 tes lulus, exit 0; fixture BEGIN/ROLLBACK pada development kosong, tanpa reset/drop |
| Role runtime | Terverifikasi bukan superuser, tidak BYPASSRLS, tidak CREATE pada app/public; 10 tabel bisnis terlihat |
| TLS setelah hardening | Lulus menggunakan CA proyek: koneksi runtime melaporkan `tls=true` dan `tlsVerified=true` |
| Suite integrasi fondasi saat tahap 2 | 24 passed, exit 0, 39,48 detik; termasuk round-trip Prisma BIGINT/DATE dan penolakan akses schema bagi role browser |
| Tes konfigurasi koneksi | 5 passed, exit 0: remote verify-full, local PostgreSQL, CA path, encoding password, redaksi invalid URL |
| Lint, TypeScript, format, build | Lulus setelah konfigurasi ESM/TLS |
| Regresi browser | 10 passed, exit 0, Edge desktop/mobile; 12,5 detik |
| Dependency audit saat instalasi override | 0 vulnerability dilaporkan npm; pengecualian dukungan ESLint tetap berlaku |

Constraint yang diuji meliputi presisi BIGINT, nominal positif, referensi akun/pembuat lintas ruang, kecocokan kategori, bentuk transfer, idempotency key setelah soft-delete, nama kategori arsip, delete kategori terpakai, budget expense/unik, kontinuitas periode, dan Owner ruang pribadi/bersama.

Gate teknis tahap database terpenuhi. Kebijakan exposed schema/Data API pada dashboard Supabase belum diperiksa melalui akses dashboard; `app` tetap tidak diberi izin kepada `anon`/`authenticated`. Ikuti DATABASE_SETUP.md. Role grants bukan RLS end-user atau bukti ACL service.

Pada penutupan tahap 2, auth/onboarding belum diuji. Status terbarunya dicatat pada tahap 3 di bawah. ACL fitur finansial, operasi UI/API, konflik konkurensi, backup/restore, penghapusan lengkap, dan P1 tetap belum selesai.

## Hasil tahap 3 — 23 September 2026

Scope: F01 dan awal F02/F17 untuk identitas serta ruang pribadi. Belum mencakup ruang bersama, invitation, akun keuangan pertama, transaksi, atau budget onboarding.

| Pemeriksaan | Bukti/status |
|---|---|
| Endpoint Supabase Auth | `npm run auth:check` lulus melalui HTTPS; tidak membuat user/mengirim email |
| Validasi auth | 9 tes unit total lulus; mencakup normalisasi registrasi, password/email invalid, open redirect, dan same-origin |
| Provisioning | 25 tes PostgreSQL total lulus; retry menghasilkan satu profil/ruang/Owner, 8 kategori dan 1 periode |
| Kebersihan database | Setelah suite: seluruh 10 tabel aplikasi berjumlah 0; fixture tidak tersisa |
| Browser auth | 10 passed pada desktop/mobile: redirect halaman terlindungi, form/tautan, respons recovery generik, CSRF lintas origin, dan 404 |
| Build/lint/type | Build produksi dengan 22 route/page dan Proxy lulus; lint dan TypeScript lulus |

Keamanan yang dibuktikan: protected route tidak terbuka tanpa claims; mutation auth menolak Origin berbeda; `next` eksternal ditolak; respons recovery tidak memantulkan email; callback memerlukan code/token hash valid; session/user diverifikasi ulang pada server; browser roles tetap tidak dapat mengakses schema `app`.

Belum diuji end-to-end: tautan verifikasi/recovery yang kedaluwarsa atau digunakan ulang, rotasi cookie melalui kedaluwarsa token, SMTP produksi, dan seluruh lifecycle session. Jangan mengklaim F01 siap produksi hanya dari smoke manual development.

### Tambahan smoke manual auth — 23 September 2026

Pengguna melaporkan register, login, dan forgot password berhasil pada proyek development. Konfirmasi ini membuktikan jalur dasar pada konfigurasi lokal saat ini, tetapi belum mencakup SMTP produksi, tautan kedaluwarsa/reuse, revoke session, atau penghapusan akun.

## Hasil tahap 4 — akun dan kategori, 23 September 2026

Scope: implementasi awal F02/F03/F05 untuk ruang pribadi Owner.

| Pemeriksaan | Bukti/status |
|---|---|
| Domain uang dan nama | 14 unit test total lulus; mencakup BIGINT, normalisasi nama, serta saldo income/expense/transfer |
| Build/lint/type/format | Lulus |
| Regresi browser publik/auth | 10 passed pada Edge desktop/mobile; redirect halaman terlindungi, auth, CSRF, dan 404 tetap lulus |
| UI terautentikasi | Halaman Akun dan Pengaturan memuat data nyata; desktop 1363 px dan mobile 345 px tidak memiliki overflow horizontal |
| Mutasi akun/kategori | Test integrasi lulus pada database khusus untuk scope workspace, create/rename/archive, saldo, konflik versi, dan audit metadata |

Suite khusus kini memberi bukti service dan constraint tanpa memakai database development pengguna. Skenario kategori yang belum dinyatakan oleh assertion spesifik, ACL peran Editor/Viewer, dan konkurensi nyata tetap terbuka.

Pengguna kemudian melaporkan alur akun dan kategori sudah bisa. Ini menjadi smoke manual UI development; suite database khusus menambah bukti sistematis untuk isolasi ruang, mutasi, konflik versi, dan audit.

## Hasil tahap 5 — transaksi inti, 23 September 2026

Scope: implementasi F04 pada ruang pribadi Owner.

| Pemeriksaan | Bukti/status |
|---|---|
| Domain transaksi | 15 unit test total lulus; integer rupiah, tanggal kalender, normalisasi input, saldo income/expense/transfer |
| Integritas service | Lulus pada database khusus untuk scope ruang, idempotensi payload, create/update/delete, saldo, dan audit |
| Regresi browser | 10 passed pada Edge desktop/mobile |
| UI terautentikasi | Form membaca akun/kategori development; desktop dan mobile 360 px tanpa overflow; tidak membuat transaksi contoh |
| Build/lint/type/format | Lulus |

Suite PostgreSQL service kini memberi bukti untuk jalur transaksi utama dan retry idempoten. Matriks Owner/Editor/Viewer, konkurensi simultan, dan skenario acceptance yang tidak memiliki assertion eksplisit tetap terbuka. Bukti awal CORE-06–CORE-07 dicatat pada tahap 6 di bawah.

Pengguna melaporkan alur transaksi sudah bisa pada 24 September 2026. Ini memenuhi smoke manual jalur utama; konflik versi, retry idempoten, dan penolakan mutasi dengan workspace acak juga lulus pada suite database khusus.

## Hasil tahap 6 — budget dan dashboard, 24 September 2026

Scope: implementasi awal F06/F07 pada ruang pribadi Owner dan periode kalender aktif.

| Pemeriksaan | Bukti/status |
|---|---|
| Domain budget | 20 unit test total lulus; termasuk validasi limit integer serta status 80%/100%/110% |
| Integritas service | Lulus pada database khusus untuk scope ruang, create/update/delete, realisasi, sisa, pengeluaran tanpa budget, dan audit |
| Konsistensi dashboard | UI development menampilkan saldo Rp1.050.000, pemasukan Rp150.000, pengeluaran Rp100.000, dan arus kas bersih Rp50.000 dari akun/transaksi yang sama |
| Budget tanpa alokasi | UI menampilkan pengeluaran Rp100.000 sebagai “Belum dianggarkan” pada periode 1–30 September 2026 |
| Regresi browser | 10 passed pada Edge desktop/mobile |
| Build/lint/type/format | Lulus |

CORE-06 diuji pada fungsi domain untuk ambang status; CRUD budget, realisasi, sisa, dan pengeluaran tanpa budget juga lulus melalui PostgreSQL. Assertion service belum mengulang nominal ambang 800.000/1.000.000/1.100.000. CORE-07 terbukti read-only pada data development. CRUD budget belum diubah melalui UI oleh agent agar tidak memodifikasi data pengguna; pengguna masih perlu smoke manual create/update/delete. Laporan, filter, ekspor, siklus gajian, dan ruang bersama belum termasuk tahap ini.

## Hasil tahap 7 — laporan dan ekspor transaksi, 24 September 2026

Scope: F08 dan ekspor transaksi pada F10 untuk ruang pribadi Owner.

| Pemeriksaan | Bukti/status |
|---|---|
| Filter dan tanggal | Unit test memverifikasi rentang 10–15 September menjadi batas akhir eksklusif 16 September; input tanggal/enum/UUID tidak valid kembali aman ke periode aktif |
| Konsistensi ringkasan | Pada periode aktif, UI development menampilkan pemasukan Rp150.000, pengeluaran Rp150.000, arus kas bersih Rp0, tiga transaksi sumber, dan aktual budget Belanja Rp150.000 dari Rp500.000 |
| Filter gabungan | Filter 24 September + pengeluaran + pencarian “posh” menghasilkan satu transaksi Rp50.000, pengeluaran kategori Belanja Rp50.000, dan arus kas −Rp50.000 |
| CSV | Unit test memverifikasi UTF-8 BOM, karakter/quote, dan formula injection; browser menerima unduhan dengan filter aktif |
| Responsif | Laporan pada viewport 360 px memiliki `scrollWidth` 345 untuk `innerWidth` 360; tidak ada overflow horizontal |
| Build/lint/type/format | Lulus; 31 unit test total lulus |

PERIOD-14 dan jalur utama laporan/filter terbukti. PERIOD-10 mendapat bukti konsistensi read-only pada periode kalender aktif, tetapi siklus gajian belum aktif. ACL ekspor lintas pengguna, data berskala besar, dan ekspor lengkap ruang tetap belum diuji karena ruang bersama belum tersedia.

## Verifikasi database test khusus — 24 September 2026

Database test terpisah dikonfigurasi melalui Supabase Session pooler dan `TEST_DATABASE_URL`. Migrasi yang sama dengan development berhasil diterapkan; pemeriksaan koneksi melaporkan PostgreSQL 17.6, 11 tabel pada schema `app`, serta TLS aktif dan terverifikasi.

| Pemeriksaan | Bukti/status |
|---|---|
| Migrasi database test | `npm run db:migrate:test` lulus |
| Koneksi dan schema | `npm run db:check:test` lulus; mode Session pooler, 11 tabel aplikasi |
| Suite PostgreSQL lengkap | `npm run test:db` lulus: 28 passed, 0 failed, exit 0, 158,76 detik pada pemeriksaan terbaru |
| Cakupan tambahan | Service akun, kategori, transaksi, budget, ruang bersama, invitation, membership, dan siklus gajian; scope workspace; idempotensi; optimistic version; audit; provisioning; constraint; BIGINT/DATE; penolakan role browser |

Latensi pooler remote memerlukan toleransi perolehan koneksi untuk interactive transaction. Prisma menunggu maksimal 15 detik memperoleh koneksi dan 30 detik menyelesaikan transaksi; skenario service menyeluruh memiliki batas test 60–90 detik. Ini tidak membuktikan performa produksi, race condition simultan penuh, backup/restore, atau lifecycle auth/SMTP produksi.

## Hasil tahap 8 — ruang bersama dan peran, 24 September 2026

Scope: irisan utama F17 dan kontrol akses F10. Ruang pribadi tetap hanya memiliki Owner tunggal; ruang bersama memakai membership aktif pada setiap request.

| Pemeriksaan | Bukti/status |
|---|---|
| Pemilihan dan isolasi ruang | Dashboard lokal memuat pemilih ruang nyata; navigasi membawa `workspaceId`; resolver server menolak ID tanpa membership aktif |
| Pembuatan ruang | Service membuat ruang shared, Owner, delapan kategori, periode aktif, dan audit dalam satu transaksi |
| Undangan | Token acak hanya disimpan sebagai SHA-256, terikat email terverifikasi, kedaluwarsa tujuh hari, dapat dicabut, dan acceptance diklaim atomik sekali pakai |
| Peran transaksi | Test integrasi: Editor dapat membuat transaksi sendiri dan ditolak menghapus transaksi Owner; Viewer ditolak membuat transaksi |
| Pencabutan | Test integrasi: setelah membership dicabut, resolver menolak akses pada permintaan berikutnya |
| Optimistic conflict | Perubahan peran dan pencabutan memakai `membership.version`; transaksi tetap memakai version check |
| Audit/identitas | UI transaksi bersama menampilkan pencatat; halaman Anggota menampilkan aktor, tindakan, objek, dan waktu |
| Verifikasi | Skenario F17 fokus lulus setelah claim token atomik; suite penuh 27/27, unit 34/34, lint/type/format lulus |

ACL-01–ACL-03 mendapat bukti implementasi dan test pada cakupan di atas. ACL-04 terbukti untuk token yang dipakai ulang; jalur salah email, kedaluwarsa, dan dicabut sudah ditangani kode tetapi belum seluruhnya dijalankan sebagai test integrasi. Catatan ini merekam tahap 8; transfer kepemilikan/keluar tersedia sejak tahap 13 dan penghapusan ruang sejak tahap 16. ACL-06 memakai optimistic version pada membership dan transaksi, tetapi race dua Editor belum disimulasikan. Pengiriman email otomatis belum tersedia. Ekspor CSV sudah menolak Viewer di server, tetapi kombinasi Owner/Editor lintas dua akun belum diuji end-to-end.

## Hasil tahap 9 — siklus gajian, 24 September 2026

Scope: F21 inti untuk ruang pribadi dan bersama; satu aturan tanggal mulai per ruang yang hanya dapat diubah Owner.

Catatan: bukti prospektif PERIOD-06/07/09 di bawah merekam implementasi awal dan telah digantikan oleh keputusan langsung berlaku pada tahap 15. Aturan dan acceptance aktif berada pada tabel F21 di atas serta hasil tahap 15.

| Pemeriksaan | Bukti/status |
|---|---|
| PERIOD-01–PERIOD-04 | Unit test membuktikan tanggal 1, boundary 24/25, clamp Februari biasa/kabisat, dan perhitungan hari 31 tanpa drift |
| PERIOD-05 | Schema server menolak 0, 32, dan non-integer; action memerlukan role Owner. Jalur Editor belum dijalankan melalui browser |
| PERIOD-06–PERIOD-07 | Preview/unit test membuktikan transisi 1–24 Oktober untuk perubahan 1→25 dan tanpa transisi kosong jika boundary sudah anchor |
| PERIOD-08 | Test PostgreSQL membuktikan perubahan ditolak jika periode masa depan telah memiliki budget |
| PERIOD-09 | Test PostgreSQL membuktikan rencana 25 diganti atomik menjadi 20, versi meningkat 2→3, dan periode aktif tetap memakai versi 1 |
| Resolver bersama | Dashboard, Budget, Laporan, ekspor CSV default, dan label shell memakai `BudgetPeriod`/batas tanggal yang sama |
| Migrasi | Migrasi `20260924000000_payday_cycles` lulus pada development dan database test tanpa menulis ulang batas historis |
| Verifikasi | 42 unit test dan 28 test PostgreSQL lulus; lint, TypeScript, Prisma validate/generate, dan format lulus |

PERIOD-10–PERIOD-13 dan PERIOD-15 baru mendapat bukti dari jalur kode/komponen, belum semua memiliki skenario end-to-end. Pemilih periode historis dan grafik enam periode belum tersedia. UI memberi preview sebelum submit, menandai transisi pada label aktif, dan tidak menyalin/prorata budget secara otomatis.

## Optimasi latency navigasi — 25 September 2026

| Pemeriksaan | Bukti/status |
|---|---|
| Provisioning jalur normal | Context halaman tidak lagi menjalankan upsert user/workspace/kategori/siklus/periode bila ruang pribadi sudah tersedia |
| Otorisasi | Membership aktif tetap dibaca ulang setiap request; ID workspace dari browser tetap diverifikasi dan `getUser()` tetap digunakan |
| Periode | Query `ensurePeriod` dengan workspace/tanggal sama dideduplikasi selama satu render Server Component |
| Idempotensi transaksi | Jalur create normal menghapus satu pre-read; retry key yang sama dan payload berbeda tetap dilindungi constraint/hash serta test integrasi |
| Regresi | 42 unit test, 28 test PostgreSQL, lint, TypeScript, dan format lulus |

Request RSC terautentikasi setelah optimasi belum diukur otomatis karena browser agent tidak memiliki session pengguna. Bandingkan kunjungan kedua tiap halaman pada `next dev`, lalu ukur build produksi untuk memisahkan kompilasi development dari latency Supabase.

## Hasil tahap 10 — prototipe F18, 25 September 2026

| Pemeriksaan | Bukti/status |
|---|---|
| OCR-01 | Test PostgreSQL membuktikan draf fixture Rp125.000 berstatus `needs_review` dan jumlah transaksi tetap nol |
| OCR-02 | Test PostgreSQL mengoreksi menjadi Rp120.000; submit menghasilkan satu pengeluaran dan menautkan `submitted_transaction_id` |
| OCR-07 | Retry submit draf yang sama mengembalikan ID transaksi sama; jumlah transaksi tetap satu |
| OCR-09 | Form akun dimulai kosong dan wajib dipilih pengguna; fixture tidak menyarankan akun |
| OCR-10 | Submit memvalidasi ulang membership aktif, akun aktif, kategori aktif, tanggal, dan workspace di dalam transaksi database |
| OCR-11 | Viewer ditolak service; setiap operasi draf dibatasi `workspace_id` serta `created_by` |
| Batal | Test membuktikan draf menjadi `cancelled` dan tidak menambah transaksi |
| File lokal | UI menerima JPEG/PNG/WebP maksimal 10 MB untuk blob preview lokal; input file tidak memiliki nama form sehingga tidak dikirim ke server |
| Migrasi | `20260925000000_receipt_draft_fixture` lulus pada development dan database test |
| Verifikasi | 49 unit test dan 29 test PostgreSQL lulus; lint, TypeScript, Prisma validate/generate, dan format diperiksa pada irisan ini |

OCR-03 baru mendapat indikator confidence pada UI, belum hasil OCR nyata. OCR-04–OCR-06, OCR-08, OCR-12–OCR-14, callback terlambat, deteksi duplikat berkas, storage privat, dan cleanup lifecycle belum diuji karena prototipe sengaja tidak mengunggah atau memproses berkas. Responsivitas dan alur browser terautentikasi memerlukan smoke manual atau E2E dengan session pengguna.

## Hasil tahap 11 — OCR lokal, 26 September 2026

| Pemeriksaan | Bukti/status |
|---|---|
| OCR-01–OCR-03 | Unit test parser membaca total berlabel, tanggal, penerima, dan membiarkan field kosong bila tidak terbaca; service menyimpan sebagai `needs_review` tanpa transaksi |
| Total transfer | Fixture Livin memilih `Total Transaksi Rp502.500`, bukan `Nominal Transfer Rp500.000` atau `Biaya Rp2.500` |
| Bank/metode | Fixture Livin mendeteksi Bank Mandiri dan BI-FAST walau rekening penerima menyebut BCA |
| QRIS | Fixture BCA mobile mendeteksi QRIS, BCA, merchant, tanggal, dan Rp47.500 |
| Separator rupiah | Unit test membuktikan `25.000`, `25,000`, `25,000.00`, dan `25.000,00` menjadi integer 25000 |
| Konflik institusi | Fixture BCA memilih BCA dari header/badan hukum, bukan Bank Tujuan Mandiri meski label dan nilainya terpisah baris; “Pemindahan Dana” tidak dianggap merek DANA |
| OCR-07 | Test PostgreSQL fokus menjalankan dua submit paralel; satu transaksi dan respons ID sama |
| OCR-09 | OCR tidak mengisi akun sumber; form selalu memerlukan pilihan pengguna |
| OCR-10–OCR-11 | Membership, pembuat draf, workspace, akun, dan kategori divalidasi ulang server seperti tahap 10 |
| OCR-12 | Teks mentah hanya diperlakukan sebagai input parser lokal, dibatasi panjang, tidak dijalankan dan tidak dikirim ke backend |
| OCR-13 | UI menolak tipe/ukuran yang tidak didukung; error OCR memberi jalur input manual. Validasi file server belum berlaku karena file tidak diunggah |
| OCR-16 | Bukti transfer diberi peringatan eksplisit untuk memakai alur Transfer bila antar akun sendiri |
| Privasi | Worker/core/model berasal dari origin aplikasi; gambar dan teks mentah tidak masuk request server, database, log, atau storage |
| Migrasi | `20260925010000_local_receipt_ocr` berhasil pada development dan database test |
| Verifikasi | 60 unit test, 29 test PostgreSQL, lint, TypeScript, Prisma validate/generate, format, dan build produksi lulus |

Belum ada corpus pengujian lintas bank/perangkat, klasifikasi logo berbasis piksel, deteksi duplikat gambar, atau E2E browser terautentikasi. OCR-05, OCR-06, OCR-08, OCR-14, callback provider, dan lifecycle file tetap belum berlaku karena tidak ada upload/provider/storage. Hasil bank, nominal, dan metode merupakan saran OCR yang wajib diperiksa pengguna.

## Hasil tahap 12 — dashboard dan budget historis, 27 September 2026

| Pemeriksaan | Bukti/status |
|---|---|
| HISTORY-01/HISTORY-06 | Resolver hanya mengembalikan periode tersimpan workspace hingga aktif; histori ditampilkan baca saja dan mutasi budget dibatasi lagi ke `period_id` aktif pada service |
| HISTORY-02 | Unit test mengelompokkan transaksi pada batas awal inklusif/akhir eksklusif dan mengecualikan transfer; UI menampilkan maksimal enam periode dengan label berjalan/transisi |
| HISTORY-03 | Browser terautentikasi memperlihatkan tautan laporan dengan `from`, `to`, `type`, serta `categoryId` yang sesuai periode aktif |
| HISTORY-04/HISTORY-05 | Test PostgreSQL dua periode membuktikan pratinjau, salin selektif Rp750.000, sumber tetap, target tepat satu, dan retry ditolak `BUDGET_COPY_CONFLICT` |
| PERIOD-10/PERIOD-11 | Dashboard dan Budget memakai pilihan `period_id` yang sama; total saldo berasal dari seluruh transaksi akun dan tidak dihitung ulang menurut periode |
| Responsif | Dashboard dan Budget diperiksa pada 360 px: `innerWidth` 360 dan `scrollWidth` 345; batang grafik dibatasi 128 px di dalam kontainer |
| Verifikasi | 63 unit test, 30 test PostgreSQL, lint, TypeScript, format, dan build produksi lulus |

Data development yang diperiksa baru memiliki satu periode. Pergantian ke histori dan kartu salin tidak dipicu pada data pengguna; perilaku dua periode dibuktikan dengan fixture database yang seluruh perubahannya dibersihkan setelah tes.

## Hasil tahap 13 — lifecycle ruang bersama, 27 September 2026

| Pemeriksaan | Bukti/status |
|---|---|
| OWNER-01/OWNER-05 | Test PostgreSQL membuktikan Owner membuat, membatalkan, dan membuat ulang permintaan tanpa mengubah role sebelum penerimaan |
| OWNER-03/ACL-05 | Penerimaan atomik menghasilkan penerima sebagai Owner, Owner lama sebagai Editor, state permintaan kosong, dan tepat satu Owner aktif |
| OWNER-04/ACL-06 | Dua penerimaan paralel dengan versi sama menghasilkan satu sukses dan satu `OWNERSHIP_TRANSFER_CONFLICT` |
| OWNER-06 | Mantan Owner yang telah menjadi Editor dapat keluar; request akses berikutnya ditolak dan audit `left` tersimpan |
| OWNER-07 | Service menolak Owner keluar dengan `OWNER_TRANSFER_REQUIRED`, baik sebelum maupun setelah menjadi Owner baru |
| Isolasi/otorisasi | Target harus membership aktif pada workspace yang sama; request, cancel, accept, revoke, dan leave mengunci workspace serta memvalidasi role server |
| Migrasi | `20260927000000_ownership_transfer` berhasil pada development dan test; foreign key memastikan calon Owner berasal dari workspace yang sama |
| Verifikasi | 31 test PostgreSQL, Prisma validate/generate, lint, TypeScript, format, dan build produksi lulus |

OWNER-02 ditegakkan oleh filter `user_id` target pada service, tetapi belum memiliki akun ketiga dalam test integrasi. Browser lintas dua akun dan responsivitas kartu baru belum diuji karena session pengguna kedua tidak tersedia pada agent.

## Hasil tahap 14 — ekspor lengkap ruang, 27 September 2026

| Pemeriksaan | Bukti/status |
|---|---|
| EXPORT-01/EXPORT-03 | Test PostgreSQL fixture memuat akun, kategori, periode, budget Rp20.000, dua transaksi Rp1.000, lalu memverifikasi akun/kategori arsip dan transaksi soft-delete tetap tersedia |
| EXPORT-02 | Route Handler memakai identitas Supabase terverifikasi dan `requireWorkspaceAccess(..., ["owner"])`; UI hanya menampilkan unduhan kepada Owner. Browser Editor/Viewer belum dijalankan |
| EXPORT-04 | Test memastikan dokumen tidak memuat idempotency key `same-income-request` atau field `requestHash`; query juga tidak memilih token/auth subject/draf OCR |
| EXPORT-05 | Service membentuk seluruh koleksi dalam transaksi `Repeatable Read` |
| Respons HTTP | Attachment `application/json`, `private, no-store`, dan `X-Content-Type-Options: nosniff` |
| Verifikasi | Unit 63/63, test fokus PostgreSQL 1/1, suite PostgreSQL 31/31, lint, TypeScript, format, dan build produksi lulus; endpoint terautentikasi merespons HTTP 200 dua kali pada session Owner |

Dataset besar dan pemulihan dari berkas belum diuji. Ekspor bukan backup operasional dan belum mencakup audit log, invitation, receipt draft, atau berkas gambar. Browser automation tidak menangkap event file karena kontrol tab timeout, meski log server membuktikan dua respons endpoint sukses; unduhan manual masih perlu diperiksa pengguna.

## Hasil tahap 15 — siklus budget langsung berlaku, 27 September 2026

| Pemeriksaan | Bukti/status |
|---|---|
| PERIOD-06 | Unit test mempratinjau perubahan 1→25 pada 27 September menjadi aktif 25 Sep–24 Okt serta histori transisi 1–24 Sep |
| PERIOD-07 | Unit test mempratinjau perubahan 25→1 menjadi periode aktif transisi 25–30 Sep dan reguler berikutnya 1–31 Okt |
| Budget aktif | Test PostgreSQL mempertahankan ID periode dan relasi budget Rp500.000 setelah batas aktif direbasis dua kali |
| PERIOD-08 | Test PostgreSQL membuat periode masa depan berbudget dan membuktikan perubahan berikutnya ditolak `CYCLE_FUTURE_BUDGETS` |
| PERIOD-09 | Test PostgreSQL menerapkan perubahan tanggal 25 lalu 20 pada hari yang sama; versi 1→2→3, versi terakhir menjadi aktif, histori bersebelahan tanpa gap/overlap, dan dua audit `applied` tersimpan |
| Otorisasi/konkurensi | Server Action tetap memerlukan Owner; service memeriksa versi terbaru, mengunci workspace, dan memakai transaksi serializable |
| Migrasi | `20260927010000_immediate_payday_cycles` menghapus keunikan `(workspace_id,effective_date)`; keunikan `(workspace_id,version)` tetap menjadi kunci versi |
| Verifikasi | Migrasi development/test, 63 unit test, 31 test PostgreSQL, Prisma validate/generate, lint, TypeScript, format, dan build produksi lulus |

Pengujian UI tidak menekan tombol simpan pada ruang pengguna agar data finansialnya tidak diubah oleh agent. Perubahan agregat browser setelah submit tetap memerlukan smoke manual pengguna.

## Hasil tahap 16 — penghapusan ruang bersama, 28 September 2026

| Pemeriksaan | Bukti/status |
|---|---|
| DELETE-01 | UI Owner menampilkan hitungan keanggotaan, akun, kategori, transaksi, budget, dan draf serta anjuran ekspor; tombol disabled sampai nama persis dan password terisi |
| DELETE-02 | Test PostgreSQL membuktikan perbedaan kapital pada nama ditolak `WORKSPACE_DELETE_NAME_MISMATCH` dan ruang tetap ada |
| DELETE-03 | Server Action memanggil Supabase `signInWithPassword` untuk email session yang sama dan memeriksa subject user; password tidak diteruskan ke service/database/log. Password salah belum diuji otomatis terhadap Auth remote |
| DELETE-04 | Test PostgreSQL membuktikan akses Editor ditolak `WORKSPACE_DELETE_NOT_ALLOWED`; action juga meminta ulang membership Owner dari session terverifikasi |
| DELETE-05 | Service mengunci workspace lalu mensyaratkan versi, tipe shared, dan Owner aktif; konflik membatalkan transaksi. Race penghapusan nyata dua koneksi belum disimulasikan |
| DELETE-06 | Fixture berisi dua anggota, akun, delapan kategori, transaksi Rp25.000, budget, draf, invitation, periode, siklus, dan audit dihapus atomik; kedua user tetap ada |
| DELETE-07 | Workspace dan seluruh data anak berjumlah nol setelah commit; resolver akses tidak lagi dapat menemukan membership. Browser setelah penghapusan belum dijalankan agar data pengguna tidak diubah |
| Verifikasi | 63 unit test, 32 test PostgreSQL, lint, TypeScript, format, dan build produksi lulus |

Tidak ada ruang development pengguna yang dihapus saat verifikasi. Autentikasi ulang password dan redirect sukses perlu smoke manual pada ruang uji yang memang boleh dihapus. OAuth reauthentication, penghapusan akun pengguna, pencabutan seluruh session, backup/restore, serta lifecycle cadangan belum termasuk tahap ini.

## Hasil tahap 17 — penghapusan akun pengguna, 28 September 2026

| Pemeriksaan | Bukti/status |
|---|---|
| ACCOUNT-01 | UI ruang pribadi menampilkan hitungan transaksi, budget, akun, dan membership bersama; tombol menunggu email persis dan password |
| ACCOUNT-02 | Test PostgreSQL membuktikan user yang masih menjadi Owner ditolak `ACCOUNT_OWNS_SHARED_WORKSPACE` tanpa menghapus data |
| ACCOUNT-03 | Zod memvalidasi dan menormalisasi email tanpa mengubah password; Server Action melakukan `signInWithPassword` untuk subject session yang sama sebelum mutasi. Password salah belum diuji otomatis terhadap Auth remote |
| ACCOUNT-04 | Test PostgreSQL membuktikan ruang pribadi hilang, membership Editor bersama menjadi `revoked`, dan user tetap sebagai tombstone nonaktif |
| ACCOUNT-05 | Transaksi bersama Rp25.000 beserta relasi pencatat tetap ada setelah email, nama, dan auth subject user dikosongkan |
| ACCOUNT-06 | Permintaan transfer menuju membership user dibersihkan; draf scan privat user di ruang bersama dihapus |
| ACCOUNT-07 | Setelah commit database, Server Action menjalankan global sign-out dan Auth Admin `deleteUser`; memerlukan `SUPABASE_SECRET_KEY` server-only |
| ACCOUNT-08 | Mapping aplikasi dinonaktifkan sebelum cleanup provider sehingga access token lama tidak lagi memperoleh workspace; kegagalan provider diarahkan ke status cleanup tertunda |
| Verifikasi | 65 unit test, test fokus PostgreSQL 1/1, suite PostgreSQL 33/33, lint, TypeScript, format, dan build produksi lulus |

Tidak ada akun development atau identitas Supabase yang dihapus saat verifikasi. Submit UI, autentikasi ulang nyata, revoke multi-session, dan penghapusan Auth perlu smoke manual dengan akun uji yang memang boleh dibuang setelah secret server dikonfigurasi. OAuth reauthentication, retry operasional cleanup Auth, backup/restore, dan penghapusan cadangan belum diuji.

## Hasil tahap 18 — menu akun dan profil, 28 September 2026

| Pemeriksaan | Bukti/status |
|---|---|
| PROFILE-01 | Komponen menu akun dipasang pada sidebar desktop dan sheet mobile; menu menampilkan nama/email, Profil & Pengaturan, dan Keluar serta mendukung Escape/outside click |
| PROFILE-02 | Tautan mempertahankan `workspaceId`; halaman memisahkan kartu profil akun dari kategori, siklus, ekspor, dan kontrol ruang |
| PROFILE-03/04 | Unit test memverifikasi normalisasi nama; test PostgreSQL membuktikan update hanya berhasil untuk actor/auth subject aktif yang sama |
| PROFILE-05 | Unit test memverifikasi password minimal delapan karakter, konfirmasi cocok, dan berbeda dari password saat ini; action mengautentikasi ulang sebelum provider mutation |
| PROFILE-06 | Setelah `updateUser` berhasil, action menjalankan global sign-out dan mengarahkan ke login. Perubahan password nyata tidak dijalankan otomatis agar credential pengguna tidak diubah |
| PROFILE-07 | Form Keluar lama di footer dihapus; menu akun memakai route sign-out same-origin yang sudah tersedia |
| Verifikasi | 67 unit test, test fokus PostgreSQL 1/1 dari 33, lint, TypeScript, format, dan build produksi lulus |

Browser automation terautentikasi tidak dijalankan karena kontrol browser lokal tidak tersedia pada sesi ini. Tampilan desktop/mobile dan perubahan password nyata masih memerlukan smoke manual pengguna; tidak ada profil, password, atau session development yang diubah saat verifikasi.

## Hasil tahap 19 — Git repository dan CI, 28 September 2026

| Pemeriksaan | Bukti/status |
|---|---|
| Repo lokal | Repository diinisialisasi pada branch `main`; file environment, sertifikat, hasil build, dan laporan test tetap diabaikan Git |
| Quality CI | Run GitHub pertama gagal pada `npm ci` karena entri optional dependency Linux tidak lengkap. Lockfile bersih sekarang lulus simulasi `npm ci` Linux, instalasi bersih Windows, format, lint, TypeScript, 67 unit test, dan build produksi; rerun GitHub menunggu PR |
| Database CI | Run pertama berhenti pada akar masalah lockfile yang sama sebelum migrasi. PostgreSQL 17 service, tujuh migrasi, dan 33 integration test akan diverifikasi oleh rerun GitHub setelah PR perbaikan |
| Batas secret | Workflow tidak memerlukan `DATABASE_URL`, `DIRECT_URL`, Supabase key, atau sertifikat milik development/production |
| Remote | `origin/main` tersedia pada repository GitHub, branch protection telah diaktifkan pengguna, dan panduan alur PR tersedia |

GitHub-hosted runner awal membuktikan checkout dan setup Node, lalu gagal pada lockfile sebelum test. Perbaikan di-merge melalui PR #1 sebagai commit `9a34609`; job Quality dan Database kemudian lulus. E2E terautentikasi, deploy, SMTP, backup/restore, dan observability eksternal belum menjadi bagian workflow ini.

## Hasil tahap 20 — kesiapan staging, 28 September 2026

| Pemeriksaan | Bukti/status |
|---|---|
| Environment | Unit test menerima konfigurasi HTTPS lengkap, menolak URL/path/protokol tidak valid, dan hanya melaporkan nama variabel yang gagal tanpa nilai credential |
| Health endpoint | Production server mengembalikan HTTP 503 generik saat konfigurasi belum lengkap; dengan konfigurasi lengkap dan akses jaringan, `/api/health` mengembalikan HTTP 200 serta pemeriksaan database `ok` |
| Proxy | `/api/health` dilewati oleh refresh Auth sehingga probe tidak bergantung pada cookie atau round-trip Supabase Auth |
| Pool serverless | Unit test membuktikan instance Vercel memakai maksimum satu koneksi aplikasi, sementara proses lokal tetap memakai maksimum lima |
| Header keamanan | Respons production memuat CSP, HSTS, COOP/CORP, `nosniff`, frame deny, referrer policy, dan permissions policy; CSP mengizinkan origin Supabase terkonfigurasi serta blob/WASM worker OCR lokal |
| Logging | Unit test membuktikan pesan Error, email, token, dan context sensitif tidak tercetak; log menyimpan event, nama error, dan kode teknis aman dalam JSON |
| Dokumentasi | Runbook memisahkan langkah repository dari pembuatan proyek Supabase, impor Vercel, environment, callback Auth, SMTP, dan smoke test yang dilakukan pengguna |
| Verifikasi | Format, lint, TypeScript, build produksi, dan 72 unit test lulus. Sepuluh skenario Playwright desktop/mobile melaporkan lulus; proses wrapper Windows tidak menutup otomatis setelah hasil sehingga dihentikan manual |

Health check database awal memakai koneksi development hanya untuk verifikasi lokal dan secret placeholder proses yang tidak disimpan. Pada 29 September pengguna melaporkan deployment Vercel berhasil dan endpoint produksi diverifikasi mengembalikan HTTP 200 dengan konfigurasi/database `ok`. Custom SMTP/domain, backup/restore, monitoring eksternal, dan smoke test dua akun masih belum dibuktikan.

## Hasil tahap 21 — transaksi berulang, 29 September 2026

| Pemeriksaan | Bukti/status |
|---|---|
| RECUR-01/04/05 | Unit test memverifikasi normalisasi template, penolakan transfer/desimal/hari tidak valid, jadwal hari 31, dan pemilihan kejadian bulan ini/berikutnya. Test PostgreSQL telah ditulis untuk memastikan template tidak membuat transaksi, post membuat satu transaksi, dan skip tidak membuat transaksi |
| RECUR-02/03/06 | Service memakai transaksi atomik, optimistic version, idempotency key per template/tanggal, dan unique constraint workspace/template/tanggal. Test PostgreSQL baru menunggu environment test sebelum dapat dilaporkan lulus |
| RECUR-07/08/09 | Otorisasi dan validasi referensi diterapkan server; test PostgreSQL mencakup Editor terhadap template Owner serta blokir arsip akun/kategori aktif, tetapi belum dijalankan lokal pada sesi ini |
| RECUR-10 | Export `schemaVersion: 2`, ringkasan penghapusan, dan cleanup workspace mencakup template/tautan kejadian; assertion integrasi tersedia dan menunggu database test |
| RECUR-11 | Dashboard membaca maksimal lima pengingat hingga tujuh hari dan halaman Transaksi menyediakan tindakan eksplisit; smoke browser terautentikasi belum dijalankan |
| Verifikasi tersedia | Prisma validate, lint, TypeScript, build produksi, dan 76 unit test lulus |

`.env.test.local` tidak tersedia pada checkout saat verifikasi, sehingga migrasi dan suite PostgreSQL tidak diklaim lulus. Migrasi development juga belum diterapkan karena CA lokal `certs/prod-supabase.cer` tidak tersedia; verifikasi TLS tidak diturunkan sebagai jalan pintas. Pulihkan file lokal tersebut dan jalankan `npm run db:migrate`, lalu jalankan `npm run db:migrate:test` serta `npm run test:db`, atau gunakan job Database pada PR, sebelum merge dan deployment fitur.
