# Aturan domain — kontrak implementasi

Status: diperbarui 27 September 2026. Kebutuhan eksplisit dan default kerja dibedakan di [DECISIONS.md](DECISIONS.md). Rumus dasar, matriks peran, dan kebijakan akun mengikuti [PRD](../PRD.md). Dokumen ini memiliki rincian kategori, scan, dan periode.

## 1. Ruang, uang, dan transaksi

- Workspace adalah batas data; user pembuat bukan pengganti kepemilikan ruang.
- Setiap referensi akun, kategori, periode, file, dan transaksi harus berada di ruang yang sama. Validasi pada server, termasuk job asinkron dan signed URL.
- Nominal integer rupiah lebih dari nol. Saldo awal dan transfer tidak masuk pemasukan/pengeluaran. Transfer terdiri dari satu operasi bisnis atomik.
- Saldo dihitung dari saldo awal dan transaksi tersubmit yang tidak dihapus. Draf OCR tidak termasuk query agregat mana pun.
- Tanggal transaksi adalah tanggal kalender lokal yang dipilih/dikonfirmasi, bukan timestamp upload. Timestamp teknis disimpan UTC. Gunakan zona waktu ruang untuk “hari ini”.
- Tanggal masa depan atau sebelum tanggal mulai akun ditolak sesuai PRD. OCR tunduk pada validasi yang sama.
- Retry submit dengan idempotency key sama dan payload sama mengembalikan transaksi yang sama. Payload berbeda dengan key sama ditolak. Scope key mencakup workspace dan pembuat.

### Lifecycle ruang bersama

- Hanya Owner ruang bersama yang dapat meminta pengalihan kepemilikan kepada satu anggota aktif non-Owner. Ruang pribadi tidak mendukung pengalihan.
- Maksimal satu permintaan aktif per ruang. Permintaan berlaku tujuh hari, dapat dibatalkan Owner, dan tidak mengubah izin sebelum anggota tujuan menerima sendiri.
- Penerimaan mengunci workspace dan menukar peran secara atomik: Owner lama menjadi Editor, penerima menjadi Owner, lalu state permintaan dibersihkan. Constraint tetap harus melihat tepat satu Owner aktif pada commit.
- Versi workspace dan membership wajib cocok. Dua penerimaan atau perubahan anggota bersamaan menghasilkan satu keberhasilan dan konflik yang terlihat, bukan dua Owner atau overwrite.
- Editor/Viewer dapat keluar dengan mencabut membership sendiri. Owner tidak dapat keluar sampai pengalihan selesai atau alur penghapusan ruang tersedia.
- Keluar atau pencabutan anggota tujuan membersihkan permintaan pengalihan tertunda. Histori transaksi, saldo, budget, dan audit ruang tidak dihapus.

### Penghapusan ruang bersama

- Hanya Owner aktif yang dapat menghapus ruang bersama. Ruang pribadi tidak dapat dihapus melalui alur ini.
- Sebelum submit, tampilkan jumlah keanggotaan, akun, kategori, transaksi, budget, dan draf scan yang terdampak; arahkan Owner ke ekspor lengkap bila memerlukan salinan.
- Submit memerlukan nama ruang yang cocok persis dan autentikasi ulang password. Password hanya diteruskan ke Supabase Auth untuk verifikasi dan tidak disimpan atau dicatat aplikasi.
- Di dalam satu transaksi serializable: kunci workspace, periksa ulang tipe shared, versi, dan Owner aktif; bersihkan referensi transfer Owner; hapus seluruh data anak; lalu hapus workspace. Kegagalan pada salah satu langkah membatalkan semuanya.
- Penghapusan ruang tidak menghapus user, ruang pribadi, atau data ruang lain milik para anggota. Request berikutnya dengan ID ruang lama harus ditolak.
- Data aktif aplikasi hilang segera. Retensi backup, pemulihan, dan penghapusan cadangan merupakan prosedur operasional terpisah yang wajib ditetapkan sebelum rilis publik.

