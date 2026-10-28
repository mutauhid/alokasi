# Baseline desain — Alokasi

Status: arah visual mockup diterima 22 September 2026. Dokumen ini adalah referensi desain di repository; artefak percakapan dapat tidak tersedia di komputer agent lain.

## Referensi

Mockup lokal pada sesi asal: `C:/Users/user/.codex/visualizations/2026/09/21/01a0c49c-d10e-75b0-b27f-b5b38eb3ca73/alokasi-mockup.html`.

Artefak tersebut prototype interaktif berisi data demo, bukan implementasi siap produksi. Jika tidak tersedia, ikuti spesifikasi ini; jangan menyatakan sudah melihat screenshot atau hasil render yang belum diperiksa. Jangan mengubah artefak percakapan sebagai bagian tugas dokumentasi ini.

## Arah visual

- Nama kerja Alokasi, logo sederhana berbentuk lapisan, karakter tenang dan praktis.
- Desktop: sidebar kiri, header pemilih ruang, judul halaman dan filter periode, lalu isi utama.
- Navigasi utama: Dashboard, Transaksi, Budget, Akun, Laporan, Anggota & akses. Kartu user di bagian bawah sidebar membuka menu berisi Profil & Pengaturan serta Keluar; pola yang sama tersedia pada navigasi mobile. Jangan hilangkan akses anggota yang sudah terlihat di mockup.
- Aksen forest, latar netral lembut, panel solid dengan garis tipis dan sudut membulat. Hindari gradient dekoratif, ilustrasi besar, atau dashboard bisnis yang mengalihkan fokus dari uang pengguna.
- Aksen ocean/plum pada kontrol eksplorasi mockup bukan fitur tema wajib aplikasi.
- Font sans-serif yang mudah dibaca; nilai uang memakai angka tabular. Ukuran teks isi sekitar 14 px, teks bantu minimal 12 px, heading sekitar 24–28 px. Font spesifik belum menjadi dependensi wajib.
- Radius panel default 16 px, kontrol sekitar 8–10 px, jarak panel 16–20 px.

| Token | Terang | Gelap |
|---|---|---|
| Latar aplikasi | #F6F7F9 | #131B20 |
| Panel | #FFFFFF | #1B252B |
| Teks utama | #182D30 | #E7EFEC |
| Teks sekunder | #728082 | #A6B5B8 |
| Garis | #E7EDEB | #334047 |
| Aksen forest | #176B56 | #73D5AE |
| Permukaan aksen | #E9F4EE | #233F36 |
| Peringatan | #996118 | #EFC17A |
| Error/terlampaui | #BA4A43 | #FBA59A |

Warna merupakan baseline, bukan pengecualian terhadap aksesibilitas. Verifikasi kontras dan sesuaikan token seperlunya dengan mencatat alasannya. Pertahankan hierarchy dan karakter visual.

## Dashboard

