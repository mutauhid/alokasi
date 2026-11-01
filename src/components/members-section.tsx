import {
  Activity,
  Crown,
  KeyRound,
  Layers3,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import {
  acceptOwnershipTransferAction,
  cancelOwnershipTransferAction,
  leaveWorkspaceAction,
  requestOwnershipTransferAction,
} from "@/app/(workspace)/workspace-actions";
import { DeleteWorkspaceForm } from "@/components/delete-workspace-form";
import {
  CreateSharedWorkspaceDialog,
  LearnSharedWorkspaceDialog,
  ManageMembersSheet,
} from "@/components/members-v2-panels";
import { AppSelect } from "@/components/ui/app-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import {
  getMembersOverview,
  getWorkspaceDeletionSummary,
  type WorkspaceAccess,
} from "@/modules/workspaces/service";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-xs";

const messages: Record<string, string> = {
  "workspace-invalid": "Nama ruang wajib diisi dan maksimal 100 karakter.",
  "workspace-failed": "Ruang bersama belum dapat dibuat.",
  "workspace-created": "Ruang bersama berhasil dibuat.",
  "invitation-invalid": "Data undangan tidak valid.",
  "invitation-conflict": "Undangan sudah berubah, dipakai, atau dicabut.",
  "invitation-revoked": "Undangan berhasil dibatalkan.",
  "member-invalid": "Data anggota tidak valid.",
  "member-conflict": "Keanggotaan sudah berubah. Muat ulang lalu coba lagi.",
  "member-role-changed": "Peran anggota berhasil diperbarui.",
  "member-revoked": "Akses anggota berhasil dicabut.",
  "ownership-transfer-invalid": "Data pengalihan kepemilikan tidak valid.",
  "ownership-transfer-conflict":
    "Permintaan kepemilikan sudah berubah. Muat ulang lalu coba lagi.",
  "ownership-transfer-requested":
    "Permintaan kepemilikan dikirim kepada anggota tujuan.",
  "ownership-transfer-cancelled": "Permintaan kepemilikan dibatalkan.",
  "ownership-transfer-accepted":
    "Kepemilikan berhasil dialihkan. Owner sebelumnya menjadi Editor.",
  "owner-transfer-required":
    "Owner harus mengalihkan kepemilikan sebelum keluar.",
  "workspace-left": "Kamu sudah keluar dari ruang bersama.",
  "workspace-delete-invalid": "Data konfirmasi penghapusan belum lengkap.",
  "workspace-delete-name": "Nama ruang tidak cocok. Ketik nama ruang persis.",
  "workspace-delete-auth":
    "Autentikasi ulang gagal. Periksa password akun lalu coba lagi.",
  "workspace-delete-conflict":
    "Ruang atau kepemilikan sudah berubah. Muat ulang sebelum mencoba lagi.",
  "workspace-deleted": "Ruang bersama dan seluruh datanya berhasil dihapus.",
};

const roleCopy = {
  owner: {
    label: "Owner",
    description: "Akses penuh untuk mengelola ruang dan anggota.",
  },
  editor: {
    label: "Editor",
    description: "Mencatat dan mengubah transaksi yang dibuat sendiri.",
  },
  viewer: {
    label: "Viewer",
    description: "Melihat data ruang tanpa kontrol mutasi.",
  },
} as const;

function displayTime(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(value);
}

function memberName(member: {
  user: { displayName: string | null; email: string | null };
}) {
  return member.user.displayName ?? member.user.email ?? "Anggota";
}

function StatusMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  const status = error ?? success;
  if (!status || !messages[status]) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={
        error
          ? "rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
          : "rounded-xl border border-primary/20 bg-primary/[0.07] p-3 text-sm"
      }
    >
      {messages[status]}
    </p>
  );
}

