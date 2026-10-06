# PRD — Aplikasi Manajemen Keuangan & Budgeting

**Versi:** 1.4 — PWA installable
**Diperbarui:** 5 Oktober 2026
**Status:** Arah produk dan mockup diterima; status implementasi serta keputusan terbuka dilacak di [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) dan [DECISIONS.md](docs/DECISIONS.md)  
**Nama produk sementara:** Alokasi

Panduan agent: [AGENTS.md](AGENTS.md). Aturan rinci kategori, scan, dan periode: [DOMAIN_RULES.md](docs/DOMAIN_RULES.md). Referensi desain: [DESIGN.md](docs/DESIGN.md). Cakupan implementasi: [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md). Skenario penerimaan: [ACCEPTANCE.md](docs/ACCEPTANCE.md).

## 1. Ringkasan produk

Aplikasi membantu pengguna mengelola keuangan pribadi sekaligus keuangan bersama, mencatat pemasukan dan pengeluaran, merencanakan anggaran bulanan, serta memantau realisasi melalui dashboard yang mudah dipahami.

Nilai utama produk: **pengguna mengetahui uangnya berada di mana, digunakan untuk apa, dan berapa sisa anggaran bulan ini.**

Rekomendasi awal adalah web app responsif dengan **ruang pribadi dan ruang bersama**. Satu pengguna dapat memiliki ruang pribadi dan bergabung ke beberapa ruang bersama, misalnya rumah tangga, pasangan, atau kelompok dengan dana patungan. MVP memprioritaskan pencatatan cepat, saldo yang dapat dipercaya, budgeting, dashboard per ruang, dan akses anggota yang jelas. Integrasi bank dan fitur AI ditunda sampai alur dasar terbukti bermanfaat.

**Kebutuhan yang telah dikonfirmasi:** produk mendukung individu dan keuangan bersama; arah mockup Alokasi diterima. Pengguna meminta kategori yang dapat ditambahkan, scan struk/bukti pembayaran yang mengisi draf pengeluaran sebelum submit, dan rentang bulanan mengikuti tanggal gajian. Detail peran dan kasus batas di dokumen merupakan default kerja yang harus dibedakan dari keputusan eksplisit pengguna.

### Asumsi yang masih perlu divalidasi

- Target awal: individu dan kelompok pengelola dana bersama, bukan sistem pembukuan bisnis.
- Pasar awal: pengguna berbahasa Indonesia; mata uang utama IDR.
- Platform awal: web responsif; pengalaman mobile menjadi prioritas.
- Pencatatan MVP dilakukan manual tanpa koneksi bank; scan pengeluaran direncanakan untuk pengembangan berikutnya.
- Default periode menggunakan tanggal 1; Owner dapat mengubah periode aktif langsung menjadi siklus tanggal gajian F21 tanpa mengubah tanggal transaksi atau periode yang telah ditutup.
- Produk di tahap awal tidak melakukan pembayaran atau memindahkan uang sungguhan.
- Monetisasi, kapasitas tim, dan tenggat belum ditentukan.

Model keuangan bersama awal adalah dana bersama dengan akun, transaksi, dan budget milik ruang. Perhitungan patungan per orang serta penyelesaian utang antaranggota merupakan fitur lanjutan. Jika target menjadi UMKM, PRD perlu diperluas untuk piutang, utang usaha, invoice, dan kebutuhan pembukuan bisnis.

## 2. Masalah dan peluang

| Masalah pengguna | Dampak | Respons produk |
|---|---|---|
| Saldo tersebar di bank, tunai, dan e-wallet | Sulit melihat posisi keuangan keseluruhan | Daftar akun dengan saldo dan total dana |
| Pengeluaran kecil tidak tercatat | Pengguna tidak tahu sumber pemborosan | Form transaksi ringkas dan kategori |
| Rencana pengeluaran hanya ada di kepala | Pengeluaran melampaui kemampuan | Budget bulanan dan sisa per kategori |
| Catatan ada, tetapi sulit dibaca | Pengguna tidak mengubah kebiasaan | Dashboard tren, kategori terbesar, dan peringatan |
| Pengguna malas menyiapkan aplikasi | Aktivasi rendah | Onboarding singkat dan kategori bawaan |

**Hipotesis produk:** pencatatan yang cepat dan umpan balik budget yang langsung meningkatkan kebiasaan meninjau pengeluaran. Hipotesis ini harus diuji, bukan dianggap sudah terbukti.

## 3. Tujuan dan batasan

### Tujuan

1. Pengguna dapat mulai mencatat setelah membuat akun keuangan pertama.
2. Pengguna dapat menetapkan budget dan memahami realisasinya tanpa menghitung manual.
3. Dashboard, laporan, daftar transaksi, dan saldo menghasilkan angka yang konsisten.
4. Pengguna dapat menemukan dan memperbaiki kesalahan pencatatan dengan mudah.
5. Data pribadi tetap privat; anggota ruang bersama hanya memperoleh akses sesuai peran.
6. Pengguna dapat berpindah ruang tanpa mencampurkan saldo, transaksi, atau budget.

### Di luar cakupan MVP

- Sinkronisasi bank/e-wallet otomatis dan pembayaran tagihan.
- Trading, rekomendasi investasi, pengajuan pinjaman, atau perhitungan pajak.
- Pembukuan perusahaan, payroll, invoice, dan laporan akuntansi formal.
- Multi-currency, konversi kurs, dan pengelolaan kartu kredit dengan siklus tagihan.
- Split bill, settlement antaranggota, persetujuan pengeluaran bertingkat, AI assistant, OCR struk, dan aplikasi native.
- Dashboard gabungan lintas ruang dan transfer otomatis lintas ruang.
- Sinkronisasi offline dan transaksi terjadwal otomatis.

## 4. Pengguna dan kebutuhan utama

| Persona awal | Kebutuhan | Contoh keberhasilan |
|---|---|---|
| Karyawan dengan pemasukan bulanan | Membagi penghasilan dan mengendalikan pengeluaran | Mengetahui sisa budget makan sebelum akhir bulan |
| Freelancer | Memahami pemasukan yang berubah-ubah | Membandingkan pemasukan dan pengeluaran beberapa bulan |
| Pengguna yang baru mulai budgeting | Alur sederhana dan penjelasan istilah | Membuat tiga budget kategori tanpa bantuan |
| Pasangan atau keluarga | Mengelola biaya rumah tangga bersama dengan data pribadi tetap privat | Memantau budget rumah tangga dan mengetahui siapa yang mencatat pengeluaran |
| Kelompok dengan dana patungan | Melihat dana terkumpul dan penggunaan bersama | Setiap anggota dapat meninjau pengeluaran ruang sesuai izin |

### Jobs to be done

- Ketika selesai berbelanja, saya ingin mencatat pengeluaran dengan cepat agar catatan tidak tertunda.
- Ketika merencanakan bulan berikutnya, saya ingin menyalin lalu menyesuaikan budget sebelumnya.
- Ketika membuka dashboard, saya ingin mengetahui saldo, arus kas, dan kategori yang hampir melewati budget.
- Ketika menemukan angka yang salah, saya ingin menelusuri transaksi penyebabnya dan memperbaikinya.

## 5. Prioritas dan cakupan rilis

**P0:** wajib untuk MVP. **P1 direncanakan:** kebutuhan lanjutan yang telah diminta, tetapi belum menjadi perintah implementasi saat ini. **P1 kandidat:** saran yang belum dipilih. **P2:** eksplorasi jangka lanjut. Penyebutan “nanti” tidak memindahkan fitur otomatis ke MVP. Lihat urutan kerja di IMPLEMENTATION_PLAN.md.