## 2. F05 — kategori kustom

### Data dan izin

- Kategori memiliki ID stabil, workspace_id, nama, jenis income/expense, dan status aktif/arsip. Budget hanya menerima expense.
- Owner dapat membuat, mengganti nama, mengarsipkan, dan memulihkan kategori. Editor/Viewer tidak dapat memutasinya. Owner ruang pribadi adalah pemiliknya.
- Nama: trim, normalisasi Unicode, rapikan spasi berulang, 1–50 karakter. Keunikan memakai nama ternormalisasi yang tidak membedakan huruf besar/kecil, dalam kombinasi ruang dan jenis yang sama, termasuk kategori diarsipkan.
- Jika nama sudah ada pada kategori arsip, tawarkan pemulihan, bukan duplikasi baru. Nama sama di ruang berbeda diizinkan.
- Jenis kategori yang telah direferensikan transaksi/budget tidak boleh diubah. Buat kategori baru bila kebutuhan berubah.
- Mengganti nama mempertahankan ID dan referensi; histori dapat menampilkan nama terkini, dengan perubahan nama tercatat di audit. Nilai historis tidak berubah.
- Arsip tidak menghapus histori, budget historis, atau realisasi periode aktif. Cegah penghapusan permanen kategori yang pernah direferensikan.
- Saat kategori diarsipkan setelah form/draf dibuka, submit menolak kategori itu dan meminta pilihan aktif baru. Jangan memilih kategori lain secara otomatis.

### UX

- Pengaturan → Kategori: tab Pemasukan/Pengeluaran, daftar Aktif/Arsip, tambah, ubah nama, arsip/pulihkan.
- Form transaksi: pencarian kategori; “Tambah kategori” hanya bagi Owner, sesuai jenis transaksi.
- Selesai membuat kategori mengembalikan pengguna ke form dan memilih kategori baru, tanpa menghapus isian lain.
- Kategori bawaan dibuat per ruang. OCR hanya menyarankan kategori aktif pada ruang tujuan; tidak membuat kategori baru.

## 3. F18 — scan menjadi draf pengeluaran

### Batas fitur

- Satu gambar struk/bukti pembayaran per draf. Implementasi lokal menerima JPEG, PNG, WebP hingga 10 MB dan memvalidasi pilihan di browser. Jika upload server kelak diaktifkan, MIME, isi, ukuran, dan dekode wajib divalidasi ulang di server. HEIC, PDF, multi-page, dan batch belum termasuk baseline.
- Kamera adalah enhancement jika tersedia; unggah file dan input manual selalu menjadi fallback.
- Satu draf menghasilkan maksimal satu transaksi pengeluaran. Rincian item bukan transaksi terpisah.
- Tidak menjamin OCR benar. Nominal tidak terbaca tetap kosong, bukan nol; tanggal tidak terbaca ditandai untuk diisi, bukan diklaim berasal dari struk.
- Nominal subtotal, pajak, diskon, biaya, dan total yang bertentangan ditampilkan sebagai kebutuhan pemeriksaan. Jangan menjumlahkan biaya yang sudah termasuk total.
- Bukti berstatus pending/gagal, transaksi masuk, atau transfer antar-akun bukan bukti pengeluaran terselesaikan. Tampilkan peringatan jika terdeteksi; sediakan batal/input manual. Deteksi otomatis bukan jaminan.
- Mata uang non-IDR/ambigu membutuhkan input manual sesuai scope IDR; tidak ada konversi otomatis.

### Isian hasil ekstraksi

