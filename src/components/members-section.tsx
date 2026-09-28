import {
  Crown,
  LockKeyhole,
  LogOut,
  Plus,
  ShieldCheck,
  UserMinus,
  Users,
} from "lucide-react";
import {
  acceptOwnershipTransferAction,
  cancelOwnershipTransferAction,
  changeMemberRoleAction,
  createSharedWorkspaceAction,
  leaveWorkspaceAction,
  requestOwnershipTransferAction,
  revokeInvitationAction,
  revokeMemberAction,
} from "@/app/(workspace)/workspace-actions";
import { InvitationForm } from "@/components/invitation-form";
import { DeleteWorkspaceForm } from "@/components/delete-workspace-form";
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
  "invitation-revoked": "Undangan berhasil dicabut.",
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

function displayTime(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(value);
}

export async function MembersSection({
  access,
  error,
  success,
}: {
  access: WorkspaceAccess;
  error?: string;
  success?: string;
}) {
  const status = error ?? success;
  if (access.workspaceType === "personal") {
    return (
      <div className="space-y-5">
        {status && messages[status] && (
          <p
            role={error ? "alert" : "status"}
            className={
              error
                ? "rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                : "rounded-lg bg-secondary p-3 text-sm"
            }
          >
            {messages[status]}
          </p>
        )}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Ruang pribadi tetap pribadi</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ruang ini hanya dapat diakses oleh pemiliknya dan tidak menerima
              anggota lain.
            </p>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={LockKeyhole}
              title="Buat ruang terpisah untuk dana bersama"
              description="Akun, transaksi, budget, dan laporan ruang bersama tidak bercampur dengan catatan pribadi."
            >
              <form
                action={createSharedWorkspaceAction}
                className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-stretch"
              >
                <input
                  name="name"
                  required
                  maxLength={100}
                  aria-label="Nama ruang bersama"
                  placeholder="Contoh: Keuangan keluarga"
                  className={`${inputClass} mt-0 flex-1`}
                />
                <Button
                  type="submit"
                  className="min-h-11 w-full rounded-lg sm:w-auto"
                >
                  <Plus /> Buat ruang
                </Button>
              </form>
            </EmptyState>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [overview, deletionSummary] = await Promise.all([
    getMembersOverview(access),
    access.role === "owner"
      ? getWorkspaceDeletionSummary(access)
      : Promise.resolve(null),
  ]);
  const currentMember = overview.members.find(
    (member) => member.userId === access.actorId && member.status === "active",
  );
  const transferTarget = overview.members.find(
    (member) =>
      member.id === overview.workspace.ownershipTransferToMembershipId,
  );
  const transferIsActive = Boolean(
    transferTarget &&
    overview.workspace.ownershipTransferExpiresAt &&
    overview.workspace.ownershipTransferExpiresAt > new Date(),
  );
  const transferCandidates = overview.members.filter(
    (member) => member.status === "active" && member.role !== "owner",
  );
  return (
    <div className="space-y-5">
      {status && messages[status] && (
        <p
          role={error ? "alert" : "status"}
          className={
            error
              ? "rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              : "rounded-lg bg-secondary p-3 text-sm"
          }
        >
          {messages[status]}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Owner", "Mengelola ruang, anggota, akun, kategori, dan budget."],
          ["Editor", "Mencatat dan mengubah transaksi yang dibuat sendiri."],
          ["Viewer", "Melihat dashboard, transaksi, budget, dan laporan."],
        ].map(([name, description]) => (
          <Card key={name} className="shadow-none">
            <CardContent>
              <ShieldCheck
                className="mb-3 size-5 text-primary"
                aria-hidden="true"
              />
              <p className="font-medium">{name}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {access.role === "owner" && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Undang anggota</CardTitle>
            <p className="text-sm text-muted-foreground">
              Undangan terikat ke email terverifikasi, berlaku tujuh hari, dan
              hanya dapat dipakai sekali.
            </p>
          </CardHeader>
          <CardContent>
            <InvitationForm workspaceId={access.workspaceId} />
          </CardContent>
        </Card>
      )}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Anggota</CardTitle>
          <p className="text-sm text-muted-foreground">
            Perubahan akses berlaku pada permintaan berikutnya dan tidak
            menghapus histori transaksi.
          </p>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {overview.members.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {member.user.displayName ?? member.user.email ?? "Anggota"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {member.user.email ?? "Identitas dianonimkan"} ·{" "}
                    {member.status === "active" ? "Aktif" : "Dicabut"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      member.status === "active" ? "secondary" : "outline"
                    }
                  >
                    {member.role === "owner"
                      ? "Owner"
                      : member.role === "editor"
                        ? "Editor"
                        : "Viewer"}
                  </Badge>
                  {access.role === "owner" &&
                    member.role !== "owner" &&
                    member.status === "active" && (
                      <>
                        <form
                          action={changeMemberRoleAction}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="hidden"
                            name="workspaceId"
                            value={access.workspaceId}
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
                          <select
                            name="role"
                            defaultValue={member.role}
                            aria-label={`Peran ${member.user.displayName ?? member.user.email ?? "anggota"}`}
                            className="min-h-9 rounded-lg border bg-background px-2 text-xs"
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <Button type="submit" size="sm" variant="outline">
                            Simpan
                          </Button>
                        </form>
                        <form action={revokeMemberAction}>
                          <input
                            type="hidden"
                            name="workspaceId"
                            value={access.workspaceId}
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
                          <Button type="submit" size="sm" variant="ghost">
                            <UserMinus /> Cabut
                          </Button>
                        </form>
                      </>
                    )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {access.role === "owner" && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Alihkan kepemilikan</CardTitle>
            <p className="text-sm text-muted-foreground">
              Anggota tujuan harus menerima permintaan. Setelah diterima, kamu
              menjadi Editor dan ruang tetap memiliki tepat satu Owner.
            </p>
          </CardHeader>
          <CardContent>
            {transferTarget ? (
              <div className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {transferTarget.user.displayName ??
                      transferTarget.user.email ??
                      "Anggota"}
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
                  <select name="membershipId" className={inputClass} required>
                    {transferCandidates.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.user.displayName ??
                          member.user.email ??
                          "Anggota"}
                        {` · ${member.role === "editor" ? "Editor" : "Viewer"}`}
                      </option>
                    ))}
                  </select>
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
        <>
          {transferTarget?.id === currentMember.id && (
            <Card className="border-primary/40 bg-primary/5 shadow-none">
              <CardHeader>
                <CardTitle>Permintaan menjadi Owner</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Jika diterima, kamu menjadi Owner dan Owner sebelumnya menjadi
                  Editor.
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

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Keluar dari ruang</CardTitle>
              <p className="text-sm text-muted-foreground">
                Aksesmu berhenti pada permintaan berikutnya. Transaksi dan
                histori yang sudah dibuat tetap menjadi milik ruang.
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
        </>
      )}

      {access.role === "owner" && overview.invitations.length > 0 && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Riwayat undangan</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {overview.invitations.map((invitation) => {
                const pending =
                  !invitation.acceptedAt &&
                  !invitation.revokedAt &&
                  invitation.expiresAt > new Date();
                const label = invitation.acceptedAt
                  ? "Diterima"
                  : invitation.revokedAt
                    ? "Dicabut"
                    : invitation.expiresAt <= new Date()
                      ? "Kedaluwarsa"
                      : "Menunggu";
                return (
                  <li
                    key={invitation.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {invitation.invitedEmail}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {invitation.role === "editor" ? "Editor" : "Viewer"} ·
                        berakhir{" "}
                        {displayTime(invitation.expiresAt, access.timezone)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{label}</Badge>
                      {pending && (
                        <form action={revokeInvitationAction}>
                          <input
                            type="hidden"
                            name="workspaceId"
                            value={access.workspaceId}
                          />
                          <input
                            type="hidden"
                            name="id"
                            value={invitation.id}
                          />
                          <Button type="submit" size="sm" variant="ghost">
                            Cabut
                          </Button>
                        </form>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {access.role === "owner" && deletionSummary && (
        <Card className="border-destructive/40 shadow-none">
          <CardHeader>
            <CardTitle>Hapus ruang bersama</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tindakan ini permanen dan langsung menghapus data ruang untuk
              semua anggota. Unduh ekspor lengkap dari Pengaturan jika masih
              memerlukan salinan.
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
                <li>{deletionSummary.budgets} budget</li>
                <li>{deletionSummary.receiptDrafts} draf scan</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              Konfirmasikan nama ruang persis:{" "}
              <strong className="text-foreground">
                {deletionSummary.name}
              </strong>
              . Password hanya digunakan untuk autentikasi ulang dan tidak
              disimpan oleh aplikasi.
            </p>
            <DeleteWorkspaceForm
              workspaceId={access.workspaceId}
              workspaceVersion={deletionSummary.version}
              workspaceName={deletionSummary.name}
            />
          </CardContent>
        </Card>
      )}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Aktivitas terbaru</CardTitle>
          <p className="text-sm text-muted-foreground">
            Audit hanya menyimpan metadata tindakan dan nama field yang berubah.
          </p>
        </CardHeader>
        <CardContent>
          {overview.activity.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Belum ada aktivitas"
              description="Aktivitas anggota akan muncul setelah ruang digunakan."
            />
          ) : (
            <ul className="divide-y">
              {overview.activity.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap justify-between gap-2 py-3 text-sm first:pt-0 last:pb-0"
                >
                  <span>
                    <span className="font-medium">
                      {overview.members.find(
                        (member) => member.userId === event.actorId,
                      )?.user.displayName ??
                        overview.members.find(
                          (member) => member.userId === event.actorId,
                        )?.user.email ??
                        "Sistem"}
                    </span>{" "}
                    · {event.action} · {event.entityType}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {displayTime(event.occurredAt, access.timezone)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
