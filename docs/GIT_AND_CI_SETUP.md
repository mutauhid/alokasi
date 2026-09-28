# Git repository dan CI

Dokumen ini menjelaskan alur Git lokal, GitHub, dan GitHub Actions untuk Alokasi. File rahasia seperti `.env.local`, `.env.test.local`, sertifikat, hasil build, dan laporan test sudah dikecualikan melalui `.gitignore`.

## 1. Repository lokal

Repository memakai branch utama `main`. Identitas commit pada komputer ini dapat diperiksa dengan:

```powershell
git config --global user.name
git config --global user.email
```

Alur kerja harian yang disarankan:

```powershell
git switch -c feature/nama-fitur
# ubah kode dan jalankan pemeriksaan
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
git add .
git commit -m "feat: jelaskan perubahan"
```

Jangan memasukkan connection string, password, token, service key, atau isi sertifikat ke commit. Periksa daftar file sebelum commit dengan `git status` dan diff dengan `git diff --staged`.

## 2. Membuat repository GitHub

1. Buat repository baru di GitHub. Gunakan nama seperti `financial-management` dan pilih visibilitas private selama aplikasi serta prosedur produksi belum selesai.
2. Biarkan repository baru kosong: jangan tambahkan README, `.gitignore`, atau license dari GitHub karena semuanya sudah tersedia lokal.
3. Salin URL HTTPS repository, lalu jalankan dari root proyek:

```powershell
git remote add origin https://github.com/USERNAME/financial-management.git
git remote -v
git push -u origin main
```

Ganti `USERNAME` sesuai akun atau organisasi GitHub. Git Credential Manager akan membuka login browser bila diperlukan. Jangan menaruh personal access token di file proyek atau percakapan.

Jika remote `origin` sudah ada, periksa dulu dengan `git remote -v`; ubah hanya jika alamatnya memang salah:

```powershell
git remote set-url origin https://github.com/USERNAME/financial-management.git
```

## 3. Continuous Integration

Workflow [ci.yml](../.github/workflows/ci.yml) berjalan untuk pull request, push ke `main`, dan pemicu manual. Terdapat dua job:

- `Quality`: install dependency dari lockfile, format check, lint, TypeScript, unit test, dan build produksi.
- `Database`: menyalakan PostgreSQL 17 sementara, menerapkan semua migrasi, lalu menjalankan integration test database.

Database CI hanya hidup selama job dan tidak memakai Supabase development/production. Karena itu tidak ada credential Supabase atau database production yang perlu ditambahkan sebagai GitHub Actions secret untuk workflow ini.

Setelah push pertama, buka tab **Actions** pada repository GitHub dan pastikan job `Quality` serta `Database` berwarna hijau. Jika gagal, buka job dan langkah merah; perbaiki akar masalah di branch, lalu push commit baru.

## 4. Branch dan perlindungan `main`

Setelah workflow pertama tercatat, buat ruleset branch untuk `main` di pengaturan repository:

- wajibkan pull request sebelum merge;
- wajibkan status check `Quality` dan `Database`;
- wajibkan branch sudah mengikuti versi terbaru sebelum merge;
- blokir force push dan penghapusan branch `main`.

Pekerjaan berikutnya dilakukan pada branch fitur, lalu dibuka sebagai pull request. CI memeriksa perubahan sebelum merge.

## 5. Batas CI saat ini

CI belum melakukan deploy, tidak mengirim email, dan belum menjalankan browser test terautentikasi. Deployment staging memerlukan pilihan hosting, konfigurasi environment, SMTP, backup/restore, observability, serta smoke test terhadap lingkungan staging. Secret staging/production baru ditambahkan ketika target deployment sudah dipilih; jangan memakai credential development sebagai pengganti.