| Field | Perlakuan |
|---|---|
| Total pembayaran | Calon amount integer IDR; dapat dikoreksi |
| Tanggal transaksi | Calon transaction_date; validasi zona waktu/tanggal akun |
| Merchant/penerima | Isian catatan atau label transaksi; dapat dikoreksi |
| Bank/e-wallet dan metode | Saran berdasarkan teks/merek terbaca; tidak menentukan akun sumber |
| Catatan | Draf singkat; jangan salin seluruh teks sensitif tanpa kebutuhan |
| Kategori | Saran dari kategori expense aktif ruang; pengguna dapat mengganti |
| Akun sumber | Pengguna memilih atau mengonfirmasi; rekening penerima bukan akun sumber |
| Ruang tujuan | Terikat saat draf dibuat dan terlihat jelas |

Istilah “autocomplete” di sini berarti prefill form yang dapat dikoreksi. Tidak berarti auto-submit, auto-transfer, atau mengikuti perintah di teks hasil scan.

### State dan efek keuangan

| State | Tindakan berikutnya | Efek saldo/budget |
|---|---|---|
| uploaded | Mulai ekstraksi atau batalkan | Tidak ada |
| processing | Tunggu, batalkan, atau tangani timeout | Tidak ada |
| needs_review | Periksa/koreksi field; submit bila valid; batalkan | Tidak ada |
| failed | Coba ulang atau isi manual | Tidak ada |
| submitted | Tampilkan transaksi hasil; jangan submit lagi | Tepat satu transaksi |
| cancelled / expired | Berakhir; lakukan cleanup file | Tidak ada |

- Retry ekstraksi memakai attempt/version baru. Callback attempt lama, draf dibatalkan, kedaluwarsa, atau sudah submitted tidak boleh mengubah isian atau membuat transaksi.
- Ekstraksi ulang tidak menimpa koreksi pengguna tanpa pilihan eksplisit. Pisahkan extracted_fields dan corrected_fields.
- Dari failed, pengguna dapat memilih input manual pada draf yang sama menuju needs_review; jangan membuat dua jalur posting paralel.
- Submit memvalidasi ulang peran aktif, kepemilikan draf, workspace, akun/kategori aktif, tanggal, nominal, dan versi.
- Dalam transaksi database yang sama: kunci/compare-and-swap draf needs_review → buat transaksi → simpan submitted_transaction_id → ubah state submitted. Constraint memastikan satu draf tidak menghasilkan dua transaksi.
- Pembatalan atau habis masa berlaku tidak memicu posting. Callback OCR tidak pernah memiliki wewenang posting.
- Peringatan kemungkinan duplikat dapat memakai hash file serta nominal/tanggal/merchant dalam ruang dan hak akses yang sama. Ini peringatan, bukan bukti pasti; pengguna boleh mengonfirmasi transaksi berbeda yang kebetulan sama. Idempotensi submit tetap wajib.

### Akses, berkas, dan privasi

- Owner/Editor aktif dapat membuat dan mengirim draf milik sendiri; Viewer tidak dapat upload atau submit.
- Default: draf dan sumber scan hanya dapat dilihat pembuatnya yang masih memiliki akses ruang. Owner tidak otomatis membaca draf privat Editor.
- Setelah submit, field transaksi mengikuti akses anggota ruang. Berkas gambar tidak otomatis menjadi lampiran bersama.
- Draf tidak dipindahkan lintas ruang. Jika ruang tujuan salah, batalkan dan mulai baru pada ruang yang benar.
- Membership dicabut: akses file/draf dan submit ditolak meski job OCR sudah berjalan. Callback hanya boleh memperbarui state teknis yang aman, tidak mem-posting atau membocorkan hasil.
- Simpan file privat, gunakan URL bertanda tangan berumur pendek bila diperlukan. Jangan menaruh URL publik, image bytes, OCR mentah, rekening, atau catatan sensitif pada log/analitik.
- Validasi file, sanitasi metadata, batasi ukuran/resolusi/dekode serta frekuensi upload, dan hapus file sesuai lifecycle yang ditetapkan.
- Provider, lokasi pemrosesan, retensi berkas/draf, penghapusan pasca-submit/batal, dan pemberitahuan pengguna harus ditetapkan sebelum fitur upload produksi aktif. Jangan mengganti keputusan ini dengan retensi tanpa batas.
- OCR lokal memproses gambar di browser dan hanya mengirim field terstruktur yang diperlukan untuk draf. Teks mentah tidak dikirim/disimpan. Aset worker/model berasal dari origin aplikasi; jika arsitektur ini berubah atau provider eksternal ditambahkan, keputusan privasi dan consent harus diperbarui lebih dahulu.