- Dashboard V2 mengikuti hierarki fintech premium pada referensi: header dan kontrol periode, empat KPI, banner pengingat, panel arus kas/ringkasan utang, panel budget/pengingat/transaksi, lalu aktivitas ledger.
- Empat KPI adalah total saldo saat ini, pemasukan periode, pengeluaran periode, dan arus kas bersih. Kartu saldo menjadi penekanan visual dan tidak boleh disamakan dengan “uang aman dibelanjakan”.
- Desktop memakai empat kolom KPI dan grid dua kolom pada panel utama. Tablet beradaptasi tanpa memotong nominal; mobile menumpuk satu kolom tanpa overflow horizontal.
- Panel arus kas memakai data enam periode existing, legend, label periode, sumbu Y rupiah dinamis, dan ringkasan tekstual. Tick skala mengikuti mode privasi; baseline nol tetap terlihat ketika data negatif tersedia. Kondisi histori kosong atau seluruh nilai nol menampilkan empty state, bukan batang palsu.
- Panel budget memakai donut proporsional dan progress linear per kategori, menampilkan persentase sebenarnya termasuk di atas 100%, nominal aktual/limit, serta status tekstual agar warna bukan satu-satunya indikator. Sisa budget bukan saldo.
- Transaksi terbaru tetap maksimal lima item sesuai PRD dan menaut ke laporan dengan periode yang sama. Pengingat menegaskan saldo belum berubah sebelum konfirmasi.
- Ringkasan serta aktivitas utang/piutang tetap hanya memakai ledger pribadi dan tidak digabung ke transaksi, arus kas, atau budget.
- Banner dan daftar pengingat membedakan terlambat, jatuh tempo hari ini, dan akan datang melalui label teks serta warna; nominal hanya ditampilkan karena tersedia dari template existing. Ledger memakai badge Utang/Piutang dan Pencatatan/Pembayaran yang berasal dari data existing.
- Seluruh kartu memakai token light/dark existing, border halus, radius konsisten, focus state, mode privasi nominal, reduced motion, dan skeleton yang mengikuti komposisi akhir.
- Scrollbar sidebar desktop tetap native dan dapat digulir keyboard/mouse, tetapi memakai thumb tipis berbasis token tema. Kartu Transaksi mengikuti tinggi kontennya; grid tidak memanjangkan kartu hanya untuk menyamai gabungan Budget dan Pengingat.
- Pada mobile 360–390 px, label periode chart dipecah menjadi tanggal awal/akhir agar tidak overflow. Nominal ledger utang/piutang memakai warna foreground netral karena arah dampak saldo sudah dijelaskan oleh badge tipe dan status.

## Perluasan F05 — kategori

- Pengaturan → Kategori memakai daftar ringkas dengan tab jenis dan status aktif/arsip.
- Dialog/form tambah kategori hanya meminta nama dan jenis, dengan validasi inline.
- Akses cepat “Tambah kategori” pada pemilih kategori Owner; selesai membuat kategori kembali ke draf sebelumnya tanpa kehilangan input.
- Editor/Viewer tidak mendapat tombol mutasi; izin tetap diverifikasi server.

## Riwayat transaksi

- Pencarian riwayat menerima judul transaksi atau nama kategori, tersimpan pada URL, dan bekerja bersama paging tanpa mengubah sumber saran transaksi.
- Pada mobile, setiap item memakai grid ikon–konten–nominal. Judul dan metadata dipotong secara aman, nominal selalu berada di kanan atas, dan seluruh baris dapat diketuk untuk membuka detail tanpa scroll horizontal.
- Detail transaksi tampil pada bottom sheet responsif tanpa form panjang. Semua role dapat membaca detail; Owner/Editor yang berhak melihat ikon pensil dan trash pada header di samping judul. Pensil berpindah ke tampilan edit dengan kontrol kembali, sedangkan trash tetap membuka dialog konfirmasi; bagian bawah kartu detail dibiarkan bersih.

## Perluasan F18 — scan

