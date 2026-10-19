"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  FileImage,
  Maximize2,
  ScanText,
  Send,
  Smartphone,
  X,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { sectionHref } from "@/lib/navigation";

type GuideKind = "telegram" | "iphone";
type GuideStep = {
  title: string;
  description: string;
  illustration: ReactNode;
  instructions: ReactNode;
};

function Highlight({ children }: { children: ReactNode }) {
  return (
    <div className="relative rounded-lg border-2 border-primary bg-primary/10 p-2 text-xs">
      <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
        1
      </span>
      {children}
    </div>
  );
}

function Phone({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="guide-phone mx-auto w-52 max-w-full rounded-[1.7rem] border-[5px] border-muted-foreground/50 bg-background p-2 shadow-md">
      <div className="mb-2 flex items-center justify-between px-1 text-[10px] font-semibold">
        <span>9:41</span>
        <span className="h-3 w-12 rounded-full bg-muted-foreground/40" />
        <span>100%</span>
      </div>
      <p className="mb-3 border-b pb-2 text-center text-xs font-semibold">
        {title}
      </p>
      <div className="min-h-48 space-y-2 text-xs">{children}</div>
      <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-muted-foreground/60" />
    </div>
  );
}

function PhoneRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-card p-2 text-xs">
      {children}
      <ChevronRight
        className="size-3 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}

function Instruction({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
  );
}

const telegramSteps: GuideStep[] = [
  {
    title: "Pilih akun dan kategori default",
    description:
      "Alokasi memakai pilihan ini jika pesan tidak menyebut akun atau kategori.",
    illustration: (
      <Phone title="Pengaturan Alokasi">
        <div className="rounded-lg bg-card p-3">
          <p className="mb-2 font-semibold">Catat lewat Telegram</p>
          <p className="mb-1 text-muted-foreground">Akun default</p>
          <PhoneRow>Mandiri</PhoneRow>
          <p className="mb-1 mt-3 text-muted-foreground">
            Kategori pengeluaran
          </p>
          <PhoneRow>Makan & minum</PhoneRow>
          <p className="mb-1 mt-3 text-muted-foreground">Kategori pemasukan</p>
          <PhoneRow>Gaji</PhoneRow>
          <div className="mt-3">
            <Highlight>Hubungkan Telegram</Highlight>
          </div>
        </div>
      </Phone>
    ),
    instructions: (
      <div className="space-y-3">
        <Instruction>
          Di Pengaturan Alokasi, pilih akun serta kategori default untuk
          pengeluaran dan pemasukan, lalu ketuk{" "}
          <strong>Hubungkan Telegram</strong>.
        </Instruction>
        <Instruction>
          “Beli kopi 25rb” menjadi pengeluaran. Gunakan “pemasukan: gaji 5jt”
          untuk pemasukan. Tambahkan “bca” untuk memilih akun BCA.
        </Instruction>
      </div>
    ),
  },
  {
    title: "Buka tautan di Telegram",
    description: "Tautan menghubungkan chat pribadi dengan ruang Alokasi Anda.",
    illustration: (
      <Phone title="Bot Alokasi · Telegram">
        <div className="rounded-lg bg-card p-3 leading-relaxed">
          Halo! Saya akan membantu mencatat pemasukan dan pengeluaran setelah
          Anda memeriksanya.
        </div>
        <div className="pt-4 text-center">
          <Highlight>Mulai / Start</Highlight>
        </div>
      </Phone>
    ),
    instructions: (
      <div className="space-y-3">
        <Instruction>
          Buka tautan yang muncul di Alokasi dalam 15 menit, lalu tekan{" "}
          <strong>Mulai / Start</strong> pada chat bot.
        </Instruction>
        <Instruction>
          Gunakan akun Telegram milik Anda. Setiap akun Telegram terhubung ke
          satu ruang Alokasi.
        </Instruction>
      </div>
    ),
  },
  {
    title: "Periksa dan simpan dari chat",
    description:
      "Bot menyiapkan draf; saldo baru berubah setelah Anda menyimpannya.",
    illustration: (
      <Phone title="Bot Alokasi · Telegram">
        <p className="ml-auto w-fit rounded-lg bg-primary/10 px-2 py-1">
          beli kopi 25rb bca
        </p>
        <div className="rounded-lg bg-card p-3">
          <p className="mb-2 font-semibold">Periksa pengeluaran</p>
          <p>Beli kopi · Rp 25.000</p>
          <p className="text-muted-foreground">BCA · Makan & minum</p>
          <div className="mt-3">
            <Highlight>✓ Simpan</Highlight>
          </div>
          <p className="mt-2 text-muted-foreground">Koreksi · Batal</p>
        </div>
      </Phone>
    ),
    instructions: (
      <div className="space-y-3">
        <Instruction>
          Kirim pesan seperti <strong>beli kopi 25rb bca</strong>. Periksa
          judul, nominal, akun, kategori, dan tanggal pada balasan bot.
        </Instruction>
        <Instruction>
          Untuk pemasukan, gunakan awalan, misalnya{" "}
          <strong>pemasukan: gaji 5jt bca</strong>.
        </Instruction>
        <Instruction>
          Pilih <strong>Koreksi</strong> untuk memperbaiki draf,{" "}
          <strong>Simpan</strong> untuk mencatat transaksi, atau{" "}
          <strong>Batal</strong> untuk membuangnya.
        </Instruction>
      </div>
    ),
  },
];

