"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  BookOpen,
  Check,
  Crown,
  Eye,
  Layers3,
  LoaderCircle,
  MailPlus,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  changeMemberRoleAction,
  createSharedWorkspaceAction,
  revokeInvitationAction,
  revokeMemberAction,
} from "@/app/(workspace)/workspace-actions";
import { InvitationForm } from "@/components/invitation-form";
import { AppSelect } from "@/components/ui/app-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "editor" | "viewer";
  status: "active" | "revoked";
  version: number;
  isCurrentUser: boolean;
};

type PendingInvitation = {
  id: string;
  email: string;
  role: "owner" | "editor" | "viewer";
  createdLabel: string;
  expiresLabel: string;
};

const roleLabel = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
} as const;

function PendingSubmit({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-xl px-5"
    >
      {pending && (
        <LoaderCircle
          className="size-4 motion-safe:animate-spin"
          aria-hidden="true"
        />
      )}
      {pending ? "Memproses…" : children}
    </Button>
  );
}

function RoleSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending && (
        <LoaderCircle
          className="size-3.5 motion-safe:animate-spin"
          aria-hidden="true"
        />
      )}
      {pending ? "Menyimpan…" : "Simpan"}
    </Button>
  );
}

function DestructiveSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="destructive"
      className="min-h-11"
      disabled={pending}
    >
      {pending ? (
        <LoaderCircle
          className="size-4 motion-safe:animate-spin"
          aria-hidden="true"
        />
      ) : (
        <Trash2 className="size-4" aria-hidden="true" />
      )}
      {pending ? "Memproses…" : label}
    </Button>
  );
}