- Tawarkan “Isi manual” dan “Scan struk” pada alur tambah pengeluaran.
- Setelah memilih gambar: tampilkan pratinjau, status ekstraksi, dan opsi membatalkan/mengganti gambar.
- Review desktop: gambar sumber dan form berdampingan jika cukup ruang. Mobile: gambar lalu form, tanpa scroll horizontal.
- Judul “Periksa pengeluaran”; badge “Draf”; nama ruang terlihat.
- Field judul transaksi, nominal, tanggal, catatan, kategori, dan akun mengikuti susunan form transaksi manual. Merchant hasil OCR masuk ke catatan; judul memiliki saran lokal dari riwayat ruang yang sama. Field tidak pasti diberi teks “Perlu diperiksa”, bukan hanya warna.
- Tombol utama “Simpan pengeluaran” hanya setelah form valid; sukses menuju transaksi hasil, bukan mengulang submit.
- Jangan menampilkan toast “Pengeluaran tersimpan” ketika OCR baru selesai. Gunakan “Hasil scan siap diperiksa”.
- Error/timeout menyediakan input manual. Tidak ada nilai keuangan fiktif untuk menutupi OCR gagal.
- Pengaturan menyediakan kartu “Shortcut iPhone” untuk memilih akun/kategori default, membuat token yang hanya tampil sekali, memutar token, dan mencabutnya.
- Pengaturan menyediakan kartu “Catat lewat Telegram” dengan pilihan akun serta kategori default pengeluaran dan pemasukan, tautan penghubung sementara, status koneksi, dan tombol putuskan. Di chat pribadi bot, ringkasan transaksi memiliki tombol Simpan, Koreksi, dan Batal; Koreksi meminta satu field atau teks lengkap sehingga pengguna tidak perlu membuka aplikasi.
- Draf pengeluaran Telegram mengisi kategori dari riwayat judul yang sama atau kata kunci umum. Ringkasan selalu memperlihatkan kategori hasil deteksi agar pengguna dapat mengoreksinya sebelum Simpan.
- Kartu Telegram menyediakan pilihan opt-in “Peringatan budget 80% dan 100%”. Kontrol hanya aktif setelah bot terhubung dan menjelaskan bahwa setiap ambang dikirim sekali per kategori/periode ke chat pengguna tersebut.
- Kartu Telegram juga menyediakan opt-in “Ringkasan keuangan mingguan”. Penjelasan menyebut jadwal Senin, rentang Senin–Minggu sebelumnya, dan bahwa zona waktu mengikuti ruang aktif.
- Opt-in “Pengingat transaksi berulang” menjelaskan bahwa pesan dikirim sekali ketika jatuh tempo dan saldo belum berubah. Pesan bot memuat judul, nominal, tanggal, akun, kategori, serta arahan membuka menu Pengingat untuk Catat sekarang atau Lewati periode.
- Pengaturan → Automasi menampilkan kartu “Aturan kategori pribadi” setelah integrasi Telegram. Form ringkas berisi kata kunci dan kategori pengeluaran; daftar memperlihatkan mapping `kata kunci → kategori` serta tombol hapus yang dapat diakses keyboard. Kategori arsip diberi label dan tidak dipakai untuk draf baru.
- Jika server menemukan transaksi kuat yang identik dalam 10 menit terakhir, form manual dan review iPhone menampilkan panel amber berisi judul, nominal, akun, tanggal/waktu kandidat, penjelasan bahwa judul sama tetap diperbolehkan, serta tombol **Tetap simpan**. Telegram menampilkan pilihan Tetap simpan, Koreksi, dan Batal di chat.
- Draf dari Shortcut langsung membuka bagian “Periksa pengeluaran”, menampilkan preview privat di atas form pada mobile, dan mengisi akun/kategori default. Tombol utama tetap “Simpan pengeluaran”; kedatangan draf bukan status transaksi tersimpan.

## Perluasan F21 — siklus gajian

- Pengaturan → Periode budget: pilihan Bulan kalender atau Mengikuti tanggal gajian, serta hari mulai 1–31; hanya Owner dapat mengubah.
- Tampilkan preview rentang aktif yang langsung berlaku, histori transisi yang terbentuk, dan periode reguler berikutnya. Jelaskan bahwa budget aktif tetap terhubung, agregat mengikuti batas baru, serta clamp akhir bulan tetap berlaku.
- Pemilih periode pada header menggunakan rentang seperti “25 Sep–24 Okt 2026”. Jangan mengganti hanya label sementara query masih berdasarkan bulan kalender.
- Batas inklusif tampilan dan eksklusif internal mengikuti DOMAIN_RULES.md.

## Dashboard dan budget historis