| ID | Fitur | Prioritas | Cakupan |
|---|---|---|---|
| F01 | Autentikasi dan profil | P0 | Registrasi, login, logout, verifikasi email, reset password, zona waktu |
| F02 | Onboarding | P0 | Akun keuangan pertama, saldo awal, kategori bawaan, panduan transaksi dan budget |
| F03 | Akun keuangan | P0 | Bank, tunai, e-wallet; saldo awal; arsip akun |
| F04 | Transaksi | P0 | Pemasukan, pengeluaran, transfer; tambah, ubah, hapus |
| F05 | Kategori | P0 | Tambah, ubah nama, arsip kategori per ruang; akses cepat dari form untuk Owner |
| F06 | Budget bulanan | P0 | Limit per kategori pengeluaran, salin bulan sebelumnya, realisasi dan sisa |
| F07 | Dashboard | P0 | Saldo, arus kas, budget, tren, kategori terbesar, transaksi terbaru |
| F08 | Riwayat dan laporan | P0 | Filter, pencarian, ringkasan bulanan, ekspor CSV |
| F09 | Indikator budget | P0 | Peringatan di dalam aplikasi pada 80% dan 100% |
| F10 | Kontrol data | P0 | Isolasi ruang dan izin anggota, ekspor, hapus akun dengan konfirmasi |
| F11 | Transaksi berulang | P1 diimplementasikan | Template bulanan, pengingat, catat atau lewati secara eksplisit |
| F12 | Target tabungan | P1 | Target nominal/tanggal dan alokasi dana |
| F13 | Impor CSV | P1 diimplementasikan | Pemetaan kolom, pratinjau, deteksi potensi duplikat, dan histori batch |
| F14 | Utang dan piutang pribadi | P1 | Catatan kewajiban, pembayaran, jatuh tempo |
| F15 | Rekonsiliasi saldo | P1 diimplementasikan | Membandingkan saldo catatan dengan saldo aktual, histori pemeriksaan, dan penyesuaian eksplisit |
| F16 | Budget rollover | P1 | Aturan membawa sisa budget ke bulan berikutnya |
| F17 | Ruang pribadi dan bersama | P0 | Pemilih ruang, undangan, peran, aktivitas anggota, isolasi data |
| F18 | Scan struk/bukti pembayaran | P1 OCR lokal | OCR browser → deteksi transfer/QRIS dan institusi → koreksi → submit eksplisit; upload/provider eksternal belum aktif |
| F19 | Integrasi bank dan e-wallet | P2 | Penelitian akses API, biaya, izin, keamanan, dan rekonsiliasi |
| F20 | Insight dan proyeksi | P2 | Insight berbasis data, proyeksi skenario, AI opsional |
| F21 | Periode mengikuti gajian | P1 diimplementasikan | Hari mulai siklus per ruang; default tanggal 1; batas tanggal konsisten untuk budget, dashboard, dan laporan |
| F22 | Saran pengisian transaksi | P1 diimplementasikan | Judul dan kategori dari riwayat ruang yang sama; pemfilteran lokal tanpa request per ketikan |
| F23 | PWA installable | P1 diimplementasikan | Manifest, ikon, tampilan standalone, service worker aman, dan halaman offline; belum menyimpan atau menyinkronkan transaksi offline |

F12, F14, dan F16 tetap P1 kandidat. F11 diaktifkan pada 29 September 2026 setelah deployment produksi dilaporkan berhasil. F22 diaktifkan pada 30 September 2026. F23 diaktifkan pada 5 Oktober 2026 setelah pengguna memilih menunda F12. F15 dan F13 diaktifkan berurutan pada 6 Oktober 2026. F18 dan F21 telah lebih dahulu diimplementasikan atas instruksi pengguna.

## 6. Kebutuhan fungsional dan acceptance criteria

### F01–F02 — Akses dan onboarding

**User story:** sebagai pengguna baru, saya dapat menyiapkan sumber dana dan segera mencatat transaksi.

- Registrasi dengan email dan password; sediakan verifikasi email serta reset password melalui tautan kedaluwarsa sekali pakai. Pengguna dapat mengubah nama tampilan dan mengganti password dari Pengaturan setelah memasukkan password saat ini; perubahan password mencabut seluruh sesi.
- Pengguna memilih zona waktu; usulkan Asia/Jakarta dan izinkan perubahan.
- Buat akun keuangan pertama dengan nama, jenis, saldo awal, dan tanggal mulai.
- Sediakan kategori awal seperti Gaji, Freelance, Makan, Transportasi, Belanja, Tagihan, Hiburan, dan Kesehatan.
- Budget dapat dilewati saat onboarding dan dilengkapi kemudian.
- Ruang pribadi dibuat otomatis. Pengguna dapat membuat ruang bersama atau menerima undangan setelah login dan verifikasi email.
- Data demo, jika disediakan, harus terpisah dari data pengguna sebenarnya.

**Diterima jika:** pengguna baru dapat membuat akun keuangan dan transaksi pertama; login gagal tidak membuka data; tautan reset yang telah dipakai atau kedaluwarsa ditolak.

### F03 — Akun keuangan

- Pengguna dapat membuat, mengubah nama, dan mengarsipkan akun bank, tunai, dan e-wallet.
- Saldo awal adalah titik awal pencatatan, bukan pemasukan pada laporan.
- Akun yang memiliki transaksi tidak dapat dihapus permanen melalui penghapusan biasa; pengguna dapat mengarsipkannya.
- Arsip ditujukan untuk akun yang tidak lagi digunakan: saldo harus nol sebelum diarsipkan. Riwayatnya tetap dapat dilihat.
- Saldo awal dan tanggal mulai dapat dikoreksi melalui alur khusus dengan pratinjau dampak serta audit perubahan.
- Saldo negatif diizinkan dengan indikator peringatan karena aplikasi merupakan catatan keuangan.

**Diterima jika:** saldo awal Rp1.000.000 ditambah pemasukan Rp500.000 dikurangi pengeluaran Rp100.000 menghasilkan Rp1.400.000; saldo awal tidak masuk ringkasan pemasukan.

### F04–F05 — Transaksi dan kategori

- Transaksi memuat judul, jenis, nominal, tanggal, akun, kategori sesuai jenis, serta catatan opsional.
- Setelah minimal dua karakter judul, form dapat menampilkan maksimal lima saran dari transaksi terbaru ruang dan jenis yang sama. Memilih saran mengisi judul serta kategori aktif terkait; nominal, tanggal, dan akun tidak ditimpa.
- Nominal harus bilangan bulat rupiah lebih dari nol; nilai negatif dan input tidak valid ditolak.
- Transfer memilih akun asal dan tujuan yang berbeda, tanpa kategori pemasukan/pengeluaran.
- Biaya transfer dicatat sebagai pengeluaran terpisah; bukan bagian nominal yang diterima akun tujuan.
- Transaksi masa depan ditolak pada MVP; gunakan tanggal hari ini atau sebelumnya, minimal tanggal mulai akun.
- Daftar transaksi mendukung filter periode, akun, kategori, jenis, serta pencarian catatan.
- Pengguna dapat mengubah dan menghapus transaksi dengan konfirmasi; perubahan langsung memperbarui seluruh agregat.
- Kategori yang telah dipakai dapat diarsipkan, tetapi transaksi historis tetap memiliki referensi kategori tersebut.
- Owner dapat menambahkan kategori pemasukan/pengeluaran di Pengaturan → Kategori dan melalui “Tambah kategori” pada form transaksi. Nama kosong atau duplikat setelah normalisasi dalam ruang dan jenis yang sama ditolak.
- Editor memilih kategori aktif yang tersedia; tidak membuat kategori baru secara diam-diam. Kategori bawaan disalin ke masing-masing ruang, bukan entitas global yang dapat diubah semua pengguna.
- Transaksi baru tidak boleh menggunakan akun atau kategori yang diarsipkan.
- Klik simpan berulang atau retry jaringan tidak boleh menghasilkan transaksi ganda untuk permintaan yang sama.

