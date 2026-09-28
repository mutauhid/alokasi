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

- Tiga kartu utama: total saldo saat ini, pemasukan periode, pengeluaran periode. Kartu saldo menjadi penekanan visual.
- Panel arus kas: pemasukan versus pengeluaran dan arus kas bersih, dengan tanggal/rentang serta label periode belum lengkap.
- Panel budget: progress per kategori, persentase, dan teks status; warna tidak menjadi satu-satunya indikator.
- Transaksi terbaru dan akun keuangan menjadi bagian berikutnya. PRD mensyaratkan lima transaksi terbaru; mockup yang menampilkan empat bukan perubahan requirement.
- Rincian kategori terbesar dan drill-down tetap mengikuti PRD meskipun belum seluruhnya dibuat pada prototype.
- Saldo bukan “uang aman dibelanjakan”. Sisa budget bukan saldo.

## Perluasan F05 — kategori

- Pengaturan → Kategori memakai daftar ringkas dengan tab jenis dan status aktif/arsip.
- Dialog/form tambah kategori hanya meminta nama dan jenis, dengan validasi inline.
- Akses cepat “Tambah kategori” pada pemilih kategori Owner; selesai membuat kategori kembali ke draf sebelumnya tanpa kehilangan input.
- Editor/Viewer tidak mendapat tombol mutasi; izin tetap diverifikasi server.

## Perluasan F18 — scan

- Tawarkan “Isi manual” dan “Scan struk” pada alur tambah pengeluaran.
- Setelah memilih gambar: tampilkan pratinjau, status ekstraksi, dan opsi membatalkan/mengganti gambar.
- Review desktop: gambar sumber dan form berdampingan jika cukup ruang. Mobile: gambar lalu form, tanpa scroll horizontal.
- Judul “Periksa pengeluaran”; badge “Draf”; nama ruang terlihat.
- Field nominal, tanggal, merchant/catatan, kategori, dan akun dapat diperiksa. Field tidak pasti diberi teks “Perlu diperiksa”, bukan hanya warna.
- Tombol utama “Simpan pengeluaran” hanya setelah form valid; sukses menuju transaksi hasil, bukan mengulang submit.
- Jangan menampilkan toast “Pengeluaran tersimpan” ketika OCR baru selesai. Gunakan “Hasil scan siap diperiksa”.
- Error/timeout menyediakan input manual. Tidak ada nilai keuangan fiktif untuk menutupi OCR gagal.

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

## Lifecycle ruang bersama

- Owner melihat kartu “Alihkan kepemilikan” dengan calon Owner aktif, penjelasan bahwa penerima harus menyetujui, masa berlaku permintaan, dan tombol pembatalan.
- Anggota tujuan melihat kartu permintaan yang berbeda dengan tindakan “Terima kepemilikan”. Anggota lain tidak mendapat tindakan menerima.
- Setelah penerimaan, label peran dan kontrol halaman mengikuti role terbaru pada request berikutnya; Owner lama menjadi Editor.
- Editor/Viewer melihat kartu “Keluar dari ruang” dengan dampak akses dan histori. Owner melihat penjelasan transfer dan tidak mendapat tombol keluar langsung.
- Owner melihat kartu “Hapus ruang bersama” bergaya bahaya setelah kontrol lifecycle lain. Kartu menampilkan hitungan data terdampak, tautan/anjuran ekspor, nama ruang yang harus diketik persis, field password, dan tombol destruktif yang baru aktif setelah kedua isian lengkap.
- Sukses penghapusan membawa Owner ke ruang pribadi dan menghilangkan ruang lama dari pemilih. Error nama, autentikasi, atau konflik versi harus berbeda dan tidak boleh ditampilkan sebagai sukses parsial.

## State wajib dan responsivitas

- Loading, kosong, gagal, berhasil, validasi, konflik edit, akses dicabut, dan draft belum tersimpan memiliki state yang berbeda.
- Data kosong tidak memakai saldo demo. Kegagalan API tidak ditampilkan sebagai saldo nol.
- Nama ruang selalu jelas sebelum submit; pergantian ruang tidak menghilangkan input tanpa keputusan pengguna.
- Desktop sekitar 1024 px mengikuti komposisi mockup; pada layar sempit panel ditumpuk, navigasi diringkas, kontrol tetap tersedia.
- Uji minimal 360 px dan desktop, keyboard, label input, fokus, serta target sentuh sekitar 44 px.
- Tombol yang belum diimplementasikan tidak berpura-pura berhasil. Simulasi harus dilabeli.

## Batas otoritas mockup

Mockup menunjukkan arah visual dan interaksi, bukan kontrak domain. Jangan menyalin nama demo, tanggal tetap, seluruh dataset, penyimpanan memory-only, aturan izin yang belum diimplementasikan, atau grafik contoh ke produksi. Jika prototype berbeda dari PRD/DOMAIN_RULES, gunakan dokumen tersebut untuk perilaku dan pertahankan desain visualnya.