- Dashboard dan Budget memakai pemilih periode dengan rentang tanggal lengkap; periode aktif dan transisi diberi teks yang jelas.
- Saat melihat histori, tampilkan bahwa saldo tetap saldo saat ini dan budget lama bersifat baca saja.
- Grafik menampilkan maksimal enam periode tersimpan hingga pilihan pengguna, dengan pasangan batang pemasukan/pengeluaran serta label periode berjalan/transisi.
- Nilai pemasukan, pengeluaran, kategori terbesar, dan transaksi terbaru menyediakan drill-down ke laporan dengan rentang serta filter sumber yang sama.
- Pratinjau salin budget menampilkan kategori dan limit dari periode tepat sebelumnya. Kategori target yang sudah ada atau telah diarsipkan terlihat tetapi tidak dapat dipilih.

## Perluasan F11 — transaksi berulang

- Halaman Transaksi memprioritaskan aksi **Scan struk** dan **Tambah transaksi**, lalu riwayat. Pengingat berada pada subhalaman/tab tersendiri di dalam Transaksi; halaman riwayat hanya menampilkan pengingat kontekstual melalui Dashboard. Teks pengingat selalu menjelaskan bahwa template belum mengubah saldo atau budget.
- Form memakai nama, jenis, nominal, hari bulanan, akun, kategori, dan catatan. Pada layar lebar field membentuk grid; pada mobile semuanya ditumpuk tanpa scroll horizontal.
- Setiap template menampilkan nominal, akun, kategori, hari asli, tanggal berikutnya, serta status “Dalam n hari”, “Hari ini”, atau “Terlambat n hari”. Status tidak bergantung pada warna saja.
- Item pengingat memakai pola tap-detail dan posisi nominal yang sama dengan riwayat transaksi. Ikon edit/nonaktifkan berada pada header; trash membuka konfirmasi nonaktifkan, bukan hard delete. **Catat sekarang** dan **Lewati periode** hanya tampil setelah detail ketika jatuh tempo.
- Dashboard menampilkan ringkasan maksimal lima pengingat dalam tujuh hari dan tautan menuju Transaksi. Teks menegaskan bahwa saldo belum berubah.

## Perluasan F22 — saran transaksi

- Form manual memiliki field **Judul transaksi** terpisah dari **Catatan opsional**.
- Setelah pengguna mengetik minimal dua karakter, tampilkan maksimal lima chip yang cocok. Chip menampilkan judul dan nama kategori bila berlaku.
- Klik chip mengisi judul dan kategori terkait tanpa menimpa nominal, tanggal, atau akun. Pada transfer, chip hanya mengisi judul.
- Saran kategori arsip tidak ditampilkan. Tata letak chip membungkus pada mobile dan tidak menambah scroll horizontal.
- Viewer melihat daftar tanpa kontrol. Editor tidak melihat kontrol pada template milik anggota lain; Owner melihat seluruh kontrol sesuai aturan server.

## Paging riwayat transaksi

- Riwayat menampilkan 10 transaksi per halaman secara default dan menyediakan pilihan 5, 10, 20, 30, 50, atau 100.
- Kontrol menampilkan rentang baris, jumlah total, posisi halaman, serta tombol Sebelumnya/Berikutnya. Tombol yang tidak memiliki tujuan dibuat nonaktif.
- Mengubah pilihan ukuran langsung menerapkan paging tanpa tombol tambahan dan kembali ke halaman pertama. Workspace, halaman, dan ukuran halaman dipertahankan pada URL agar refresh serta navigasi browser konsisten.
- Kontrol membungkus pada layar kecil tanpa scroll horizontal. Paging hanya memengaruhi daftar riwayat; kandidat saran judul tetap dibentuk dari maksimal 100 transaksi terbaru ruang yang sama.

## Input nominal Rupiah

- Form transaksi manual, koreksi hasil OCR, dan template pengingat menampilkan awalan `Rp` tetap serta pemisah ribuan titik saat pengguna mengetik.
- Pengguna mengetik digit tanpa perlu menulis pemisah; `12000` tampil sebagai `Rp 12.000` dan paste `Rp 2.000.000` dinormalisasi dengan hasil yang sama.
- Pemformatan hanya presentasi browser. Nilai form yang dikirim tetap digit integer rupiah, tanpa pecahan dan tanpa konversi ke floating point.
- Keyboard mobile memakai mode numerik dan kontrol tetap memiliki tinggi target sentuh minimal 44 px.

