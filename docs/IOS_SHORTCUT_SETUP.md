# Pengaturan Shortcut iPhone

Alur ini menghasilkan draf untuk diperiksa; ketukan belakang iPhone tidak langsung mengubah saldo.

## 1. Siapkan integrasi di Alokasi

1. Deploy branch yang berisi fitur ini dan terapkan migrasi `20261008000000_ios_shortcut_receipts` serta `20261012000000_receipt_evidence_preview`.
2. Login ke Alokasi dari iPhone, lalu buka **Pengaturan → Shortcut iPhone**.
3. Pilih ruang yang akan dipakai, akun sumber default, dan kategori pengeluaran default.
4. Tekan **Buat token Shortcut**.
5. Salin **Endpoint** dan **Token**. Token hanya ditampilkan sekali; jangan menaruhnya di screenshot atau membagikannya.

## 2. Buat Apple Shortcut

Nama aksi dapat tampil dalam bahasa Inggris atau bahasa perangkat.

1. Buka aplikasi **Shortcuts/Pintasan**, tekan **+**, lalu beri nama `Catat ke Alokasi`.
2. Tambahkan aksi **Take Screenshot/Ambil Screenshot**.
3. Tambahkan **Extract Text from Image/Ekstrak Teks dari Gambar**. Pastikan input-nya adalah hasil aksi Screenshot.
4. Tambahkan aksi **URL**, lalu tempel nilai Endpoint dari Alokasi.
5. Tambahkan **Get Contents of URL/Ambil Isi URL** dan buka opsi lanjutannya:
   - Method: `POST`
   - Header: `Authorization`
   - Nilai header: `Bearer ` diikuti Token Alokasi, misalnya `Bearer alokasi_ios_...`
   - Request Body/Minta Isi: `Form`
   - Tambahkan field `text` bertipe **Text/Teks**; nilainya adalah magic variable hasil **Extract Text from Image**
   - Tambahkan field `image` bertipe **File**; nilainya adalah magic variable hasil **Take Screenshot**
6. Tambahkan **Get Dictionary Value/Ambil Nilai Kamus** dengan key `reviewUrl` dari hasil Get Contents of URL.
7. Tambahkan **Open URLs/Buka URL** dengan input `reviewUrl`.
8. Jalankan shortcut sekali dari editor dan izinkan akses jaringan bila iOS memintanya.

Urutan akhirnya:

`Take Screenshot → Extract Text from Image → URL → Get Contents of URL (POST Form: text + image) → Get reviewUrl → Open URLs`

Gambar harus JPEG, PNG, atau WebP dan maksimal 4 MB. Screenshot iPhone umumnya berupa PNG. Jika request terlalu besar, tambahkan **Resize Image/Ubah Ukuran Gambar** (lebar sekitar 1600 px) atau **Convert Image/Konversi Gambar** ke JPEG sebelum aksi URL, lalu pakai hasil konversi sebagai field `image`; OCR tetap boleh membaca screenshot asli.

## 3. Hubungkan ke Back Tap

1. Buka **Settings/Pengaturan → Accessibility/Aksesibilitas → Touch/Sentuh → Back Tap/Ketuk Bagian Belakang**.
2. Pilih **Double Tap** atau **Triple Tap**.
3. Pada bagian Shortcuts, pilih `Catat ke Alokasi`.

Apple mendukung [Back Tap untuk menjalankan shortcut](https://support.apple.com/guide/shortcuts/apd897693606/ios). Menu dapat sedikit berbeda antarversi iOS. Aksi HTTP `POST` dengan body Form juga tersedia melalui [Get Contents of URL](https://support.apple.com/guide/shortcuts/apd58d46713f/ios).

## 4. Cara memakai

1. Buka bukti pembayaran sampai nominal, tanggal, dan merchant terlihat.
2. Ketuk belakang iPhone dua/tiga kali sesuai pengaturan.
3. Shortcut mengambil screenshot, membaca teks, mengirim gambar privat, dan membuka draf Alokasi.
4. Cocokkan preview dengan judul transaksi, nominal, tanggal, catatan, akun, dan kategori. Nama merchant hasil OCR ditempatkan di catatan; judul tetap dipilih atau diketik pengguna dan menyediakan saran dari riwayat.
5. Tekan **Simpan pengeluaran**. Baru pada langkah ini transaksi dan saldo berubah.

Jika masih ada draf yang belum diselesaikan, screenshot berikutnya tidak menimpanya. Selesaikan atau batalkan draf lama terlebih dahulu.

## Keamanan dan pemecahan masalah

- Jika token terlihat orang lain, buka Pengaturan Alokasi dan tekan **Cabut token**, lalu buat token baru.
- Token berhenti berlaku ketika dicabut, kedaluwarsa, membership dinonaktifkan, atau role berubah menjadi Viewer.
- Respons `401` berarti token tidak valid/kedaluwarsa. Respons `400` biasanya berarti body bukan Form, field `text`/`image` salah, atau isi gambar tidak cocok dengan formatnya. Respons `413` berarti gambar melebihi 4 MB.
- Jika halaman review meminta login, loginlah pada Safari/PWA di iPhone; Alokasi akan meneruskan kembali ke URL review.
- OCR dapat keliru. Transfer antar-akun sendiri harus dibatalkan dan dicatat melalui jenis transaksi **Transfer**.
- Preview hanya dapat dibaca pemilik draf yang masih menjadi Owner/Editor ruang. Byte gambar dihapus saat draf disimpan/dibatalkan atau setelah 24 jam; gambar tidak menjadi lampiran transaksi.
