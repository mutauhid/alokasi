import Link from "next/link";
import { Layers, ShieldCheck } from "lucide-react";
import { getAuthConfig } from "@/server/auth/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type AuthSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

const messages: Record<string, string> = {
  invalid: "Periksa kembali data yang dimasukkan.",
  credentials: "Email atau password tidak sesuai.",
  signup: "Registrasi belum berhasil. Coba beberapa saat lagi.",
  "signup-disabled": "Registrasi email sedang dinonaktifkan di Supabase.",
  "email-disabled": "Provider email sedang dinonaktifkan di Supabase.",
  "email-invalid": "Alamat email tidak dapat digunakan. Periksa kembali email.",
  "email-not-authorized":
    "Alamat email belum diizinkan oleh konfigurasi Supabase.",
  "weak-password": "Password belum memenuhi kebijakan keamanan Supabase.",
  "email-rate-limit":
    "Kuota email development Supabase habis. Provider bawaan hanya mengirim 2 email per jam per proyek; tunggu hingga kuota pulih atau gunakan custom SMTP.",
  "request-rate-limit":
    "Terlalu banyak percobaan registrasi. Tunggu sebentar lalu coba lagi.",
  captcha: "Verifikasi anti-bot gagal. Muat ulang halaman lalu coba lagi.",
  callback: "Tautan verifikasi tidak valid atau sudah kedaluwarsa.",
  session: "Sesi tidak tersedia. Silakan masuk kembali.",
  unavailable: "Layanan autentikasi sedang tidak tersedia.",
  update: "Password belum dapat diperbarui.",
  config: "Supabase Auth belum dikonfigurasi pada environment lokal.",
};

function fieldClass() {
  return "mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-xs placeholder:text-muted-foreground/70";
}

export async function AuthCard({
  mode,
  searchParams,
}: {
  mode: "login" | "register" | "forgot" | "reset" | "verify";
  searchParams: AuthSearchParams;
}) {
  const query = await searchParams;
  const errorKey = typeof query.error === "string" ? query.error : "";
  const next =
    typeof query.next === "string" && query.next.startsWith("/")
      ? query.next
      : "/dashboard";
  const configured = Boolean(getAuthConfig());
  const content = {
    login: ["Masuk ke Alokasi", "Lanjutkan mengelola ruang keuanganmu."],
    register: [
      "Buat akun",
      "Mulai dengan ruang pribadi yang hanya dapat kamu akses.",
    ],
    forgot: [
      "Lupa password",
      "Kami akan mengirim tautan pemulihan jika email terdaftar.",
    ],
    reset: ["Buat password baru", "Gunakan minimal 8 karakter."],
    verify: [
      "Periksa emailmu",
      "Klik tautan verifikasi untuk mengaktifkan akun dan membuat ruang pribadi.",
    ],
  }[mode];
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="mb-7 flex justify-center"
          aria-label="Alokasi"
        >
          <span className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Layers className="size-5" aria-hidden="true" />
            </span>
            alokasi<span className="-ml-2 text-primary">.</span>
          </span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{content[0]}</CardTitle>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {content[1]}
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {!configured && (
              <p
                role="alert"
                className="rounded-lg border border-dashed bg-muted p-3 text-sm"
              >
                Isi `NEXT_PUBLIC_SUPABASE_URL` dan
                `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` di `.env.local` untuk
                mengaktifkan login.
              </p>
            )}
            {errorKey && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                {messages[errorKey] ?? "Permintaan belum berhasil."}
              </p>
            )}
            {query.signedOut === "1" && (
              <p className="rounded-lg bg-secondary p-3 text-sm">
                Kamu telah keluar.
              </p>
            )}
            {query.accountDeleted === "1" && (
              <p className="rounded-lg bg-secondary p-3 text-sm">
                Akun dan data pribadimu telah dihapus.
              </p>
            )}
            {query.accountDeletion === "pending" && (
              <p className="rounded-lg bg-secondary p-3 text-sm">
                Akses akun telah ditutup dan data pribadi dihapus. Pembersihan
                identitas autentikasi perlu diselesaikan oleh operator.
              </p>
            )}
            {query.passwordChanged === "1" && (
              <p className="rounded-lg bg-secondary p-3 text-sm">
                Password berhasil diperbarui. Silakan masuk kembali.
              </p>
            )}
            {query.sent === "1" && (
              <p className="rounded-lg bg-secondary p-3 text-sm">
                Jika email dapat digunakan, tautan sudah dikirim. Periksa inbox
                dan spam.
              </p>
            )}
            {mode === "verify" ? (
              <div className="space-y-4 text-sm text-muted-foreground">
                <ShieldCheck
                  className="size-8 text-primary"
                  aria-hidden="true"
                />
                <p>
                  Tautan verifikasi berlaku sesuai pengaturan Supabase. Jangan
                  membagikan tautan tersebut.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">Kembali ke login</Link>
                </Button>
              </div>
            ) : (
              <form
                method="post"
                action={`/auth/${mode === "register" ? "sign-up" : mode === "login" ? "sign-in" : mode === "forgot" ? "forgot-password" : "reset-password"}`}
                className="space-y-4"
              >
                {mode === "register" && (
                  <label className="block text-sm font-medium">
                    Nama tampilan
                    <input
                      name="displayName"
                      autoComplete="name"
                      required
                      maxLength={100}
                      className={fieldClass()}
                    />
                  </label>
                )}
                {mode !== "reset" && (
                  <label className="block text-sm font-medium">
                    Email
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={320}
                      className={fieldClass()}
                    />
                  </label>
                )}
                {(mode === "login" ||
                  mode === "register" ||
                  mode === "reset") && (
                  <label className="block text-sm font-medium">
                    Password
                    <input
                      name="password"
                      type="password"
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      required
                      minLength={8}
                      maxLength={128}
                      className={fieldClass()}
                    />
                  </label>
                )}
                {mode === "login" && (
                  <input type="hidden" name="next" value={next} />
                )}
                <Button
                  type="submit"
                  className="min-h-11 w-full"
                  disabled={!configured}
                >
                  {mode === "login"
                    ? "Masuk"
                    : mode === "register"
                      ? "Daftar"
                      : mode === "forgot"
                        ? "Kirim tautan"
                        : "Simpan password"}
                </Button>
              </form>
            )}
            <div className="flex flex-wrap justify-between gap-3 text-sm">
              {mode === "login" && (
                <>
                  <Link
                    className="text-primary hover:underline"
                    href="/register"
                  >
                    Buat akun
                  </Link>
                  <Link
                    className="text-primary hover:underline"
                    href="/forgot-password"
                  >
                    Lupa password?
                  </Link>
                </>
              )}
              {mode === "register" && (
                <Link className="text-primary hover:underline" href="/login">
                  Sudah punya akun? Masuk
                </Link>
              )}
              {(mode === "forgot" || mode === "reset") && (
                <Link className="text-primary hover:underline" href="/login">
                  Kembali ke login
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