## PWA dan keadaan offline

- Ikon PWA mempertahankan logo lapisan dan warna forest Alokasi, dengan versi standar serta maskable agar aman pada bentuk ikon perangkat yang berbeda.
- Saat dipasang, aplikasi memakai nama pendek “Alokasi”, mode standalone, dan warna tema forest; navigasi serta hierarchy aplikasi tidak berubah.
- Halaman offline berdiri sendiri, ringkas, dan tidak menampilkan saldo, transaksi terakhir, nama ruang, atau identitas pengguna dari cache.
- Pesan offline menjelaskan bahwa transaksi belum dapat disimpan tanpa koneksi dan menyediakan tindakan “Coba lagi”. Jangan menampilkan toast sukses atau angka nol.
- Custom install prompt bukan syarat baseline; browser/perangkat boleh menyediakan alur pemasangannya sendiri.

## Notifikasi perangkat

- Pengaturan → Automasi menampilkan status perangkat, tombol aktivasi yang memicu dialog izin browser, pilihan jenis notifikasi, batas saldo, jam tenang, dan opsi menyembunyikan rincian sensitif.
- Izin tidak diminta otomatis saat halaman dimuat. Pesan browser tidak didahului klaim bahwa izin wajib; pengguna dapat mematikan perangkat saat ini dan tetap memakai Alokasi.
- Notifikasi ringkas dan dapat ditindaklanjuti. Klik membuka modul terkait pada workspace yang sama; kegagalan akses setelah sesi/membership berubah ditangani halaman tujuan.
- Toast tetap dipakai untuk hasil aksi ketika aplikasi sedang terbuka. Web Push dipakai untuk kejadian yang berguna ketika aplikasi berada di background dan tidak mengulang toast mutasi biasa.
- Tombol mata di header mengontrol penyamaran nominal baca-saja secara global pada perangkat. Ikon, tooltip, `aria-label`, dan `aria-pressed` menjelaskan aksi/status; pilihan bertahan saat navigasi dan sinkron antartab.
- Kontrol mata pada kartu Web Push hanya mengatur rincian yang boleh tampil di layar terkunci. Kontrol tersebut sengaja terpisah dari mode privasi halaman agar pengguna dapat, misalnya, melihat nominal di aplikasi tetapi tetap menyamarkan push.

## Rekonsiliasi saldo

- Setiap kartu akun menampilkan status rekonsiliasi terakhir dan tindakan “Cocokkan saldo” bagi Owner/Editor atau “Lihat rekonsiliasi” bagi Viewer.
- Panel rekonsiliasi menampilkan akun, tanggal pengecekan, saldo menurut Alokasi, input saldo aktual, selisih bertanda, serta catatan opsional.
- Saat selisih nol, tindakan utama adalah “Simpan saldo cocok”. Saat berbeda, arahkan ke pemeriksaan transaksi dan tampilkan “Sesuaikan saldo dan simpan” sebagai tindakan eksplisit, bukan otomatis.
- Riwayat menampilkan saldo catatan, saldo aktual, selisih, penyesuaian, pembuat, dan status “Cocok”, “Disesuaikan”, atau “Perlu diperiksa kembali”.
- Nilai negatif tetap didukung. Informasi selisih tidak bergantung pada warna, dan layout menumpuk pada mobile tanpa scroll horizontal.

## Utang & piutang pribadi