**Diterima jika:** transfer Rp200.000 mengurangi akun asal dan menambah akun tujuan masing-masing Rp200.000, tidak mengubah total dana, dan tidak menambah pemasukan/pengeluaran. Mengubah nominal atau menghapus transfer memperbarui kedua sisi secara atomik.

### F06 — Budget bulanan

- Satu budget per kategori pengeluaran per periode; nominal harus lebih dari nol. Pada MVP, periodenya bulan kalender. F21 memperluas batas periode mengikuti tanggal gajian.
- Pengguna dapat membuat, mengubah, menghapus, dan menyalin budget bulan sebelumnya.
- Penyalinan menampilkan pratinjau; budget yang sudah ada tidak ditimpa diam-diam.
- Realisasi mencakup pengeluaran semua akun dalam kategori, periode, dan ruang yang sama.
- Pengeluaran tanpa budget tetap masuk total pengeluaran dan ditampilkan sebagai kelompok “Belum dianggarkan”.
- Budget bukan pemindahan dana dan tidak mengurangi saldo akun.
- Sisa budget boleh negatif; pengeluaran tidak diblokir saat limit terlampaui.
- Tidak ada rollover pada MVP; setiap bulan berdiri sendiri.
- Menghapus budget tidak menghapus transaksi. Mengarsipkan kategori tidak menghilangkan budget historis.

**Diterima jika:** budget Makan Rp1.000.000 dengan pengeluaran Rp800.000 menampilkan realisasi 80% dan sisa Rp200.000. Pada pengeluaran Rp1.100.000, tampilkan realisasi 110% dan kelebihan Rp100.000.

### F07 — Dashboard

Dashboard menggunakan periode aktif sebagai default dan menyediakan pemilih periode serta pemilih ruang. Pada MVP, periode adalah bulan kalender; saat F21 tersedia, seluruh komponen periode menggunakan siklus ruang yang sama dan menampilkan rentang tanggal lengkap. Seluruh komponen hanya memakai data ruang aktif. Nama ruang selalu terlihat; tidak ada total gabungan pribadi dan bersama pada MVP.

| Komponen | Isi dan perilaku |
|---|---|
| Total saldo saat ini | Total saldo akun aktif, dengan label bahwa angka ini adalah saldo saat ini dan tidak mengikuti pemilih periode |
| Pemasukan periode | Jumlah transaksi pemasukan pada periode terpilih |
| Pengeluaran periode | Jumlah transaksi pengeluaran pada periode terpilih |
| Arus kas bersih | Pemasukan dikurangi pengeluaran periode; dapat negatif |
| Ringkasan budget | Total limit, realisasi kategori berbudget, sisa, dan pengeluaran belum dianggarkan |
| Progress kategori | Limit, realisasi, sisa, serta label normal/hampir habis/terlampaui |
| Tren arus kas | Pemasukan dan pengeluaran enam periode hingga periode terpilih; periode berjalan dilabeli belum lengkap dan rentang tanggal tersedia |
| Kategori terbesar | Lima kategori pengeluaran terbesar dan “Lainnya” pada periode |
| Transaksi terbaru | Lima transaksi terakhir pada periode, dengan tautan lihat semua |

- Klik nilai pemasukan, pengeluaran, atau kategori membuka daftar transaksi dengan filter yang sesuai.
- Warna disertai teks/ikon; informasi tidak boleh bergantung pada warna saja.
- Empty state berisi tindakan yang relevan, misalnya “Tambah transaksi” atau “Buat budget”.
- State memuat data, gagal memuat, dan data kosong harus berbeda. Gagal memuat tidak boleh ditampilkan sebagai saldo nol.
- Jangan menyebut total saldo sebagai “uang aman dibelanjakan”, karena kewajiban mendatang belum dimodelkan.

**Diterima jika:** semua kartu yang mengikuti periode cocok dengan transaksi sumber; saldo saat ini tetap konsisten dengan daftar akun; drill-down membuka kumpulan transaksi yang menghasilkan angka tersebut.

### F08–F10 — Laporan, peringatan, dan kontrol data

- Laporan menampilkan pemasukan, pengeluaran, arus kas bersih, rincian kategori, dan budget versus aktual.
- Ekspor transaksi CSV mengikuti filter dan ruang aktif; memuat tanggal, jenis, akun, akun tujuan untuk transfer, kategori, nominal, catatan, serta pencatat transaksi bersama. Ekspor diizinkan untuk Owner dan Editor.
- Ekspor lengkap ruang tersedia bagi Owner di pengaturan dan mencakup akun, kategori, transaksi, rekonsiliasi saldo, serta budget dalam berkas terstruktur.
- Status budget: normal di bawah 80%, hampir habis mulai 80% hingga di bawah 100%, habis pada 100%, terlampaui di atas 100%.
- MVP menggunakan indikator di dalam aplikasi. Push notification dan email pengingat berada di fase berikutnya.
- Penghapusan akun pengguna membutuhkan autentikasi ulang dan konfirmasi eksplisit. Owner ruang bersama wajib mengalihkan kepemilikan kepada anggota aktif yang menyetujui atau menghapus ruang melalui alur terpisah. Transaksi bersama tetap menjadi milik ruang, sedangkan identitas mantan anggota dianonimkan. Setelah penghapusan akun berhasil, seluruh sesi dicabut dan ruang pribadi dihapus sesuai kebijakan.
- Usulan kebijakan: hapus data aktif dalam 7 hari, cadangan kedaluwarsa maksimal 30 hari. Kebijakan final dan prosedur penghapusan cadangan wajib ditetapkan sebelum rilis publik.

**Diterima jika:** total laporan cocok dengan daftar transaksi; ekspor mempertahankan nominal dan karakter Indonesia; pengguna tidak dapat mengakses ruang tanpa keanggotaan aktif atau melakukan tindakan di luar perannya, termasuk melalui ID langsung.

### F11 — Transaksi berulang

**User story:** sebagai pengguna, saya dapat menyimpan pola pemasukan atau pengeluaran bulanan dan mendapat pengingat tanpa aplikasi membuat transaksi tanpa persetujuan saya.

- Template menyimpan nama, jenis pemasukan/pengeluaran, nominal integer rupiah, akun, kategori, catatan opsional, hari 1–31, dan tanggal kejadian berikutnya.
- Template dan pengingat tidak memengaruhi saldo, budget, dashboard, atau laporan. Pengguna harus memilih **Catat sekarang** untuk membuat transaksi jatuh tempo.
- Pengguna dapat memilih **Lewati periode** untuk memajukan satu kejadian tanpa membuat transaksi.
- Hari 29–31 memakai hari terakhir pada bulan pendek lalu kembali ke hari yang dikonfigurasi pada bulan berikutnya.
- Kejadian yang terlambat diproses satu per satu agar tidak ada periode yang dibuat atau dilewati diam-diam.
- Pencatatan transaksi dan kemajuan tanggal berikutnya atomik serta idempoten per template/tanggal jatuh tempo.
- Owner dapat mengelola seluruh template ruang. Editor dapat membuat dan mengelola template miliknya sendiri. Viewer hanya dapat melihat.
- Akun atau kategori yang dipakai template aktif tidak dapat diarsipkan sampai template diubah atau dinonaktifkan.
- Dashboard menampilkan maksimal lima pengingat yang jatuh tempo atau akan jatuh tempo dalam tujuh hari; tidak ada email/push otomatis pada tahap ini.

