# Sertifikat database lokal

Unduh **server root certificate** dari Supabase → Database Settings → SSL Configuration.
Simpan sebagai `certs/prod-supabase.cer` (format PEM, dimulai `-----BEGIN CERTIFICATE-----`).
Isi `DATABASE_SSL_ROOT_CERT=certs/prod-supabase.cer` pada `.env.local` dan `.env.test.local` sesuai database yang diuji.

Jalankan `npm run db:check:runtime`; hasil koneksi remote wajib `tls: true` dan `tlsVerified: true`.
Jangan menonaktifkan verifikasi TLS atau memasukkan private key pada folder ini.
