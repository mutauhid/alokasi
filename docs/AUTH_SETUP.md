# Setup autentikasi Supabase — tahap 3

Implementasi memakai email/password, cookie SSR, Proxy Next.js untuk refresh/redirect optimistis, dan pemeriksaan `getUser()` pada service server. Browser tidak mengakses schema `app`; Prisma tetap satu-satunya jalur data bisnis.

## Environment lokal

Isi `.env.local` tanpa mengirim nilainya ke chat atau commit:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# Wajib hanya untuk fitur hapus akun mandiri; jangan memakai awalan NEXT_PUBLIC_.
SUPABASE_SECRET_KEY=sb_secret_...
APP_URL=http://localhost:3000
```

Publishable key memang dapat hadir di browser, tetapi bukan izin membaca data bisnis. Jangan memakai secret key/service-role key pada variabel `NEXT_PUBLIC_*`. Credential PostgreSQL tetap server-only.

`SUPABASE_SECRET_KEY` diperoleh dari Project Settings > API Keys dan hanya dibaca server untuk menghapus identitas Auth setelah data aplikasi dinonaktifkan. Proyek lama dapat memakai `SUPABASE_SERVICE_ROLE_KEY` sebagai fallback sementara. Jangan mengirim nilainya melalui chat, memasukkannya ke log, bundle browser, atau commit. Tanpa key ini, UI tetap menampilkan dampak tetapi tombol hapus akun dinonaktifkan.

Validasi koneksi read-only:

```powershell
npm run auth:check
```

Command hanya memanggil endpoint health melalui HTTPS dan tidak membuat user atau mengirim email.

## Pengaturan dashboard Supabase

Pada Authentication:

1. Aktifkan provider Email dan pertahankan **Confirm email** untuk proyek hosted.
2. URL Configuration: Site URL development `http://localhost:3000` dan Redirect URL `http://localhost:3000/auth/confirm`.
3. Saat deploy, tambahkan URL HTTPS produksi yang tepat. Jangan memakai wildcard luas untuk produksi.
4. Template default `{{ .ConfirmationURL }}` dapat kembali ke `emailRedirectTo` dan PKCE `code`. Route `/auth/confirm` juga mendukung template server-side berbasis `token_hash` dengan type `email`, `signup`, `recovery`, atau `invite`.
5. Reset password diarahkan ke `/auth/confirm?next=/reset-password`. `next` hanya menerima path internal, sehingga tidak dapat dipakai sebagai open redirect.
6. SMTP bawaan hanya untuk pengembangan sangat terbatas: saat ini maksimal 2 email per jam per proyek dan hanya dapat mengirim ke alamat anggota tim organisasi. Jika muncul `over_email_send_rate_limit`, tunggu sampai bucket per jam pulih; mengganti alamat tujuan tidak menghindari limit proyek.
7. Pasang custom SMTP sebelum menguji banyak registrasi atau mengundang pengguna di luar tim. Setelah custom SMTP aktif, sesuaikan batas pada Authentication > Rate Limits dan uji deliverability, reputasi domain, serta template sebelum beta.

### Bypass khusus development

Untuk akun dummy lokal, **Confirm email** boleh dimatikan sementara pada Authentication > Providers > Email. Registrasi baru kemudian menghasilkan session langsung; aplikasi memverifikasi session di server, menjalankan provisioning ruang pribadi, dan masuk ke dashboard tanpa email. Mode ini hanya untuk development dan harus diaktifkan kembali sebelum pengujian staging/produksi.

Perubahan Confirm email tidak mengonfirmasi akun lama secara otomatis. Hapus akun dummy yang belum terverifikasi melalui Authentication > Users lalu registrasikan ulang, atau konfirmasi akun tersebut dengan fasilitas admin Supabase. Penghapusan ini hanya untuk identitas dummy yang memang boleh dibuang.

Restart `npm run dev` setelah perubahan `.env.local` karena nilai `NEXT_PUBLIC_*` dibundel untuk browser/build.

## Alur yang tersedia

- `/register`: nama, email, password minimal 8 karakter; Supabase mengirim verifikasi.
- `/auth/confirm`: menukar PKCE code/token hash, memverifikasi user terkini, lalu provisioning atomik.
- Provisioning idempotent membuat satu profil, satu ruang pribadi, satu membership Owner aktif, delapan kategori bawaan, aturan siklus default tanggal 1, dan periode aktif. Retry tidak membuat duplikat.
- `/login`: autentikasi password, verifikasi email, provisioning repair/idempotent, lalu kembali ke path internal yang diminta.
- `/forgot-password`: selalu menampilkan respons generik agar tidak membocorkan apakah email terdaftar.
- `/reset-password`: memerlukan session recovery yang valid.
- `/auth/sign-out`: logout session browser saat ini.
- Menu akun pada sidebar menyediakan Profil & Pengaturan dan Keluar. Profil dapat memperbarui nama tampilan. Ganti password meminta password saat ini, password baru minimal delapan karakter yang berbeda, serta konfirmasi; keberhasilan mencabut seluruh sesi dan kembali ke login.
- Pengaturan pada ruang pribadi menyediakan hapus akun mandiri. User harus mengetik email persis, memasukkan password, serta mengalihkan atau menghapus semua ruang bersama yang masih dimiliki. Ruang pribadi dihapus; histori transaksi bersama tetap ada dengan profil anonim; seluruh refresh token dicabut dan identitas Auth dihapus melalui credential server-only.

Mutation auth menolak Origin yang tidak sama. Redirect auth memakai cache `private, no-store`. Proxy memakai `getClaims()` untuk refresh/redirect cepat; halaman/data terlindungi memakai `getUser()` dan membership aplikasi terbaru. Proxy bukan lapisan otorisasi data.

## Yang belum termasuk

Registrasi email nyata belum dijalankan otomatis karena akan membuat identitas dan mengirim email. Lakukan smoke manual dengan alamat development yang Anda kendalikan setelah callback allowlist siap. Catat hasil tanpa menyimpan password/token.

Provider email bawaan Supabase memiliki kuota kecil yang dipakai bersama oleh registrasi, recovery, dan operasi Auth lain yang mengirim email. Kegagalan karena kuota tidak membatalkan kebutuhan verifikasi; jangan mematikan Confirm email sebagai solusi permanen. Referensi operasional: [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits) dan [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

Ruang bersama, invitation berbasis tautan, peran anggota, transfer kepemilikan, autentikasi ulang password untuk penghapusan, dan revoke session global pada hapus akun sudah tersedia. Pengiriman email undangan otomatis, perubahan profil/zona waktu, OAuth reauthentication, retry cleanup Auth, rate limit tambahan aplikasi, CAPTCHA, MFA, dan kebijakan SMTP produksi belum termasuk. Rate limit provider tetap berlaku, tetapi perlu keputusan operasional sebelum publik.

Referensi: [Supabase SSR Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs), [password auth](https://supabase.com/docs/guides/auth/passwords), dan [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