**Diterima jika:** membuat template tidak mengubah angka finansial; konfirmasi satu kejadian membuat tepat satu transaksi pada tanggal jatuh tempo; retry atau aksi konkuren tidak menduplikasi transaksi; melewati kejadian tidak membuat transaksi; isolasi workspace dan matriks Owner/Editor/Viewer tetap ditegakkan server.

### F13 — Impor CSV

**User story:** sebagai pengguna, saya dapat memindahkan riwayat transaksi dari CSV bank/e-wallet ke satu akun Alokasi tanpa memasukkan setiap baris secara manual.

- File CSV dibaca di browser dan file asli tidak disimpan. Maksimal 500 KB, 300 baris data, dan 30 kolom per batch.
- Pengguna memilih akun tujuan, kolom tanggal/deskripsi/catatan, cara nominal bertanda atau kolom pemasukan-pengeluaran terpisah, serta kategori default tiap jenis.
- Format tanggal yang didukung adalah `YYYY-MM-DD` serta `DD/MM/YYYY` dengan pemisah garis miring, titik, atau tanda hubung. Nominal harus berupa integer rupiah; pemisah ribuan dan akhiran desimal nol didukung.
- Pratinjau menampilkan baris valid, masalah per baris, serta kemungkinan duplikat berdasarkan akun, tanggal, jenis, nominal, dan judul ternormalisasi. Peringatan bukan bukti pasti.
- Kandidat duplikat tidak dipilih otomatis, tetapi pengguna dapat memilihnya secara eksplisit. Transfer dan pembuatan kategori baru tidak disimpulkan dari CSV pada irisan ini.
- Commit menyimpan satu batch dan seluruh transaksi terpilih secara atomik serta idempoten. Perubahan data setelah pratinjau diperiksa ulang; duplikat baru dilewati kecuali sudah dikonfirmasi.
- Owner dan Editor dapat mengimpor; Viewer hanya melihat histori batch. Semua akun, kategori, transaksi, dan batch dibatasi workspace.
- Histori batch menyimpan nama file, akun, pembuat, jumlah sumber, jumlah diimpor, dan jumlah dilewati. Isi file asli, idempotency key, serta request hash tidak masuk ekspor.

**Diterima jika:** CSV dengan baris valid, invalid, dan kandidat duplikat menghasilkan pratinjau yang dapat diperiksa; hanya baris terpilih yang menjadi transaksi; retry batch tidak menggandakan transaksi; Viewer dan referensi lintas ruang ditolak; saldo, laporan, dan rekonsiliasi membaca transaksi hasil impor seperti transaksi biasa.

### F15 — Rekonsiliasi saldo

**User story:** sebagai pengguna, saya dapat mencocokkan saldo akun di Alokasi dengan saldo aktual dan menelusuri bagaimana selisih diselesaikan.

- Pengguna memilih akun aktif dan tanggal pengecekan, lalu melihat saldo catatan yang dihitung sampai tanggal tersebut.
- Owner dan Editor dapat memasukkan saldo aktual; Viewer dapat melihat status dan histori tetapi tidak dapat membuat rekonsiliasi.
- Jika saldo sama, simpan snapshot “Cocok” tanpa mengubah saldo. Jika berbeda, arahkan pengguna memeriksa transaksi terlebih dahulu.
- Penyesuaian saldo hanya dibuat setelah konfirmasi eksplisit. Nilainya sama dengan selisih saldo aktual dikurangi saldo catatan dan tidak mengubah saldo awal.
- Penyesuaian memengaruhi saldo akun, tetapi bukan pemasukan, pengeluaran, transfer, arus kas, atau realisasi budget.
- Rekonsiliasi immutable, terikat workspace/akun/pembuat, memiliki catatan opsional, audit metadata, idempotensi, dan ikut ekspor/penghapusan data ruang.
- Transaksi bertanggal mundur, perubahan, atau penghapusan yang memengaruhi tanggal snapshot menandai rekonsiliasi lama “Perlu diperiksa kembali”.
- Tanggal masa depan, tanggal sebelum akun dimulai, akun arsip/lintas ruang, Viewer, dan selisih di luar rentang BIGINT ditolak server.

**Diterima jika:** saldo catatan Rp1.400.000 dan saldo aktual Rp1.350.000 menghasilkan selisih −Rp50.000; konfirmasi penyesuaian membuat saldo akun Rp1.350.000 tanpa mengubah pemasukan, pengeluaran, atau budget; retry tidak menggandakan penyesuaian; akses lintas ruang dan Viewer ditolak.

### F17 — Ruang pribadi dan keuangan bersama

**User story:** sebagai pengguna, saya dapat mengelola uang pribadi dan dana bersama dari satu akun, dengan pemisahan data yang jelas.

- Ruang pribadi hanya dapat diakses pemilik dan tidak menerima anggota lain.
- Pengguna dapat membuat ruang bersama, memberi nama, lalu mengundang anggota melalui email. Tidak ada undangan yang dikirim tanpa tindakan pengguna.
- Undangan terikat pada email terverifikasi, berlaku 7 hari, sekali pakai, dan dapat dicabut. Penerima harus menyetujui sebelum menjadi anggota.
- Setiap ruang memiliki IDR sebagai mata uang dan zona waktu tersendiri untuk menentukan bulan/hari saat ini. Perubahan profil pengguna tidak mengubah zona waktu ruang.
- Seluruh anggota aktif dapat melihat semua akun, transaksi, budget, dan laporan ruang tersebut. Privasi per akun di dalam ruang bersama tidak termasuk MVP; dana yang ingin disembunyikan tetap di ruang pribadi.
- Identitas pencatat dan pengubah terakhir terlihat pada transaksi bersama. Log aktivitas menampilkan aktor, tindakan, objek, dan waktu.
- Perubahan bersamaan memakai pemeriksaan versi; konflik tidak boleh menimpa perubahan terbaru tanpa pemberitahuan dan pemuatan ulang.

| Tindakan | Owner | Editor | Viewer |
|---|---|---|---|
| Melihat dashboard, transaksi, budget, dan aktivitas ruang | Ya | Ya | Ya |
| Menambah transaksi | Ya | Ya | Tidak |
| Mengubah/menghapus transaksi | Semua | Hanya transaksi yang dibuat sendiri | Tidak |
| Mengelola akun, saldo awal, kategori, dan budget | Ya | Tidak | Tidak |
| Membuat rekonsiliasi/penyesuaian saldo | Ya | Ya | Tidak |
| Ekspor transaksi | Ya | Ya | Tidak |
| Ekspor lengkap atau menghapus ruang | Ya | Tidak | Tidak |
| Mengundang, menghapus anggota, mengubah peran | Ya | Tidak | Tidak |
| Mengalihkan kepemilikan | Ya, setelah penerima menyetujui | Tidak | Tidak |

- Satu ruang bersama memiliki tepat satu Owner. Kepemilikan dipindahkan secara atomik; Owner lama menjadi Editor.
- Pengalihan memakai satu permintaan aktif yang terlihat oleh anggota tujuan. Permintaan berlaku tujuh hari, dapat dibatalkan Owner, dan baru mengubah peran setelah anggota tujuan menerimanya.
- Editor dan Viewer dapat keluar. Owner tidak dapat keluar tanpa mengalihkan kepemilikan atau menghapus ruang.
- Pencabutan keanggotaan membatalkan akses pada permintaan berikutnya. Data yang sudah diekspor sebelumnya tidak dapat ditarik kembali.
- Histori transaksi anggota yang keluar tetap ada. Menghapus anggota tidak menghapus transaksi atau mengubah saldo.
- Penghapusan ruang hanya oleh Owner melalui autentikasi ulang dan konfirmasi nama ruang, dengan penjelasan dampak bagi semua anggota.
- Penghapusan ruang menghapus data aplikasi ruang secara atomik dan mencabut akses semua anggota, tetapi tidak menghapus akun pengguna atau ruang pribadi mereka. Ekspor lengkap ditawarkan sebelum tindakan; pemulihan dari backup bukan bagian alur aplikasi saat ini.
- Transfer F04 hanya berlaku antar-akun dalam ruang yang sama. MVP menolak tujuan lintas ruang.
- Kontribusi pribadi ke dana bersama dicatat manual sebagai pengeluaran “Kontribusi bersama” di ruang pribadi dan pemasukan “Kontribusi anggota” di ruang bersama. Kedua catatan tidak tertaut dan tidak disinkronkan; UI menjelaskan bahwa pencatatan satu sisi tidak membuat sisi lainnya.
- Setiap form menampilkan nama ruang tujuan. Berpindah ruang ketika ada input belum tersimpan memerlukan keputusan simpan atau buang.