const iphoneSteps: GuideStep[] = [
  {
    title: "Siapkan token di Alokasi",
    description:
      "Token mengizinkan pintasan iPhone membuat draf di ruang Anda.",
    illustration: (
      <Phone title="Pengaturan Alokasi">
        <div className="rounded-lg bg-card p-3">
          <p className="font-semibold">Shortcut iPhone</p>
          <div className="mt-3">
            <Highlight>Buat token Shortcut</Highlight>
          </div>
          <p className="mt-3 break-all text-muted-foreground">
            Endpoint · https://…/receipt-drafts
          </p>
          <p className="mt-2 text-muted-foreground">Token · ••••••••••••</p>
        </div>
      </Phone>
    ),
    instructions: (
      <div className="space-y-3">
        <Instruction>
          Di <strong>Pengaturan → Shortcut iPhone</strong>, pilih akun dan
          kategori default. Ketuk <strong>Buat token Shortcut</strong>, lalu
          salin Endpoint dan Token yang ditampilkan.
        </Instruction>
        <Instruction>
          Token hanya ditampilkan sekali. Simpan di pintasan pribadi dan jangan
          sertakan token pada screenshot yang dibagikan.
        </Instruction>
      </div>
    ),
  },
  {
    title: "Ambil screenshot dan ekstrak teks",
    description:
      "Kedua hasil ini akan dipakai secara terpisah saat mengirim draf.",
    illustration: (
      <Phone title="Catat ke Alokasi · Pintasan">
        <PhoneRow>
          <span className="flex items-center gap-2">
            <Camera className="size-4" />
            Ambil tangkapan layar
          </span>
        </PhoneRow>
        <div className="pt-1">
          <Highlight>
            <span className="flex items-center gap-2">
              <ScanText className="size-4" />
              Ekstrak teks dari <strong>Tangkapan Layar</strong>
            </span>
          </Highlight>
        </div>
      </Phone>
    ),
    instructions: (
      <div className="space-y-3">
        <Instruction>
          Di aplikasi <strong>Pintasan</strong>, buat “Catat ke Alokasi”.
          Tambahkan <strong>Ambil Tangkapan Layar</strong> lalu{" "}
          <strong>Ekstrak Teks dari Gambar</strong>.
        </Instruction>
        <Instruction>
          Pastikan input ekstraksi teks adalah variabel hasil{" "}
          <strong>Tangkapan Layar</strong> dari tindakan pertama.
        </Instruction>
      </div>
    ),
  },
  {
    title: "Isi URL dan Authorization",
    description:
      "Permintaan dikirim ke Endpoint Alokasi menggunakan metode POST.",
    illustration: (
      <Phone title="Dapatkan konten URL">
        <PhoneRow>URL · Endpoint Alokasi</PhoneRow>
        <PhoneRow>Metode · POST</PhoneRow>
        <p className="pt-2 text-muted-foreground">HEADER</p>
        <Highlight>
          <span className="block font-semibold">Authorization</span>
          <code className="mt-1 block break-all">Bearer alokasi_ios_••••</code>
        </Highlight>
      </Phone>
    ),
    instructions: (
      <div className="space-y-3">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Tindakan URL</dt>
            <dd className="mt-1">
              Tempel <strong>Endpoint</strong> dari Pengaturan Alokasi.
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Dapatkan konten URL</dt>
            <dd className="mt-1">
              Pilih metode <code className="rounded bg-muted px-1">POST</code>,
              lalu tambah header bernama{" "}
              <code className="rounded bg-muted px-1">Authorization</code>.
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Nilai header</dt>
            <dd className="mt-1 break-all rounded-lg bg-muted p-2 font-mono text-xs">
              Bearer TOKEN_SHORTCUT_ANDA
            </dd>
          </div>
        </dl>
        <Instruction>
          Ketik “Bearer”, satu spasi, lalu tempel Token asli dari Alokasi
          sebagai pengganti TOKEN_SHORTCUT_ANDA.
        </Instruction>
      </div>
    ),
  },
  {
    title: "Kirim text dan image sebagai Form",
    description:
      "Gambar dikirim sebagai file agar muncul di halaman pemeriksaan.",
    illustration: (
      <Phone title="Dapatkan konten URL">
        <PhoneRow>Minta Isi · Form</PhoneRow>
        <div className="rounded-lg bg-card p-2">
          <strong>text</strong> · Teks
          <p className="mt-1 text-primary">Teks dari Gambar</p>
        </div>
        <Highlight>
          <strong>image</strong> · File
          <p className="mt-1 text-primary">Tangkapan Layar</p>
        </Highlight>
      </Phone>
    ),
    instructions: (
      <div className="space-y-3 text-sm">
        <Instruction>
          Pada <strong>Dapatkan konten URL</strong>, pilih{" "}
          <strong>Minta Isi → Form</strong>. Tambahkan dua field berikut:
        </Instruction>
        <div className="rounded-lg border p-3">
          <code className="font-semibold">text</code> · jenis{" "}
          <strong>Teks</strong>
          <p className="mt-1 text-muted-foreground">
            Nilai: variabel <strong>Teks dari Gambar</strong>.
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <code className="font-semibold">image</code> · jenis{" "}
          <strong>File</strong>
          <p className="mt-1 text-muted-foreground">
            Nilai: variabel <strong>Tangkapan Layar</strong>, bukan tulisan
            biasa.
          </p>
        </div>
        <Instruction>
          Nama field persis <code>image</code>. Gambar JPEG, PNG, atau WebP
          maksimal 4 MB. Jika terlalu besar, ubah ukurannya atau konversi ke
          JPEG dan pakai hasilnya untuk field image.
        </Instruction>
      </div>
    ),
  },
  {
    title: "Buka draf dengan reviewUrl",
    description: "Respons Alokasi berisi alamat halaman untuk meninjau draf.",
    illustration: (
      <Phone title="Catat ke Alokasi · Pintasan">
        <Highlight>
          <strong>Dapatkan Nilai Kamus</strong>
          <p className="mt-1">reviewUrl di Konten URL</p>
        </Highlight>
        <div className="mt-3">
          <PhoneRow>Buka URL · Nilai Kamus</PhoneRow>
        </div>
      </Phone>
    ),
    instructions: (
      <div className="space-y-3">
        <Instruction>
          Tambahkan <strong>Ambil Nilai Kamus / Get Dictionary Value</strong>.
          Isi key <code>reviewUrl</code> dari hasil{" "}
          <strong>Dapatkan konten URL</strong>.
        </Instruction>
        <Instruction>
          Tambahkan <strong>Buka URL</strong> dengan input variabel{" "}
          <strong>Nilai Kamus</strong>. Izinkan akses jaringan saat iPhone
          memintanya.
        </Instruction>
      </div>
    ),
  },
  {
    title: "Pasang pada Ketuk Bagian Belakang",
    description: "Pilih Ketuk Tiga Kali agar pintasan tidak mudah terpicu.",
    illustration: (
      <Phone title="Ketuk Tiga Kali">
        <PhoneRow>Buka kamera</PhoneRow>
        <Highlight>
          Catat ke Alokasi{" "}
          <Check className="ml-1 inline size-3" aria-hidden="true" />
        </Highlight>
        <PhoneRow>Catatan cepat</PhoneRow>
      </Phone>
    ),
    instructions: (
      <Instruction>
        Buka{" "}
        <strong>
          Pengaturan iPhone → Aksesibilitas → Sentuh → Ketuk Bagian Belakang →
          Ketuk Tiga Kali
        </strong>
        , lalu pilih pintasan <strong>Catat ke Alokasi</strong>.
      </Instruction>
    ),
  },
  {
    title: "Periksa bukti dan simpan",
    description: "Tangkapan layar membantu Anda memeriksa hasil bacaan OCR.",
    illustration: (
      <Phone title="Periksa pengeluaran · Alokasi">
        <div className="rounded-lg bg-card p-3 text-center">
          <FileImage className="mx-auto mb-2 size-5 text-primary" />
          <p>FamilyMart</p>
          <strong>Rp 11.500</strong>
        </div>
        <PhoneRow>Judul transaksi · Beli sarapan</PhoneRow>
        <PhoneRow>Catatan · FamilyMart</PhoneRow>
        <Highlight>Simpan pengeluaran</Highlight>
      </Phone>
    ),
    instructions: (
      <Instruction>
        Buka bukti bayar sampai nominal dan merchant terlihat, lalu ketuk
        belakang iPhone tiga kali. Di Alokasi, cocokkan preview gambar dengan
        judul, nominal, tanggal, akun, kategori, dan catatan. Tekan{" "}
        <strong>Simpan pengeluaran</strong> setelah sesuai.
      </Instruction>
    ),
  },
];