- Navigasi memiliki modul **Utang & Piutang**. Ruang bersama menampilkan penjelasan untuk kembali ke ruang pribadi, bukan data kosong yang menyerupai kegagalan.
- Bagian atas memakai tiga ringkasan: sisa utang, sisa piutang, dan jumlah terlambat. Nominal mengikuti tombol privasi global.
- Daftar dapat difilter Semua/Utang/Piutang. Setiap baris menampilkan pihak, status, jatuh tempo, dan sisa nominal tetap di kanan; seluruh baris membuka detail.
- Form tambah membedakan Utang/Piutang dan Baru terjadi/Catatan lama. Penjelasan saldo wajib terlihat sebelum simpan; akun hanya diminta untuk kejadian baru.
- Detail menampilkan pokok, terbayar, sisa, status, tanggal, sumber pencatatan, riwayat pembayaran, dan form cicilan jika belum lunas. Nominal pembayaran memakai input Rupiah; tombol **Bayar penuh** untuk utang atau **Terima penuh** untuk piutang menggunakan seluruh sisa tanpa meminta pengguna mengetik nominal.
- Dashboard ruang pribadi menampilkan dua kartu terpisah: ringkasan posisi saat ini (sisa utang, sisa piutang, terlambat, dan jatuh tempo terdekat) serta empat aktivitas ledger terbaru. Keduanya menaut ke modul Utang & Piutang dan tidak digabung ke daftar Transaksi terbaru.
- Status tidak hanya dibedakan warna. Gunakan label Belum dibayar, Dibayar sebagian, Lunas, atau Terlambat dan pertahankan target sentuh minimal 44 px.

## Gerak antarmuka dan kontrol transaksi

- Setiap modul memakai animasi masuk singkat pada judul dan panel ketika navigasi selesai. Gerak harus tenang, tidak menggeser layout, dan tidak menunda interaksi.
- Dashboard memakai skeleton yang mengikuti bentuk kartu ringkasan, grafik, dan panel ketika data dimuat. Setelah tampil, batang grafik serta progress arus kas/budget bertumbuh dari titik asalnya tanpa mengubah nilai.
- Semua animasi wajib dinonaktifkan secara efektif ketika perangkat memilih `prefers-reduced-motion: reduce`.
- Kategori pada form transaksi manual dan review bukti iPhone ditampilkan sebagai kumpulan kartu radio dengan ikon kategori, teks, fokus keyboard, serta indikator terpilih. Semantik native radio dan validasi wajib tetap dipertahankan. Pada ponsel kartu tetap memakai dua kolom; ikon dan radio berada di bagian atas sehingga nama kategori mendapat lebar kartu penuh dan tidak terpotong di tengah kata.
- Input limit Budget memakai format Rupiah interaktif yang sama dengan transaksi. Tampilan `Rp 500.000` tetap mengirim digit integer `500000` ke Server Action.
- Tindakan sekunder transaksi menggunakan tombol tiga titik berlabel aksesibel. Tombol membuka bottom sheet responsif berisi form ubah dan tindakan hapus; hapus masih memerlukan dialog konfirmasi terpisah.
- Dashboard memakai komposisi V2 empat KPI; chart/utang dan budget/transaksi berdampingan pada desktop, sementara mobile menumpuk semua panel tanpa kehilangan legend atau nilai.
- Tambah transaksi dibuka sebagai modal dari halaman Transaksi maupun tombol “Catat transaksi” Dashboard. Scan bukti tetap alur terpisah; menutup modal tidak membuat transaksi.
- Kartu Budget dan Akun memakai tombol tiga titik yang membuka bottom sheet untuk edit serta hapus/arsip. Tindakan destruktif atau pengarsipan tetap meminta konfirmasi kedua.
- Laporan menampilkan grafik batang pemasukan/pengeluaran dari transaksi yang sudah mengikuti seluruh filter. Pengeluaran per kategori menggunakan progress relatif terhadap kategori terbesar; grafik tidak memakai data demo.
- Panduan automasi harus mempertahankan ilustrasi pada setiap langkah. Panduan iPhone wajib memperlihatkan pengisian header Authorization, Form `text` dan `image`, pengambilan `reviewUrl`, pengaturan Back Tap, serta pemeriksaan bukti; bukan hanya deskripsi teks.

## Transaksi V2