**Diterima jika:** pengguna A memiliki ruang pribadi dan ruang bersama dengan B; B dapat melihat ruang bersama tetapi tidak bisa membaca ruang pribadi A. Viewer gagal melakukan mutasi melalui API. Editor tidak bisa mengubah transaksi anggota lain. Setelah keanggotaan B dicabut, akses selanjutnya ditolak dan histori ruang tetap utuh.

### F18 — Scan struk dan bukti pembayaran (OCR lokal)

Tahap 11 membaca gambar di browser memakai OCR lokal. Parser mengisi nominal, tanggal, penerima, klasifikasi transfer/QRIS, bank/e-wallet, dan metode seperti BI-FAST. Gambar serta teks mentah tidak dikirim ke server atau disimpan. Hasil dapat salah dan selalu masuk draf privat untuk diperiksa sebelum submit.

- Pemicu “Scan struk” pada form pengeluaran, melalui unggah gambar atau kamera jika perangkat mendukung.
- Ekstraksi mengisi calon nominal total, tanggal transaksi, merchant/penerima, catatan, dan saran kategori aktif. Akun sumber wajib dipilih/dikonfirmasi pengguna; jangan menyimpulkannya dari rekening penerima pada bukti transfer.
- Tampilkan gambar sumber dan isian yang dapat diedit. Field yang tidak terbaca/meragukan diberi penanda; jangan mengarang data atau menganggap confidence sebagai jaminan benar.
- Hasil selalu draf pengeluaran. OCR selesai, retry, atau callback provider tidak boleh membuat transaksi keuangan.
- Hanya tombol submit eksplisit setelah validasi yang membuat satu transaksi. Draf tidak mengubah saldo, budget, grafik, atau laporan.
- Bukti pembayaran yang sebenarnya transfer internal atau pemasukan harus dapat dibatalkan dan dicatat melalui alur manual yang sesuai.
- Satu scan menghasilkan satu draf pengeluaran, bukan otomatis memecah item struk. Rincian state, privasi, duplikat, serta izin di DOMAIN_RULES.md.

**Diterima jika:** scan Rp125.000 dapat dikoreksi menjadi Rp120.000 sebelum submit; sebelum submit saldo tetap; sesudah submit saldo berkurang Rp120.000 satu kali meski permintaan diulang. OCR gagal tetap memberi jalur input manual.

### F21 — Periode bulanan mengikuti gajian

- Owner mengatur hari mulai 1–31 per ruang; default 1. Ini pengaturan siklus pencatatan, bukan pendeteksi kapan gaji benar-benar masuk.
- Contoh hari 25: periode 25 September–24 Oktober. Tidak digeser otomatis karena akhir pekan atau hari libur.
- Jika hari tidak ada dalam bulan, gunakan hari terakhir bulan tersebut; batas berikutnya tetap dihitung dari hari konfigurasi asli.
- Dashboard, budget, laporan, drill-down, dan ekspor memakai batas periode yang sama; saldo saat ini tidak bergantung pada pemilih periode.
- Perubahan pengaturan langsung merebasis periode aktif. Tanggal transaksi tetap utuh, budget aktif tetap terhubung, dan agregat aktif dihitung ulang dari batas baru. Periode yang telah ditutup tetap; prefix periode aktif dapat disimpan sebagai histori transisi. Aturan terperinci ada di DOMAIN_RULES.md dan wajib ditampilkan pada pratinjau.
- Periode masa depan tanpa budget boleh dibentuk ulang. Jika sudah ada budget masa depan, perubahan ditolak jelas sampai pemetaan budget dirancang; tidak ada limit yang dihapus atau dipindahkan diam-diam.
- Filter tanggal bebas pada riwayat/laporan tidak mengubah batas siklus atau membuat budget baru.

**Diterima jika:** mengubah hari 1 menjadi 25 pada 27 September langsung membuat periode aktif 25 September–24 Oktober; transaksi 24 September berada pada histori transisi dan transaksi 25 September masuk periode aktif. Hari 31 bekerja pada Februari dan tahun kabisat tanpa celah atau overlap. Data tanggal transaksi tetap utuh.

### F23 — PWA installable

- Aplikasi menyediakan manifest valid, ikon standar dan maskable, serta dapat dibuka dalam mode standalone setelah dipasang dari deployment HTTPS.
- Service worker menyediakan halaman offline generik tanpa menampilkan saldo, transaksi, identitas, atau data finansial yang pernah dibuka.
- Halaman dan respons terautentikasi, API, RSC, dashboard, laporan, serta mutasi finansial tidak dicache oleh service worker.
- Fase ini tidak menyediakan transaksi offline. Input hanya dinyatakan tersimpan setelah server mengonfirmasi transaksi di PostgreSQL.
- Push notification, Background Sync, IndexedDB, antrean mutasi, dan konflik sinkronisasi berada di luar scope F23.

**Diterima jika:** manifest dan ikon dapat dimuat, service worker aktif dari scope root, aplikasi dapat dipasang pada browser yang mendukung, navigasi tanpa jaringan menampilkan halaman offline, dan submit transaksi tanpa koneksi tidak ditampilkan sebagai transaksi tersimpan.

## 7. Aturan perhitungan dan integritas data

| Istilah | Definisi |
|---|---|
| Saldo akun | Saldo awal + pemasukan − pengeluaran + transfer masuk − transfer keluar |
| Total dana | Jumlah saldo seluruh akun aktif |
| Arus kas bersih periode | Pemasukan periode − pengeluaran periode; transfer dan saldo awal dikecualikan |
| Realisasi budget kategori | Total pengeluaran kategori pada periode budget |
| Sisa budget kategori | Limit kategori − realisasi kategori |
| Pemakaian budget | Realisasi ÷ limit × 100%; tidak dihitung jika budget belum dibuat |
| Sisa budget total | Total limit − total pengeluaran dalam kategori berbudget; tidak memasukkan kategori tanpa budget |

Ketentuan tambahan:

1. Semua perhitungan dibatasi pada satu ruang. Simpan uang sebagai integer rupiah atau tipe desimal presisi tetap dengan skala nol; jangan menggunakan floating point.
2. Gunakan tanggal transaksi sebagai tanggal kalender untuk pengelompokan laporan. Simpan waktu pembuatan/perubahan dalam UTC. Perubahan zona waktu tidak memindahkan tanggal transaksi historis.
3. Nominal transaksi selalu positif; jenis transaksi menentukan dampaknya terhadap saldo.
4. Transfer merupakan satu objek bisnis dengan asal dan tujuan, diproses dalam satu transaksi database. Tidak boleh hanya satu sisi berhasil.
5. Sumber kebenaran adalah saldo awal dan transaksi aktif. Jika agregat di-cache, perubahan transaksi wajib menginvalidasi atau memperbarui cache terkait.
6. Perubahan tanggal, akun, kategori, atau jenis transaksi memperbarui periode/kategori lama dan baru.
7. Pengembalian dana pada MVP dicatat sebagai pemasukan berkategori Refund. Pengeluaran dan realisasi budget awal tetap tercatat; refund yang mengurangi pengeluaran asli merupakan kandidat pengembangan.
8. Sisa budget adalah sisa alokasi, bukan ukuran kemampuan membayar. Saldo dan budget ditampilkan sebagai konsep berbeda.
9. Hanya transaksi yang sudah disubmit yang memengaruhi keuangan; ReceiptDraft dan hasil OCR bukan transaksi.
10. Gunakan batas periode inklusif di awal dan eksklusif di akhir. Ketentuan lengkap dan contoh tanggal ada di DOMAIN_RULES.md.