## 4. F21 — periode mengikuti tanggal gajian

### Model periode

- Setiap ruang memiliki satu aturan hari mulai 1–31 dan zona waktu. Owner mengubahnya; Editor/Viewer mengikuti aturan ruang.
- Default hari 1 merepresentasikan bulan kalender. Ruang pribadi dan bersama boleh memakai hari berbeda.
- Siklus bukan bergantung pada transaksi Gaji. Gaji terlambat, bonus, akhir pekan, atau hari libur tidak memindahkan batas otomatis.
- Untuk bulan M dan hari konfigurasi D, anchor(M,D) = tanggal min(D, jumlah_hari(M)) pada bulan M.
- Periode reguler adalah `[anchor(M,D), anchor(M+1,D))`: awal inklusif, akhir eksklusif. Tampilan akhir inklusif = end_date_exclusive minus satu hari kalender.
- Hitung anchor setiap bulan dari D asli. Jangan memakai penambahan 30 hari atau menambahkan satu bulan dari hasil clamp sebelumnya.
- Transaksi dipetakan melalui `start_date <= transaction_date < end_date_exclusive`. Semua transaksi valid pada rentang yang dibentuk harus masuk tepat satu periode.
- Tanggal, bukan timestamp UTC yang dikonversi sembarang, menjadi dasar keanggotaan periode. Perubahan zona waktu tidak mengubah tanggal historis transaksi.

### Contoh batas wajib

| Hari mulai | Periode tampilan | Batas internal |
|---|---|---|
| 1 | 1–30 September 2026 | [2026-09-01, 2026-10-01) |
| 25 | 25 September–24 Oktober 2026 | [2026-09-25, 2026-10-25) |
| 31 | 31 Januari–27 Februari 2026 | [2026-01-31, 2026-02-28) |
| 31 | 28 Februari–30 Maret 2026 | [2026-02-28, 2026-03-31) |
| 31 | 31 Januari–28 Februari 2028 | [2028-01-31, 2028-02-29) |
| 31 | 29 Februari–30 Maret 2028 | [2028-02-29, 2028-03-31) |

### Mengubah hari mulai dan langsung merebasis periode aktif

Aturan ini berasal dari D27 dan menggantikan default prospektif W06:

1. Tampilkan aturan sekarang, aturan baru, rentang aktif baru, histori transisi yang akan terbentuk, dan periode reguler berikutnya sebelum menyimpan.
2. Hitung periode alami aturan baru yang mencakup hari ini: `[N_start,N_end)`.
3. Awal aktif baru adalah nilai yang lebih akhir antara awal aktif lama dan `N_start`. Akhir aktif baru adalah `N_end`. Dengan ini, periode yang telah ditutup sebelum awal aktif lama tidak pernah dibuka atau ditulis ulang.
4. Jika awal aktif baru bergerak maju, simpan prefix `[old_start,new_start)` sebagai periode transisi historis. Pertahankan ID periode aktif pada rentang baru agar budget aktif tetap terhubung; prefix tidak otomatis mendapat salinan budget.
5. Jika `N_start` berada sebelum awal aktif lama, pertahankan awal lama dan pendekkan akhir ke `N_end`. Tandai periode aktif sebagai transisi sampai anchor reguler berikutnya. Tidak boleh ada gap atau overlap.
6. Transaksi tidak dipindahkan atau diubah. Dashboard, realisasi budget, laporan default, dan drill-down aktif langsung memakai batas baru sehingga transaksi di luar rentang baru berpindah ke tampilan histori sesuai tanggalnya.
7. Periode masa depan tanpa budget boleh dihapus dan dibentuk ulang oleh resolver. Jika periode masa depan memiliki budget, tolak perubahan dengan alasan jelas; jangan menghapus, memindahkan, atau memprorata limit diam-diam.
8. Simpan versi pengaturan dan audit di transaksi serializable dengan lock workspace. Beberapa perubahan pada tanggal yang sama tetap menghasilkan versi monoton; `effective_date` boleh sama.