- Halaman memakai kelas terisolasi `transactions-v2`, surface/radius/border yang konsisten dengan Dashboard V2, dan riwayat sebagai kartu utama. Metadata, pencarian, page size, serta pagination tetap memakai data/query existing.
- Tombol **Tambah transaksi** menjadi primary action dan **Scan struk** secondary action. Scan membuka kartu disclosure ringkas; draf OCR aktif membuka disclosure otomatis agar koreksi tidak tersembunyi.
- Modal tambah transaksi menjadi sheet bawah pada mobile dan dialog terpusat pada desktop. Urutan visual: jenis, nominal, judul, tanggal/akun, kategori, catatan, lalu footer Batal/Simpan. Native input dan Server Action existing tetap menjadi sumber validasi.
- Jenis transaksi dan kategori memakai tile dengan ikon, label, border, indikator cek, dan focus ring sehingga state terpilih tidak hanya bergantung pada warna.
- Baris riwayat mempertahankan ikon kategori, judul, metadata, dan nominal kanan yang stabil. Baris terpilih memperoleh state subtle dari state sheet, bukan status finansial baru.
- Detail menjadi bottom sheet pada mobile dan right drawer pada desktop. Nominal tetap mengikuti privacy mode; Edit/Hapus hanya muncul sesuai permission existing dan hapus tetap meminta konfirmasi.
- Seluruh teks panjang dan nominal memakai wrapping/truncation pada area yang tepat tanpa horizontal overflow pada 360/390 px. Styling light/dark memakai token, bukan warna dark hardcoded.
- Input nominal tambah/edit menyediakan tombol kalkulator yang membuka keypad inline. Pengguna dapat menghitung tambah, kurang, kali, atau bagi lalu menerapkan hasil secara eksplisit; menutup kalkulator tidak mengubah nominal form.
- Area filter riwayat menggabungkan pencarian dengan tanggal mulai dan akhir. Label tanggal tetap terlihat, filter dapat direset sekaligus, dan nilai pencarian/rentang dipertahankan oleh pagination serta kontrol jumlah baris.

## Budget V2

- Header Budget menyatukan konteks periode, tombol tampilkan, salin periode, dan buat budget. Teks pengantar adalah “Pantau dan kelola anggaranmu dengan lebih jelas.”
- Tiga KPI menampilkan total limit, realisasi pada kategori berbudget, serta pengeluaran pada kategori tanpa budget. Seluruh nominal baca-saja mengikuti Amount Privacy Mode global.
- Ringkasan penggunaan memakai ring berbasis persentase aktual. Label persentase dapat melebihi 100%, tetapi sapuan ring dan progress bar berhenti pada satu lingkaran penuh agar visual tetap stabil.
- Pengeluaran belum dianggarkan dijelaskan sebagai pengeluaran nyata pada kategori tanpa limit, bukan sisa dana atau saldo yang dapat dialokasikan.
- Kartu kategori memakai ikon existing, status domain Normal/Hampir habis/Habis/Terlampaui, aktual, limit, progress, dan sisa atau kelebihan. Menu tiga titik membuka detail responsif, edit limit, dan konfirmasi hapus.
- Buat budget memakai dialog terpusat pada desktop dan sheet bawah pada mobile. Salin periode memakai drawer kanan pada desktop dan sheet bawah pada mobile, dengan kategori eligible, alasan kategori disabled, jumlah pilihan, dan total limit terpilih.
- Periode historis dan role selain Owner tetap baca-saja. Loading, kosong, konflik, serta state sukses/gagal dibedakan tanpa data dummy.
- Total limit menjadi jangkar konteks pada tiga KPI. Belum dianggarkan tetap setara secara struktur tetapi memakai ikon/tone netral agar tidak mengalahkan konteks keseluruhan.
- Badge ringkasan memakai teks “Status: …” dari domain existing. State salin tanpa kategori eligible menjelaskan bahwa kategori sudah ada atau diarsipkan, sambil tetap menampilkan alasan per item.

## Struktur Pengaturan