export function AutomationGuideDialog({
  kind,
  workspaceId,
  triggerLabel = "Cara pakai",
}: {
  kind: GuideKind;
  workspaceId: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const steps = kind === "telegram" ? telegramSteps : iphoneSteps;
  const current = steps[step];

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      setStep(0);
      setEnlarged(false);
    }
  }

  function changeStep(next: number) {
    setStep(next);
    setEnlarged(false);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={changeOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button type="button" variant="outline" className="min-h-10">
          <CircleHelp aria-hidden="true" />
          {triggerLabel}
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl">
          <div className="flex items-start gap-3 border-b px-4 py-4 pr-14 sm:px-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              {kind === "telegram" ? (
                <Send className="size-5" aria-hidden="true" />
              ) : (
                <Smartphone className="size-5" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {kind === "telegram"
                  ? "Panduan Telegram"
                  : "Panduan Back Tap iPhone"}{" "}
                · Langkah {step + 1} dari {steps.length}
              </p>
              <DialogPrimitive.Title className="mt-1 text-lg font-semibold leading-snug">
                {current.title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                {current.description}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              aria-label="Tutup panduan"
            >
              <X className="size-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="mb-5 flex gap-1.5" aria-hidden="true">
              {steps.map((_, index) => (
                <span
                  key={index}
                  className={`h-1 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
            <div
              className={`grid gap-5 ${enlarged ? "grid-cols-1" : "md:grid-cols-[14rem_minmax(0,1fr)]"}`}
            >
              <figure className="min-w-0">
                <div
                  className={`rounded-xl bg-muted p-4 ${enlarged ? "[&_.guide-phone]:w-72" : ""}`}
                >
                  {current.illustration}
                </div>
                <figcaption className="mt-2 text-center text-xs text-muted-foreground">
                  Ilustrasi tampilan · bukan screenshot asli
                </figcaption>
                <button
                  type="button"
                  aria-pressed={enlarged}
                  onClick={() => setEnlarged(!enlarged)}
                  className="mx-auto mt-2 flex min-h-10 items-center gap-2 rounded-md px-2 text-xs text-primary hover:bg-accent"
                >
                  <Maximize2 className="size-4" aria-hidden="true" />
                  {enlarged ? "Ukuran normal" : "Perbesar gambar"}
                </button>
              </figure>
              <div className="min-w-0 space-y-4">{current.instructions}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => changeStep(step - 1)}
              disabled={step === 0}
            >
              Kembali
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="ghost">
                <Link
                  href={`${sectionHref("settings", workspaceId)}#${kind === "telegram" ? "integrasi-telegram" : "integrasi-iphone"}`}
                  onClick={() => changeOpen(false)}
                >
                  Buka Pengaturan
                </Link>
              </Button>
              <Button
                type="button"
                onClick={() =>
                  step === steps.length - 1
                    ? changeOpen(false)
                    : changeStep(step + 1)
                }
              >
                {step === steps.length - 1 ? "Mengerti" : "Lanjut"}
                {step === steps.length - 1 ? (
                  <Check aria-hidden="true" />
                ) : (
                  <ArrowRight aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