### Contoh pemeriksaan terpadu

- Saldo awal Bank Rp3.000.000 dan Tunai Rp200.000.
- Pemasukan gaji ke Bank Rp5.000.000.
- Transfer Bank ke Tunai Rp500.000.
- Pengeluaran Makan dari Tunai Rp150.000 dan Sewa dari Bank Rp1.500.000.
- Hasil: saldo Bank Rp6.000.000, Tunai Rp550.000, total Rp6.550.000.
- Laporan periode: pemasukan Rp5.000.000, pengeluaran Rp1.650.000, arus kas bersih Rp3.350.000.
- Budget Makan Rp1.000.000: realisasi Rp150.000, sisa Rp850.000. Jika Sewa tidak memiliki budget, Rp1.500.000 tampil sebagai pengeluaran belum dianggarkan.

## 8. Alur pengguna utama

### A. Pengguna baru

Registrasi → verifikasi email → ruang pribadi dibuat → pilih zona waktu → buat akun dan saldo awal → tinjau kategori → tambah transaksi pertama → buat budget atau lewati → dashboard.

### B. Mencatat pengeluaran

Tombol “Tambah transaksi” → pilih Pengeluaran → isi nominal → pilih akun dan kategori → tanggal default hari ini → simpan → konfirmasi berhasil → saldo dan budget diperbarui.

Target pengalaman: transaksi rutin dapat diisi dalam kurang dari 30 detik pada pengujian kegunaan. Jika penyimpanan gagal, input tetap tersedia dan pengguna dapat mencoba ulang.

### C. Menyusun budget bulan berikutnya

Buka Budget → pilih bulan → buat manual atau salin bulan sebelumnya → sesuaikan limit → simpan → lihat total alokasi. Tampilkan ringkasan pemasukan bulan sebelumnya sebagai konteks jika ada, tanpa menganggapnya sebagai pemasukan yang pasti.

### D. Menindaklanjuti budget yang terlampaui

Dashboard menampilkan status terlampaui → buka kategori → periksa transaksi → perbaiki jika salah catat atau sesuaikan budget secara sadar.

### E. Mengelola keuangan bersama

Pemilih ruang → buat ruang bersama → atur akun dana bersama dan budget → undang anggota sebagai Editor atau Viewer → anggota menerima undangan → catat pemasukan/pengeluaran → semua anggota melihat kondisi ruang yang sama.

Saat menerima undangan, tampilkan nama ruang, pengundang, peran, dan cakupan visibilitas. Keanggotaan tidak memberi akses ke ruang pribadi anggota lain.

## 9. Struktur halaman dan panduan UX

Navigasi utama: **Dashboard · Transaksi · Budget · Akun · Laporan · Anggota & akses**, mengikuti mockup yang diterima, dengan pemilih ruang yang selalu mudah ditemukan. Profil, kategori, periode budget, ekspor data, dan keamanan berada di Pengaturan; detail halaman yang belum ada di mockup mengikuti DESIGN.md. Kontrol yang tidak diizinkan oleh peran tidak ditawarkan; server tetap memverifikasi izin.

- Desktop: sidebar, ringkasan di bagian atas, grafik serta rincian di bawahnya.
- Mobile: navigasi ringkas dan tombol tambah transaksi yang mudah dijangkau.
- Format nominal mengikuti locale Indonesia, misalnya Rp1.250.000.
- Form nominal menerima input angka dan memformat tampilan tanpa mengubah nilai.
- Sediakan pencarian kategori dan ingat pilihan akun terakhir jika masih aktif.
- Gunakan label konkret seperti “Sisa budget Makan”, bukan hanya “Available”.
- Grafik menyediakan ringkasan teks atau tabel pendamping.
- Interaksi utama dapat digunakan dengan keyboard; fokus terlihat, field memiliki label, dan pesan validasi terkait dengan field.
- Penghapusan menampilkan objek serta dampaknya sebelum dikonfirmasi.

## 10. Model data konseptual

| Entitas | Field utama dan relasi |
|---|---|
| User | id, email, display_name, timezone, currency, status, created_at |
| Workspace | id, name, type(personal/shared), currency, timezone, created_at |
| Membership | id, workspace_id, user_id, role, status, joined_at |
| Invitation | id, workspace_id, invited_email, role, token_hash, expires_at, accepted_at?, revoked_at? |
| FinancialAccount | id, workspace_id, name, type, opening_balance, opening_date, archived_at |
| BalanceReconciliation | id, workspace_id, account_id, created_by, reconciliation_date, recorded_balance, actual_balance, difference, adjustment_amount, resolution, note, created_at |
| Category | id, workspace_id, name, type, archived_at |
| Transaction | id, workspace_id, created_by, updated_by, version, type, amount, transaction_date, account_id, destination_account_id?, category_id?, note?, idempotency_key, created_at, updated_at, deleted_at? |
| BudgetPeriod | id, workspace_id, start_date, end_date_exclusive, cycle_setting_version, is_transition |
| Budget | id, workspace_id, category_id, period_id, limit_amount, version, created_at, updated_at |
| AuditEvent | id, workspace_id, actor_id?, entity_type, entity_id, action, changed_fields, occurred_at |

Persiapan F21: BudgetPeriod sudah digunakan pada MVP untuk bulan kalender. Saat F21 diimplementasikan, tambahkan CycleSetting (workspace_id, start_day, effective_date, version). Persiapan bukan izin mengaktifkan fitur lanjutan sebelum fase terkait.

F18 menambah ReceiptDraft (workspace_id, created_by, status, file_id, extracted_fields, corrected_fields, version, submitted_transaction_id?) dan ReceiptFile (workspace_id, owner_id, private_storage_key, mime_type, size, expires_at). Jangan menambahkan provider OCR atau penyimpanan cloud tertentu sebagai keputusan final tanpa technical design.

Constraint penting:

- Semua referensi akun, kategori, transaksi, dan budget harus berasal dari ruang yang sama.
- Kombinasi ruang, kategori, dan period_id budget harus unik; periode ruang tidak boleh overlap atau memiliki celah pada rentang yang telah dibentuk.
- Kombinasi ruang dan pengguna pada membership harus unik; ruang pribadi hanya memiliki satu anggota Owner.
- Otorisasi memakai keanggotaan aktif serta peran; created_by mengatur izin edit Editor dan bukan kepemilikan data ruang.
- Kunci idempotensi dibatasi ruang dan pembuat permintaan; retry dengan payload berbeda pada kunci yang sama harus ditolak.
- Pemasukan/pengeluaran wajib memiliki kategori dengan jenis yang cocok dan tidak memiliki akun tujuan.
- Transfer wajib memiliki akun tujuan yang berbeda dari asal dan tidak memiliki kategori.
- Budget hanya boleh memakai kategori pengeluaran.
- Audit tidak menyimpan password, token, atau isi catatan bebas. Retensinya harus mengikuti kebijakan penghapusan data.