- Pengaturan memakai navigasi lokal responsif dan menampilkan satu kelompok fungsi pada satu waktu: Akun, Automasi, Kategori, Ruang & data, atau Zona berbahaya.
- Pilihan bagian tersimpan pada URL `view` bersama `workspaceId`, sehingga refresh, tombol kembali browser, tautan panduan, dan redirect setelah mutasi tetap membuka konteks yang sama.
- Pada desktop navigasi menjadi kolom yang tetap terlihat saat konten digulir; pada mobile menjadi grid dua atau tiga kolom tanpa scroll horizontal.
- Zona berbahaya hanya tersedia pada ruang pribadi. Viewer dapat mengatur Web Push miliknya sendiri, tetapi tidak menerima kontrol konfigurasi iPhone, Telegram, atau aturan kategori.
- Halaman tidak menampilkan daftar status implementasi, rincian arsitektur, atau penjelasan validasi server yang ditujukan bagi developer. Perlindungan tersebut tetap dijalankan di backend.

## Lifecycle ruang bersama

- Owner melihat kartu “Alihkan kepemilikan” dengan calon Owner aktif, penjelasan bahwa penerima harus menyetujui, masa berlaku permintaan, dan tombol pembatalan.
- Anggota tujuan melihat kartu permintaan yang berbeda dengan tindakan “Terima kepemilikan”. Anggota lain tidak mendapat tindakan menerima.
- Setelah penerimaan, label peran dan kontrol halaman mengikuti role terbaru pada request berikutnya; Owner lama menjadi Editor.
- Editor/Viewer melihat kartu “Keluar dari ruang” dengan dampak akses dan histori. Owner melihat penjelasan transfer dan tidak mendapat tombol keluar langsung.
- Owner melihat kartu “Hapus ruang bersama” bergaya bahaya setelah kontrol lifecycle lain. Kartu menampilkan hitungan data terdampak, tautan/anjuran ekspor, nama ruang yang harus diketik persis, field password, dan tombol destruktif yang baru aktif setelah kedua isian lengkap.
- Sukses penghapusan membawa Owner ke ruang pribadi dan menghilangkan ruang lama dari pemilih. Error nama, autentikasi, atau konflik versi harus berbeda dan tidak boleh ditampilkan sebagai sukses parsial.

## State wajib dan responsivitas

- Loading, kosong, gagal, berhasil, validasi, konflik edit, akses dicabut, dan draft belum tersimpan memiliki state yang berbeda.
- Keberhasilan mutasi utama ditampilkan sebagai toast global di atas konten: judul spesifik, penjelasan dampak singkat, ikon yang tidak menjadi satu-satunya penanda, tombol tutup, dan hilang otomatis. Parameter sukses dibersihkan dari URL agar refresh tidak memutar ulang notifikasi.
- Error dan konflik tetap tampil dekat form atau area tindakan terkait; toast sukses tidak menggantikan umpan balik yang perlu diperbaiki pengguna.
- Data kosong tidak memakai saldo demo. Kegagalan API tidak ditampilkan sebagai saldo nol.
- Nama ruang selalu jelas sebelum submit; pergantian ruang tidak menghilangkan input tanpa keputusan pengguna.
- Desktop sekitar 1024 px mengikuti komposisi mockup; pada layar sempit panel ditumpuk, navigasi diringkas, kontrol tetap tersedia.
- Uji minimal 360 px dan desktop, keyboard, label input, fokus, serta target sentuh sekitar 44 px.
- Tombol yang belum diimplementasikan tidak berpura-pura berhasil. Simulasi harus dilabeli.

## Batas otoritas mockup

Mockup menunjukkan arah visual dan interaksi, bukan kontrak domain. Jangan menyalin nama demo, tanggal tetap, seluruh dataset, penyimpanan memory-only, aturan izin yang belum diimplementasikan, atau grafik contoh ke produksi. Jika prototype berbeda dari PRD/DOMAIN_RULES, gunakan dokumen tersebut untuk perilaku dan pertahankan desain visualnya.