Contoh A: pada 27 September, aturan hari 1 diubah ke hari 25. Prefix 1–24 September menjadi histori transisi, sedangkan periode aktif langsung menjadi 25 September–24 Oktober. Budget aktif yang sama kini direalisasikan hanya dari transaksi mulai 25 September.

Contoh B: pada 27 September, periode aktif lama dimulai 25 September lalu aturan diubah ke hari 1. Periode aktif langsung menjadi transisi 25–30 September, kemudian periode reguler 1–31 Oktober. Periode sebelum 25 September tetap utuh.

Menghitung ulang periode yang telah ditutup dengan sengaja, periode per akun, gajian dua kali sebulan, dan tanggal gajian berubah setiap bulan berada di luar baseline.

### Agregasi dan UI

- Pemilih menampilkan “25 Sep–24 Okt 2026”, bukan hanya “Oktober”. Hari akhir pada UI inklusif.
- Semua kartu pemasukan/pengeluaran, budget, laporan, kategori, transaksi terbaru, drill-down, dan ekspor memakai period_id/batas yang sama.
- Grafik enam periode menggunakan enam periode tersimpan; periode aktif dan transisi ditandai agar tidak disamakan dengan periode lengkap.
- Saldo saat ini tetap seluruh transaksi tersubmit sampai saat ini. Mengganti periode tidak mengubah saldo akun.
- Filter tanggal bebas pada transaksi/laporan hanya mengubah hasil query. Jangan menyatakan hasil filter tersebut sebagai realisasi budget siklus kecuali rentangnya sama.
- Budget unik per ruang, kategori, dan period_id. Menyalin budget tidak otomatis membawa sisa atau overspending.
- Pemilih historis hanya menampilkan periode ruang yang telah terbentuk sampai periode aktif. Periode masa depan terencana tidak ditawarkan sebagai histori.
- Budget historis bersifat baca saja. Mutasi biasa dan target penyalinan selalu periode aktif agar histori tidak berubah dari form lama atau URL yang dimanipulasi.
- Salin budget memakai periode tepat sebelumnya sebagai sumber, menampilkan kategori dan limit sebelum submit, serta hanya menyalin kategori aktif yang dipilih. Kategori yang sudah memiliki budget pada target dilewati pada pratinjau dan ditolak bila terjadi konflik saat submit; tidak ada overwrite diam-diam.
- Tanggal transaksi yang dikoreksi memindahkan realisasi ke periode yang sesuai; batas periode tidak berubah.

## 5. Kontrak lintas fitur

- Scan tanggal 24 Sep yang disubmit 26 Sep tetap masuk periode yang mencakup 24 Sep, bukan periode tanggal submit.
- Kategori baru dari form scan harus aktif dan berada di ruang yang sama; hanya Owner boleh membuatnya.
- Kategori diarsipkan, akun diarsipkan, atau izin berubah saat OCR berjalan: minta perbaikan/menolak submit; jangan posting diam-diam.
- Setiap cache/agregat diidentifikasi dengan workspace dan rentang/period_id. Perubahan ruang membuang hasil UI ruang sebelumnya.
- Nilai chart, laporan, export, dan daftar sumber harus dapat direkonsiliasi. Angka mockup bukan fixture produksi wajib.