Model ini adalah kontrak konseptual; nama kolom dapat disesuaikan, tetapi relasi ruang, draf versus transaksi, dan batas periode wajib dipertahankan. Stack telah dipilih: Next.js/TypeScript, backend Route Handlers Node.js, PostgreSQL di Supabase, Prisma, Supabase Auth. Lihat [TECH_STACK.md](docs/TECH_STACK.md). Skema fisik, kontrak API rinci, dan migrasi akan dibuat saat implementasi.

## 11. Kebutuhan nonfungsional

Target berikut adalah sasaran awal yang perlu dibuktikan di lingkungan uji, bukan jaminan yang sudah tercapai.

| Area | Kriteria |
|---|---|
| Kinerja API | p95 operasi baca/tulis utama di bawah 500 ms pada data 10.000 transaksi per ruang dan 50 pengguna aktif bersamaan, di luar latensi jaringan klien |
| Dashboard | Konten utama tampil maksimal 3 detik pada profil perangkat kelas menengah dan jaringan uji yang disepakati |
| Keamanan | HTTPS, password di-hash melalui mekanisme autentikasi yang teruji, pembatasan percobaan login, sesi aman, validasi server, dan otorisasi per objek |
| Privasi | Nominal, saldo, catatan, email, dan token tidak dikirim dalam event analitik atau log aplikasi umum |
| Reliabilitas | Mutasi atomik, pencegahan retry ganda, backup harian, dan uji pemulihan sebelum beta |
| Pemulihan | Target awal RPO 24 jam dan RTO 8 jam; validasi kesesuaian biaya serta kebutuhan pengguna sebelum produksi |
| Aksesibilitas | Target WCAG 2.2 AA untuk alur utama, diuji dengan keyboard dan pembaca layar |
| Kompatibilitas | Layout responsif mulai lebar 360 px; uji browser desktop dan mobile yang dipilih saat implementasi |
| Observabilitas | Error tracking dan metrik latensi dengan ID permintaan; data finansial sensitif disamarkan |

## 12. Ukuran keberhasilan

**Metrik utama:** pengguna aktif mingguan yang mencatat minimal tiga transaksi dan membuka dashboard atau budget pada minggu yang sama.

Target berikut merupakan hipotesis awal untuk beta dan harus direvisi setelah tersedia baseline.

| Metrik | Definisi | Target awal |
|---|---|---|
| Aktivasi | Pengguna baru yang membuat satu akun, tiga transaksi, dan satu budget dalam 7 hari ÷ pengguna baru yang telah memiliki jendela observasi 7 hari | ≥50% |
| Retensi minggu ke-4 | Pengguna teraktivasi dengan aktivitas bermakna pada hari ke-22–28 sejak registrasi ÷ cohort teraktivasi yang telah berusia 28 hari | ≥25% |
| Kecepatan pencatatan | Median waktu menyelesaikan skenario tambah pengeluaran pada uji kegunaan | <30 detik |
| Keberhasilan tugas | Peserta menyelesaikan pencatatan dan pemeriksaan sisa budget tanpa bantuan | ≥80% |
| Konsistensi angka | Kasus pemeriksaan saldo, laporan, transfer, dan budget yang lolos | 100% kasus kritis |

Untuk pengguna yang bergabung ke ruang bersama, ukur aktivasi terpisah: menerima undangan lalu mencatat transaksi atau meninjau dashboard dalam 7 hari. Pantau pula ruang bersama mingguan yang memiliki minimal dua anggota aktif; jangan menyamakan aktivitas individu dengan aktivitas ruang.

Event minimum: onboarding_completed, financial_account_created, transaction_created, budget_created, dashboard_viewed, budget_viewed, export_completed, workspace_created, invitation_accepted. Event menggunakan ID pseudonim dan metadata teknis minimum, tanpa nominal atau catatan transaksi. Patuhi preferensi analitik pengguna dan tetapkan retensi sebelum publikasi.

## 13. Rencana rilis dan validasi

| Fase | Hasil | Kriteria selesai |
|---|---|---|
| Discovery | Wawancara awal sekitar 5–8 calon pengguna; validasi target, kebiasaan, dan hambatan pencatatan | Masalah utama dan cakupan MVP disepakati |
| Desain | Prototype onboarding, transaksi, dashboard, budget | Alur utama diuji pada calon pengguna dan hambatan besar diperbaiki |
| Fondasi | Auth, ruang, keanggotaan, akun, kategori, integritas transaksi | Isolasi ruang, matriks izin, dan perhitungan inti lolos verifikasi |
| Fitur utama | Budget, dashboard, laporan, ekspor | Acceptance criteria P0 terpenuhi |
| Beta | Observabilitas, backup, perbaikan usability | Tidak ada masalah kritis terbuka pada saldo, kehilangan data, atau akses tanpa izin |
| Evaluasi | Analisis aktivasi/retensi dan wawancara tindak lanjut | Pilih fitur P1 berdasarkan bukti penggunaan |

Estimasi durasi belum ditetapkan karena ukuran tim, stack, dan kualitas rilis yang diinginkan belum diketahui. Susun estimasi setelah technical design dan prototype selesai.

### Skenario verifikasi kritis sebelum beta

1. Transfer gagal di tengah proses tidak mengubah salah satu saldo saja.
2. Edit tanggal transaksi antarbulan memperbarui laporan dan budget kedua bulan.
3. Edit kategori memindahkan realisasi ke kategori baru; kategori lama kembali akurat.
4. Hapus transaksi tidak menyisakan saldo atau grafik yang kedaluwarsa.
5. Saldo awal tidak dihitung sebagai pemasukan.
6. Retry permintaan simpan tidak menghasilkan duplikasi.
7. Akses ruang tanpa keanggotaan dan tindakan di luar peran ditolak pada baca, tulis, hapus, dan ekspor.
8. Dashboard kosong, budget terlampaui, dan saldo negatif tetap dapat dipahami.
9. Ekspor sesuai filter dan aman terhadap formula spreadsheet yang disisipkan lewat teks.
10. Backup dapat dipulihkan; prosedur penghapusan akun memenuhi kebijakan yang ditetapkan.
11. Undangan salah email, kedaluwarsa, terpakai, atau dicabut tidak dapat diterima.
12. Pencabutan anggota menutup akses, mempertahankan transaksi, dan tidak mengubah saldo.
13. Edit bersamaan menghasilkan konflik yang dapat diselesaikan, bukan kehilangan perubahan tanpa pemberitahuan.
14. Perpindahan ruang membersihkan data tampilan/cache ruang sebelumnya dan seluruh query memeriksa ruang aktif.
15. Owner tidak dapat meninggalkan ruang tanpa penerus atau penghapusan; pengalihan kepemilikan tidak menghasilkan dua Owner.

## 14. Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| Pengguna berhenti mencatat | Form ringkas, akun terakhir, onboarding singkat; evaluasi transaksi berulang setelah beta |
| Saldo tidak dipercaya | Aturan hitung eksplisit, transfer atomik, koreksi transaksi, uji contoh terpadu |
| Sisa budget disalahartikan sebagai dana tersedia | Label terpisah untuk saldo dan alokasi; jangan menjanjikan nominal aman dibelanjakan |
| Pengeluaran tanpa budget tersembunyi | Tampilkan kelompok belum dianggarkan pada dashboard dan laporan |
| Cakupan terlalu luas | Batasi MVP pada ruang pribadi/bersama, IDR, manual, dan bulanan; tunda split bill |
| Anggota melihat dana yang seharusnya privat | Jelaskan visibilitas seluruh ruang; data pribadi ditempatkan di ruang pribadi |
| Edit anggota saling menimpa | Batasi hak edit, cek versi, dan sediakan aktivitas ruang |
| Kebocoran data | Otorisasi per objek, minimisasi log, kontrol ekspor, dan pengujian akses lintas pengguna |
| CSV tidak konsisten atau menghasilkan duplikasi | Impor ditempatkan pada P1 dengan pratinjau, pemetaan, dan pemeriksaan duplikat |
| Integrasi pihak ketiga mahal atau tidak tersedia | Lakukan discovery khusus sebelum menjanjikan integrasi |