export function CreateSharedWorkspaceDialog() {
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button
          type="button"
          className="min-h-12 w-full rounded-xl px-6 sm:w-auto"
        >
          <Plus className="size-4.5" aria-hidden="true" />
          Buat ruang bersama
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[3px] data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
        <DialogPrimitive.Content className="members-v2-dialog fixed inset-x-0 bottom-0 z-50 max-h-[94dvh] overflow-y-auto overscroll-contain rounded-t-3xl border bg-card shadow-2xl data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-2rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95">
          <div className="sticky top-0 z-10 border-b bg-card/95 px-5 py-5 pr-16 backdrop-blur-xl sm:px-7 sm:py-6">
            <div className="flex items-start gap-3.5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Users className="size-5.5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
                  Buat ruang bersama
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Kelola keuangan bersama tanpa mencampur catatan pribadimu.
                </DialogPrimitive.Description>
              </div>
            </div>
          </div>

          <form
            action={createSharedWorkspaceAction}
            className="space-y-5 px-5 py-6 sm:px-7"
            aria-label="Form buat ruang bersama"
          >
            <label className="block text-sm font-semibold">
              Nama ruang
              <input
                name="name"
                required
                maxLength={100}
                autoFocus
                placeholder="Contoh: Keuangan keluarga"
                className="mt-2 min-h-12 w-full rounded-xl border bg-background px-3 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
              <span className="mt-1.5 block text-xs font-normal leading-relaxed text-muted-foreground">
                Gunakan nama yang mudah dikenali oleh anggota, misalnya nama
                keluarga, rumah tangga, atau tim.
              </span>
            </label>

            <div className="rounded-2xl border border-primary/25 bg-primary/[0.07] p-4">
              <div className="flex gap-3">
                <ShieldCheck
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium leading-relaxed">
                  Ruang bersama memiliki akun, transaksi, budget, dan laporan
                  yang terpisah dari ruang pribadi.
                </p>
              </div>
              <ul className="mt-4 space-y-2 border-t pt-4 text-sm text-muted-foreground">
                <li>Kamu menjadi Owner ruang.</li>
                <li>Anggota dapat diundang setelah ruang berhasil dibuat.</li>
                <li>Data pribadi tidak dipindahkan otomatis.</li>
              </ul>
            </div>

            <div className="sticky bottom-0 -mx-5 flex flex-col-reverse gap-2 border-t bg-card/95 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-end sm:bg-transparent sm:px-0 sm:pb-0">
              <DialogPrimitive.Close asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 rounded-xl sm:min-w-28"
                >
                  Batal
                </Button>
              </DialogPrimitive.Close>
              <PendingSubmit>
                <Plus className="size-4" aria-hidden="true" />
                Buat ruang
              </PendingSubmit>
            </div>
          </form>

          <DialogPrimitive.Close
            className="absolute right-4 top-4 z-20 flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Tutup dialog buat ruang bersama"
          >
            <X className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function LearnSharedWorkspaceDialog() {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          className="min-h-12 w-full rounded-xl px-6 sm:w-auto"
        >
          <BookOpen className="size-4.5" aria-hidden="true" />
          Pelajari ruang bersama
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[3px] data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
        <DialogPrimitive.Content className="members-v2-dialog fixed inset-x-0 bottom-0 z-50 max-h-[94dvh] overflow-y-auto overscroll-contain rounded-t-3xl border bg-card shadow-2xl data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-2rem)] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95">
          <header className="sticky top-0 z-10 border-b bg-card/95 px-5 py-5 pr-16 backdrop-blur-xl sm:px-7 sm:py-6">
            <div className="flex items-start gap-3.5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <BookOpen className="size-5.5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
                  Cara kerja ruang bersama
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Pahami pemisahan data, cara mengundang anggota, dan izin
                  setiap peran sebelum membuat ruang.
                </DialogPrimitive.Description>
              </div>
            </div>
          </header>

          <div className="space-y-6 px-5 py-6 sm:px-7">
            <section className="rounded-2xl border border-primary/25 bg-primary/[0.07] p-4 sm:p-5">
              <div className="flex gap-3">
                <Layers3
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-sm font-semibold">
                    Ruang pribadi dan bersama selalu terpisah
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Membuat ruang bersama tidak memindahkan akun, transaksi,
                    budget, atau laporan pribadimu. Data baru dicatat di ruang
                    yang sedang aktif.
                  </p>
                </div>
              </div>
            </section>

            <section aria-labelledby="shared-workspace-flow-title">
              <h3
                id="shared-workspace-flow-title"
                className="text-base font-semibold"
              >
                Mulai dalam empat langkah
              </h3>
              <ol className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  [
                    "1",
                    "Buat dan beri nama ruang",
                    "Pembuat ruang otomatis menjadi Owner.",
                  ],
                  [
                    "2",
                    "Siapkan keuangan ruang",
                    "Tambahkan akun, kategori, dan budget khusus dana bersama.",
                  ],
                  [
                    "3",
                    "Buat tautan undangan",
                    "Owner memilih email dan peran, lalu membagikan tautannya secara manual.",
                  ],
                  [
                    "4",
                    "Anggota menerima undangan",
                    "Tautan terikat email, berlaku 7 hari, dan baru memberi akses setelah diterima.",
                  ],
                ].map(([number, title, description]) => (
                  <li
                    key={number}
                    className="flex gap-3 rounded-2xl border bg-muted/25 p-4"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                      {number}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="shared-workspace-roles-title">
              <h3
                id="shared-workspace-roles-title"
                className="text-base font-semibold"
              >
                Peran dan akses
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: Crown,
                    title: "Owner",
                    description:
                      "Mengelola anggota, akun, kategori, budget, pengaturan, dan seluruh data ruang.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Editor",
                    description:
                      "Mencatat transaksi, mengelola catatannya sendiri, dan melakukan rekonsiliasi.",
                  },
                  {
                    icon: Eye,
                    title: "Viewer",
                    description:
                      "Melihat dashboard dan data ruang tanpa dapat mengubahnya.",
                  },
                ].map(({ icon: Icon, title, description }) => (
                  <article key={title} className="rounded-2xl border p-4">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-4.5" aria-hidden="true" />
                    </span>
                    <h4 className="mt-3 text-sm font-semibold">{title}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                      {description}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
              <div className="flex gap-3">
                <Eye
                  className="mt-0.5 size-5 shrink-0 text-amber-500"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-sm font-semibold">
                    Semua anggota aktif dapat melihat data ruang
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Akun, transaksi, budget, dan laporan di ruang bersama
                    terlihat oleh seluruh anggota aktif. Simpan dana yang ingin
                    tetap privat di ruang pribadimu.
                  </p>
                </div>
              </div>
            </section>

            <div className="sticky bottom-0 -mx-5 flex border-t bg-card/95 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 backdrop-blur sm:static sm:mx-0 sm:justify-end sm:bg-transparent sm:px-0 sm:pb-0">
              <DialogPrimitive.Close asChild>
                <Button
                  type="button"
                  className="min-h-11 w-full rounded-xl sm:w-auto sm:min-w-36"
                >
                  <Check className="size-4" aria-hidden="true" />
                  Saya mengerti
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>

          <DialogPrimitive.Close
            className="absolute right-4 top-4 z-20 flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Tutup panduan ruang bersama"
          >
            <X className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ConfirmActionDialog({
  trigger,
  title,
  description,
  action,
  fields,
  confirmLabel,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  action: (formData: FormData) => void | Promise<void>;
  fields: Array<{ name: string; value: string | number }>;
  confirmLabel: string;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[60] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border bg-card p-6 shadow-2xl data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="text-lg font-semibold">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </DialogPrimitive.Description>
          <form
            action={action}
            className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
          >
            {fields.map((field) => (
              <input
                key={field.name}
                type="hidden"
                name={field.name}
                value={field.value}
              />
            ))}
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="outline" className="min-h-11">
                Batal
              </Button>
            </DialogPrimitive.Close>
            <DestructiveSubmit label={confirmLabel} />
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ManageMembersSheet({
  workspaceId,
  workspaceName,
  members,
  invitations,
}: {
  workspaceId: string;
  workspaceName: string;
  members: MemberRow[];
  invitations: PendingInvitation[];
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" className="min-h-11 rounded-xl px-5">
          <MailPlus className="size-4.5" aria-hidden="true" />
          Undang anggota
        </Button>
      </SheetTrigger>
      <SheetContent
        side="responsive"
        className="members-v2-sheet gap-0 overflow-hidden border-border/80 bg-card md:w-[42rem] md:max-w-[min(42rem,100vw)]"
        closeLabel="Tutup pengelolaan anggota"
      >
        <SheetHeader className="shrink-0 border-b px-5 py-5 pr-16 sm:px-7 sm:py-6">
          <div className="flex items-start gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Users className="size-5.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="text-xl tracking-[-0.025em] sm:text-2xl">
                Kelola anggota & undangan
              </SheetTitle>
              <SheetDescription className="mt-1 leading-relaxed">
                Owner mengelola akses untuk {workspaceName}.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="members-v2-sheet-scroll flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
          <section
            aria-labelledby="members-v2-invite-heading"
            className="rounded-2xl border bg-background/35 p-4 sm:p-5"
          >
            <h3 id="members-v2-invite-heading" className="font-semibold">
              Undang anggota baru
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Buat tautan yang terikat pada email dan peran penerima.
            </p>
            <div className="mt-4">
              <InvitationForm workspaceId={workspaceId} compact />
            </div>
          </section>

          <section
            aria-labelledby="members-v2-active-heading"
            className="rounded-2xl border bg-background/35 p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 id="members-v2-active-heading" className="font-semibold">
                  Anggota aktif ({members.length})
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Perubahan akses berlaku setelah server mengonfirmasi.
                </p>
              </div>
              <Settings2
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <ul className="mt-4 divide-y" aria-label="Anggota aktif">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                      {member.name.slice(0, 1).toLocaleUpperCase("id-ID")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {member.name}
                        {member.isCurrentUser ? " (Kamu)" : ""}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  {member.role === "owner" ? (
                    <Badge className="w-fit border-primary/20 bg-primary/10 text-primary">
                      {roleLabel.owner}
                    </Badge>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <form
                        action={changeMemberRoleAction}
                        className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none"
                      >
                        <input
                          type="hidden"
                          name="workspaceId"
                          value={workspaceId}
                        />
                        <input
                          type="hidden"
                          name="membershipId"
                          value={member.id}
                        />
                        <input
                          type="hidden"
                          name="version"
                          value={member.version}
                        />
                        <AppSelect
                          name="role"
                          defaultValue={member.role}
                          ariaLabel={`Peran ${member.name}`}
                          className="min-h-10 min-w-32 flex-1 rounded-xl border bg-background px-2 text-xs sm:flex-none"
                          options={[
                            { value: "editor", label: "Editor" },
                            { value: "viewer", label: "Viewer" },
                          ]}
                        />
                        <RoleSubmit />
                      </form>
                      <ConfirmActionDialog
                        trigger={
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Cabut akses ${member.name}`}
                          >
                            <UserMinus className="size-4" aria-hidden="true" />
                          </Button>
                        }
                        title={`Cabut akses ${member.name}?`}
                        description={`Akses ke ${workspaceName} berhenti pada permintaan berikutnya. Histori transaksi anggota tetap tersimpan di ruang.`}
                        action={revokeMemberAction}
                        fields={[
                          { name: "workspaceId", value: workspaceId },
                          { name: "membershipId", value: member.id },
                          { name: "version", value: member.version },
                        ]}
                        confirmLabel="Cabut akses"
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="members-v2-pending-heading"
            className="rounded-2xl border bg-background/35 p-4 sm:p-5"
          >
            <h3 id="members-v2-pending-heading" className="font-semibold">
              Undangan tertunda ({invitations.length})
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Tautan lama tidak dapat ditampilkan kembali karena hanya hash
              token yang disimpan.
            </p>
            {invitations.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Tidak ada undangan tertunda.
              </p>
            ) : (
              <ul className="mt-4 divide-y" aria-label="Undangan tertunda">
                {invitations.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {invitation.email}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {roleLabel[invitation.role]} · dibuat{" "}
                        {invitation.createdLabel}
                        {" · "}berakhir {invitation.expiresLabel}
                      </p>
                    </div>
                    <ConfirmActionDialog
                      trigger={
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          Batalkan
                        </Button>
                      }
                      title="Batalkan undangan?"
                      description={`Tautan untuk ${invitation.email} tidak dapat dipakai lagi setelah dibatalkan.`}
                      action={revokeInvitationAction}
                      fields={[
                        { name: "workspaceId", value: workspaceId },
                        { name: "id", value: invitation.id },
                      ]}
                      confirmLabel="Batalkan undangan"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 sm:p-5">
            <div className="flex gap-3">
              <ShieldCheck
                className="mt-0.5 size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <h3 className="font-semibold">Peran dan izin</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Owner mengelola ruang dan anggota. Editor mencatat serta
                  mengubah transaksi buatannya. Viewer hanya membaca data ruang.
                </p>
              </div>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