export async function MembersSection({
  access,
  workspaceName,
  error,
  success,
}: {
  access: WorkspaceAccess;
  workspaceName: string;
  error?: string;
  success?: string;
}) {
  if (access.workspaceType === "personal") {
    return (
      <div className="members-v2 space-y-5">
        <StatusMessage error={error} success={success} />

        <section className="members-v2-private-banner rounded-2xl border border-primary/20 bg-primary/[0.055] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <LockKeyhole className="size-5.5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold">Ruang pribadi tetap pribadi</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Ruang ini hanya dapat diakses oleh pemiliknya dan tidak menerima
                anggota lain.
              </p>
            </div>
          </div>
        </section>

        <section className="members-v2-onboarding overflow-hidden rounded-3xl border bg-card">
          <div className="members-v2-onboarding-grid grid">
            <div
              className="members-v2-illustration relative min-h-[25rem] items-center justify-center overflow-hidden border-r"
              aria-hidden="true"
            >
              <div className="members-v2-art-scene">
                <span className="members-v2-art-glow" />
                <span className="members-v2-art-shadow" />
                <span className="members-v2-art-card members-v2-art-card-back">
                  <LockKeyhole className="size-12" />
                </span>
                <span className="members-v2-art-card members-v2-art-card-front">
                  <Users className="size-14" />
                </span>
                <span className="members-v2-art-spark members-v2-art-spark-one" />
                <span className="members-v2-art-spark members-v2-art-spark-two" />
                <span className="members-v2-art-spark members-v2-art-spark-three" />
              </div>
            </div>
            <div className="members-v2-onboarding-body p-5 sm:p-8">
              <div className="members-v2-mobile-icon flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Users className="size-5.5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                Mulai ruang bersama
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Transaksi, akun, budget, dan laporan ruang bersama akan terpisah
                dari data pribadi.
              </p>
              <ul className="mt-7 space-y-4">
                {[
                  [
                    Layers3,
                    "Pisahkan catatan pribadi dan bersama",
                    "Jaga data keuangan tetap rapi dan terorganisir.",
                  ],
                  [
                    UserPlus,
                    "Undang anggota sesuai kebutuhan",
                    "Ajak pasangan, keluarga, atau tim melalui tautan yang terikat email.",
                  ],
                  [
                    ShieldCheck,
                    "Atur peran dan akses",
                    "Tentukan siapa yang dapat menambah transaksi atau hanya melihat data.",
                  ],
                ].map(([Icon, title, description]) => (
                  <li key={String(title)} className="flex gap-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{String(title)}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                        {String(description)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <CreateSharedWorkspaceDialog />
                <LearnSharedWorkspaceDialog />
              </div>
            </div>
          </div>
        </section>

        <section
          id="members-v2-privacy"
          className="flex scroll-mt-24 gap-3 rounded-2xl border border-primary/25 bg-primary/[0.06] p-4 sm:p-5"
        >
          <ShieldCheck
            className="mt-0.5 size-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-sm font-semibold">
              Membuat ruang bersama tidak memindahkan data pribadi secara
              otomatis.
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Data akun, transaksi, budget, dan laporan di {workspaceName} tetap
              berada di ruang pribadi ini.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const [overview, deletionSummary] = await Promise.all([
    getMembersOverview(access),
    access.role === "owner"
      ? getWorkspaceDeletionSummary(access)
      : Promise.resolve(null),
  ]);
  const activeMembers = overview.members.filter(
    (member) => member.status === "active",
  );
  const revokedMembers = overview.members.filter(
    (member) => member.status === "revoked",
  );
  const pendingInvitations = overview.invitations.filter(
    (invitation) =>
      !invitation.acceptedAt &&
      !invitation.revokedAt &&
      invitation.expiresAt > new Date(),
  );
  const currentMember = activeMembers.find(
    (member) => member.userId === access.actorId,
  );
  const transferTarget = activeMembers.find(
    (member) =>
      member.id === overview.workspace.ownershipTransferToMembershipId,
  );
  const transferIsActive = Boolean(
    transferTarget &&
    overview.workspace.ownershipTransferExpiresAt &&
    overview.workspace.ownershipTransferExpiresAt > new Date(),
  );
  const transferCandidates = activeMembers.filter(
    (member) => member.role !== "owner",
  );
  const currentRole = roleCopy[access.role];

  return (
    <div className="members-v2 space-y-5">
      <StatusMessage error={error} success={success} />

      <section className="members-v2-workspace-banner flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/[0.055] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Users className="size-5.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-semibold">
                Ruang bersama: {workspaceName}
              </h2>
              <Badge className="border-primary/20 bg-primary/10 text-primary">
                Bersama
              </Badge>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Data ruang ini hanya tersedia bagi anggota dengan akses aktif.
            </p>
          </div>
        </div>
        {access.role === "owner" && (
          <ManageMembersSheet
            key={access.workspaceId}
            workspaceId={access.workspaceId}
            workspaceName={workspaceName}
            members={activeMembers.map((member) => ({
              id: member.id,
              name: memberName(member),
              email: member.user.email ?? "Identitas dianonimkan",
              role: member.role,
              status: member.status,
              version: member.version,
              isCurrentUser: member.userId === access.actorId,
            }))}
            invitations={pendingInvitations.map((invitation) => ({
              id: invitation.id,
              email: invitation.invitedEmail,
              role: invitation.role,
              createdLabel: displayTime(invitation.createdAt, access.timezone),
              expiresLabel: displayTime(invitation.expiresAt, access.timezone),
            }))}
          />
        )}
      </section>

      <section
        aria-label="Ringkasan akses ruang"
        className="grid gap-3 sm:grid-cols-3"
      >
        <article className="members-v2-summary-card rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Total anggota</p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums">
                {activeMembers.length}
              </p>
              <p className="text-xs text-muted-foreground">Termasuk kamu</p>
            </div>
          </div>
        </article>
        <article className="members-v2-summary-card rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Mail className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Undangan tertunda</p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums">
                {access.role === "owner" ? pendingInvitations.length : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {access.role === "owner"
                  ? "Menunggu konfirmasi"
                  : "Hanya terlihat oleh Owner"}
              </p>
            </div>
          </div>
        </article>
        <article className="members-v2-summary-card rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Peran kamu</p>
              <p className="mt-0.5 text-xl font-semibold">
                {currentRole.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentRole.description}
              </p>
            </div>
          </div>
        </article>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,.8fr)]">
        <Card className="members-v2-card overflow-hidden shadow-none">
          <CardHeader className="border-b">
            <CardTitle>Anggota ruang ({activeMembers.length})</CardTitle>
            <p className="text-sm text-muted-foreground">
              Daftar anggota yang memiliki akses aktif ke {workspaceName}.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Anggota aktif pada ruang {workspaceName}
                </caption>
                <thead className="border-b bg-muted/25 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">
                      Anggota
                    </th>
                    <th scope="col" className="px-5 py-3 font-medium">
                      Peran
                    </th>
                    <th scope="col" className="px-5 py-3 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
                            {memberName(member)
                              .slice(0, 1)
                              .toLocaleUpperCase("id-ID")}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              {memberName(member)}
                              {member.userId === access.actorId
                                ? " (Kamu)"
                                : ""}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {member.user.email ?? "Identitas dianonimkan"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          className={
                            member.role === "owner"
                              ? "border-primary/20 bg-primary/10 text-primary"
                              : "bg-muted text-foreground"
                          }
                        >
                          {roleCopy[member.role].label}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-sm text-primary">
                          <span className="size-2 rounded-full bg-primary" />
                          Aktif
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y md:hidden" aria-label="Anggota aktif">
              {activeMembers.map((member) => (
                <li key={member.id} className="p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                      {memberName(member)
                        .slice(0, 1)
                        .toLocaleUpperCase("id-ID")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {memberName(member)}
                        {member.userId === access.actorId ? " (Kamu)" : ""}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.user.email ?? "Identitas dianonimkan"}
                      </p>
                    </div>
                    <Badge
                      className={
                        member.role === "owner"
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "bg-muted text-foreground"
                      }
                    >
                      {roleCopy[member.role].label}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="members-v2-card shadow-none">
            <CardHeader>
              <CardTitle>
                Undangan tertunda
                {access.role === "owner"
                  ? ` (${pendingInvitations.length})`
                  : ""}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {access.role === "owner"
                  ? "Undangan yang belum diterima atau dibatalkan."
                  : "Detail undangan hanya dapat dilihat Owner."}
              </p>
            </CardHeader>
            <CardContent>
              {access.role !== "owner" ? (
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Kamu tidak memiliki izin untuk mengelola undangan.
                </p>
              ) : pendingInvitations.length === 0 ? (
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Tidak ada undangan tertunda.
                </p>
              ) : (
                <ul className="divide-y">
                  {pendingInvitations.slice(0, 4).map((invitation) => (
                    <li
                      key={invitation.id}
                      className="py-3 first:pt-0 last:pb-0"
                    >
                      <p className="truncate text-sm font-semibold">
                        {invitation.invitedEmail}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {roleCopy[invitation.role].label} · berakhir{" "}
                        {displayTime(invitation.expiresAt, access.timezone)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="members-v2-card shadow-none">
            <CardHeader>
              <CardTitle>Peran & izin</CardTitle>
              <p className="text-sm text-muted-foreground">
                Izin yang benar-benar diterapkan server pada ruang bersama.
              </p>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {Object.entries(roleCopy).map(([role, copy]) => (
                  <li
                    key={role}
                    className="flex gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <ShieldCheck
                      className={`mt-0.5 size-5 shrink-0 ${role === "owner" ? "text-primary" : "text-muted-foreground"}`}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-semibold">{copy.label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {copy.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="flex gap-3 rounded-2xl border border-primary/25 bg-primary/[0.06] p-4 sm:p-5">
        <ShieldCheck
          className="mt-0.5 size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div>
          <h2 className="text-sm font-semibold">
            Data ruang ini hanya dibagikan di dalam {workspaceName}.
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Keanggotaan ruang bersama tidak memberi akses ke ruang pribadi
            anggota lain.
          </p>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {access.role === "owner" && (
          <Card className="members-v2-card shadow-none">
            <CardHeader>
              <CardTitle>Alihkan kepemilikan</CardTitle>
              <p className="text-sm text-muted-foreground">
                Penerima harus menyetujui. Owner lama menjadi Editor setelah
                transfer berhasil.
              </p>
            </CardHeader>
            <CardContent>
              {transferTarget ? (
                <div className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {memberName(transferTarget)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {transferIsActive
                        ? `Menunggu persetujuan hingga ${displayTime(overview.workspace.ownershipTransferExpiresAt!, access.timezone)}.`
                        : "Permintaan telah kedaluwarsa. Batalkan untuk membuat permintaan baru."}
                    </p>
                  </div>
                  <form action={cancelOwnershipTransferAction}>
                    <input
                      type="hidden"
                      name="workspaceId"
                      value={access.workspaceId}
                    />
                    <input
                      type="hidden"
                      name="workspaceVersion"
                      value={overview.workspace.version}
                    />
                    <Button type="submit" variant="outline">
                      Batalkan permintaan
                    </Button>
                  </form>
                </div>
              ) : transferCandidates.length > 0 ? (
                <form
                  action={requestOwnershipTransferAction}
                  className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                >
                  <input
                    type="hidden"
                    name="workspaceId"
                    value={access.workspaceId}
                  />
                  <input
                    type="hidden"
                    name="workspaceVersion"
                    value={overview.workspace.version}
                  />
                  <label className="text-sm font-medium">
                    Calon Owner
                    <AppSelect
                      name="membershipId"
                      className={inputClass}
                      required
                      defaultValue={transferCandidates[0]?.id ?? ""}
                      options={transferCandidates.map((member) => ({
                        value: member.id,
                        label: `${memberName(member)} · ${roleCopy[member.role].label}`,
                      }))}
                    />
                  </label>
                  <Button type="submit" className="min-h-11 w-full sm:w-auto">
                    <Crown /> Minta persetujuan
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Undang dan aktifkan anggota lain sebelum mengalihkan
                  kepemilikan.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {currentMember && access.role !== "owner" && (
          <div className="space-y-5">
            {transferTarget?.id === currentMember.id && (
              <Card className="border-primary/40 bg-primary/5 shadow-none">
                <CardHeader>
                  <CardTitle>Permintaan menjadi Owner</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Jika diterima, kamu menjadi Owner dan Owner sebelumnya
                    menjadi Editor.
                  </p>
                </CardHeader>
                <CardContent>
                  {transferIsActive ? (
                    <form action={acceptOwnershipTransferAction}>
                      <input
                        type="hidden"
                        name="workspaceId"
                        value={access.workspaceId}
                      />
                      <input
                        type="hidden"
                        name="workspaceVersion"
                        value={overview.workspace.version}
                      />
                      <input
                        type="hidden"
                        name="membershipVersion"
                        value={currentMember.version}
                      />
                      <Button type="submit" className="min-h-11">
                        <Crown /> Terima kepemilikan
                      </Button>
                    </form>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Permintaan telah kedaluwarsa. Minta Owner mengirim ulang.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="members-v2-card shadow-none">
              <CardHeader>
                <CardTitle>Keluar dari ruang</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Akses berhenti pada permintaan berikutnya. Histori ruang tetap
                  tersimpan.
                </p>
              </CardHeader>
              <CardContent>
                <form action={leaveWorkspaceAction}>
                  <input
                    type="hidden"
                    name="workspaceId"
                    value={access.workspaceId}
                  />
                  <input
                    type="hidden"
                    name="membershipVersion"
                    value={currentMember.version}
                  />
                  <Button type="submit" variant="outline" className="min-h-11">
                    <LogOut /> Keluar dari ruang
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="members-v2-card shadow-none">
          <CardHeader>
            <CardTitle>Aktivitas terbaru</CardTitle>
            <p className="text-sm text-muted-foreground">
              Metadata perubahan akses dan penggunaan ruang.
            </p>
          </CardHeader>
          <CardContent>
            {overview.activity.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="Belum ada aktivitas"
                description="Aktivitas ruang akan muncul setelah digunakan."
              />
            ) : (
              <ul className="divide-y">
                {overview.activity.slice(0, 8).map((event) => {
                  const actor = overview.members.find(
                    (member) => member.userId === event.actorId,
                  );
                  return (
                    <li
                      key={event.id}
                      className="flex flex-wrap justify-between gap-2 py-3 text-sm first:pt-0 last:pb-0"
                    >
                      <span>
                        <span className="font-medium">
                          {actor ? memberName(actor) : "Sistem"}
                        </span>{" "}
                        · {event.action} · {event.entityType}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {displayTime(event.occurredAt, access.timezone)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {access.role === "owner" && overview.invitations.length > 0 && (
        <Card className="members-v2-card shadow-none">
          <CardHeader>
            <CardTitle>Riwayat undangan</CardTitle>
            <p className="text-sm text-muted-foreground">
              Status undangan terbaru. Resend tidak tersedia; buat undangan baru
              bila diperlukan.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {overview.invitations.map((invitation) => {
                const label = invitation.acceptedAt
                  ? "Diterima"
                  : invitation.revokedAt
                    ? "Dibatalkan"
                    : invitation.expiresAt <= new Date()
                      ? "Kedaluwarsa"
                      : "Menunggu";
                return (
                  <li
                    key={invitation.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {invitation.invitedEmail}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {roleCopy[invitation.role].label} · berakhir{" "}
                        {displayTime(invitation.expiresAt, access.timezone)}
                      </p>
                    </div>
                    <Badge variant="outline">{label}</Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {revokedMembers.length > 0 && (
        <Card className="members-v2-card shadow-none">
          <CardHeader>
            <CardTitle>Akses dicabut ({revokedMembers.length})</CardTitle>
            <p className="text-sm text-muted-foreground">
              Histori transaksi tetap tersimpan meskipun akses sudah dihentikan.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {revokedMembers.map((member) => (
                <li
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{memberName(member)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {member.user.email ?? "Identitas dianonimkan"}
                    </p>
                  </div>
                  <Badge variant="outline">Dicabut</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {access.role === "owner" && deletionSummary && (
        <Card className="border-destructive/40 shadow-none">
          <CardHeader>
            <CardTitle>Hapus ruang bersama</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tindakan permanen ini menghapus seluruh data ruang untuk semua
              anggota. Unduh ekspor lengkap dari Pengaturan terlebih dahulu.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-medium text-destructive">
                Data yang akan dihapus
              </p>
              <ul className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
                <li>{deletionSummary.members} keanggotaan</li>
                <li>{deletionSummary.accounts} akun keuangan</li>
                <li>{deletionSummary.categories} kategori</li>
                <li>{deletionSummary.transactions} transaksi</li>
                <li>{deletionSummary.reconciliations} rekonsiliasi saldo</li>
                <li>{deletionSummary.debts} catatan utang/piutang</li>
                <li>
                  {deletionSummary.recurringTemplates} template transaksi
                  berulang
                </li>
                <li>{deletionSummary.budgets} budget</li>
                <li>{deletionSummary.receiptDrafts} draf scan</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              Konfirmasikan nama ruang persis:{" "}
              <strong className="text-foreground">
                {deletionSummary.name}
              </strong>
              . Password hanya dipakai untuk autentikasi ulang.
            </p>
            <DeleteWorkspaceForm
              workspaceId={access.workspaceId}
              workspaceVersion={deletionSummary.version}
              workspaceName={deletionSummary.name}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