## 15. Saran fitur dan urutan pengembangan

1. **Transaksi berulang dan pengingat langganan:** kandidat P1 pertama karena mengurangi pencatatan rutin. Mulai dari template dan konfirmasi, lalu pertimbangkan posting otomatis dengan aturan duplikasi.
2. **Target tabungan:** memberikan tujuan konkret seperti dana darurat atau liburan. Alokasi ke target tidak boleh dihitung sebagai pengeluaran atau menggandakan saldo.
3. **Impor CSV dan rekonsiliasi:** membantu migrasi catatan serta memperbaiki kelengkapan data sebelum integrasi bank.
4. **Utang/piutang pribadi:** bermanfaat jika muncul kuat dalam wawancara; pisahkan pokok, pelunasan, dan biaya agar laporan tidak menghitung ganda.
5. **Budget rollover:** cocok bagi pengguna yang sudah konsisten; membutuhkan aturan sisa positif dan overspending yang jelas.
6. **Insight berbasis aturan:** contoh “Pengeluaran transportasi meningkat dibanding periode sebelumnya”. Tampilkan angka sumber dan hindari membandingkan bulan parsial dengan bulan penuh tanpa penjelasan.
7. **Split bill dan settlement:** pengembangan keuangan bersama setelah MVP; mendukung pembagian rata/persentase/nominal, siapa yang membayar, dan sisa kewajiban. Harus dibedakan dari kontribusi dana bersama agar tidak menghitung pengeluaran dua kali.
8. **AI assistant:** dipertimbangkan setelah data cukup berkualitas; fokus pada penjelasan dan navigasi data. Setiap insight harus dapat ditelusuri dan perubahan transaksi memerlukan konfirmasi.

Jangan memasukkan semua kandidat ke rilis pertama. Prioritaskan bukti kebutuhan pengguna, pengurangan usaha pencatatan, serta dampak pada konsistensi data.

## 16. Keputusan yang perlu dikonfirmasi

| Keputusan | Usulan awal | Dampak jika berubah |
|---|---|---|
| Target pengguna | Individu dan keuangan bersama — dikonfirmasi | UMKM membutuhkan cakupan pembukuan tambahan |
| Model bersama | Dana bersama, tiga peran, semua data ruang terlihat bagi anggota | Split bill dan privasi per akun menambah aturan serta kompleksitas |
| Platform | Web responsif | Native/offline menambah desain sinkronisasi dan distribusi |
| Mata uang | IDR tunggal | Multi-currency memerlukan kurs dan aturan agregasi |
| Input data | Manual, impor CSV, serta OCR lokal browser; hasil scan tetap draf | Provider vision fallback, upload, biaya, dan retensi berkas belum dipilih |
| Gaya budgeting | Kategori per periode; konfigurasi tanggal gajian tersedia | Envelope/zero-based tetap di luar baseline |
| Tujuan proyek | Validasi produk dengan MVP | Portfolio, penggunaan pribadi, atau SaaS memengaruhi prioritas operasional |
| Monetisasi | Belum ditetapkan | Subscription menambah billing, entitlement, dan dukungan |
| Tim dan tenggat | Belum diketahui | Menentukan estimasi serta pemotongan cakupan |

**Definisi selesai MVP:** semua P0 memiliki alur UI yang dapat digunakan, acceptance criteria terpenuhi, angka finansial konsisten, ruang pribadi dan bersama terisolasi, peran anggota ditegakkan, ekspor dan penghapusan data berfungsi, pemulihan backup telah diuji, serta kebijakan retensi dan penghapusan telah ditetapkan.

## 17. Riwayat revisi

- 1.6 — 6 Oktober 2026: F13 impor CSV diaktifkan dengan parsing lokal, pemetaan kolom, pratinjau server, deteksi kandidat duplikat, commit batch atomik, dan histori impor.
- 1.5 — 6 Oktober 2026: F15 rekonsiliasi saldo manual diaktifkan dengan snapshot per akun, histori, status perlu diperiksa kembali, dan penyesuaian eksplisit yang tidak masuk arus kas/budget.
- 1.4 — 5 Oktober 2026: F23 PWA installable diaktifkan dengan manifest, ikon, service worker network-first, dan halaman offline. Data finansial tidak dicache dan transaksi offline belum didukung.
- 0.1 — 21 September 2026: PRD awal, ruang pribadi dan bersama.
- 0.2 — 22 September 2026: arah mockup Alokasi diterima; F05 diperjelas; F18 dipromosikan dari eksplorasi menjadi fitur lanjutan direncanakan; F21 ditambahkan; aturan agent, domain, desain, pengujian, dan keputusan didokumentasikan. Belum ada aplikasi produksi atau fitur baru yang diimplementasikan.
- 0.3 — 22 September 2026: core stack dan arsitektur dipilih atas delegasi pengguna, dengan mempertimbangkan dasar JS/TS dan PostgreSQL. Scope fitur dan desain tetap; aplikasi belum diimplementasikan.
- 0.4 — 24 September 2026: status implementasi diselaraskan; F21 tersedia dengan aturan prospektif, versi pengaturan, periode transisi, dan perlindungan budget masa depan. F18 tetap direncanakan.
- 0.5 — 25 September 2026: F18 mendapat prototipe aman berupa draf privat, simulasi ekstraksi, review/koreksi, batal, dan submit atomik. Upload, penyimpanan, callback, dan OCR nyata belum aktif.
- 0.6 — 26 September 2026: F18 membaca gambar dengan OCR lokal, memprioritaskan label total, serta mendeteksi transfer/QRIS dan bank/e-wallet. Gambar dan teks mentah tetap di browser; provider eksternal dan penyimpanan bukti belum aktif.
- 0.7 — 27 September 2026: F06/F07 dilengkapi dengan pemilih periode historis, tren hingga enam periode tersimpan, drill-down ke transaksi sumber, serta salin budget periode sebelumnya dengan pratinjau dan perlindungan tanpa overwrite.
- 0.8 — 27 September 2026: F17 dilengkapi dengan permintaan pengalihan kepemilikan dua langkah, penerimaan atomik, pembatalan, perlindungan konflik, dan keluar mandiri untuk Editor/Viewer.
- 0.9 — 27 September 2026: atas instruksi pengguna, F21 berubah dari jadwal prospektif menjadi perubahan langsung pada periode aktif, dengan ID budget aktif tetap, histori transisi, versi same-day, dan perlindungan budget masa depan.
- 1.2 — 28 September 2026: F01/UX dilengkapi menu akun pada sidebar desktop/mobile, akses Profil & Pengaturan/Keluar, perubahan nama tampilan, serta perubahan password dengan autentikasi ulang dan pencabutan sesi.
- 1.3 — 29 September 2026: F11 diaktifkan dengan template bulanan, pengingat dashboard, pencatatan atau skip eksplisit, idempotensi per jatuh tempo, dan izin Owner/Editor/Viewer.
- 1.1 — 28 September 2026: F10 dilengkapi penghapusan akun mandiri dengan blokir kepemilikan ruang bersama, konfirmasi email, autentikasi ulang, penghapusan ruang pribadi, pencabutan membership, anonimisasi histori bersama, dan cleanup identitas Auth server-only.
- 1.0 — 28 September 2026: F10 dilengkapi alur penghapusan ruang bersama khusus Owner dengan ringkasan dampak, konfirmasi nama persis, autentikasi ulang password, penghapusan atomik, dan perlindungan ruang pribadi/akun anggota.
