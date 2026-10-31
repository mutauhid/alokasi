import Link from "next/link";
import {
  Bot,
  Download,
  KeyRound,
  Mail,
  ShieldAlert,
  SlidersHorizontal,
  Tags,
  UserRound,
} from "lucide-react";
import {
  archiveCategoryAction,
  createCategoryAction,
  renameCategoryAction,
  restoreCategoryAction,
} from "@/app/(workspace)/actions";
import {
  changePasswordAction,
  updateProfileAction,
} from "@/app/(workspace)/account-actions";
import { listCategories } from "@/modules/categories/service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CycleSettingsForm } from "@/components/cycle-settings-form";
import { getCycleOverview } from "@/modules/periods/service";
import {
  getAccountDeletionSummary,
  getUserProfile,
} from "@/modules/users/service";
import type { WorkspaceAccess } from "@/modules/workspaces/service";
import { getAuthAdminConfig } from "@/server/auth/config";
import { DeleteAccountForm } from "@/components/delete-account-form";
import { ShortcutIntegrationCard } from "@/components/shortcut-integration-card";
import { listActiveAccountOptions } from "@/modules/accounts/service";
import { listActiveCategoryOptions } from "@/modules/categories/service";
import { getShortcutIntegration } from "@/modules/shortcut-integration/service";
import { TelegramIntegrationCard } from "@/components/telegram-integration-card";
import { getTelegramSettings } from "@/modules/telegram-integration/service";
import { listPersonalCategoryRules } from "@/modules/category-rules/service";
import { PersonalCategoryRulesCard } from "@/components/personal-category-rules-card";
import { WebPushNotificationCard } from "@/components/web-push-notification-card";
import { formatClockMinutes } from "@/modules/web-push/domain";
import { getWebPushSettings } from "@/modules/web-push/service";
import { cn } from "@/lib/utils";
import { AppSelect } from "@/components/ui/app-select";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-xs";

type SettingsView =
  "account" | "automation" | "categories" | "workspace" | "danger";

const settingsNavigation = [
  {
    id: "account",
    label: "Akun",
    description: "Profil dan password",
    icon: UserRound,
  },
  {
    id: "automation",
    label: "Automasi",
    description: "iPhone, Telegram, dan notifikasi",
    icon: Bot,
  },
  {
    id: "categories",
    label: "Kategori",
    description: "Pemasukan dan pengeluaran",
    icon: Tags,
  },
  {
    id: "workspace",
    label: "Ruang & data",
    description: "Siklus dan ekspor",
    icon: SlidersHorizontal,
  },
  {
    id: "danger",
    label: "Zona berbahaya",
    description: "Penghapusan akun",
    icon: ShieldAlert,
  },
] as const satisfies ReadonlyArray<{
  id: SettingsView;
  label: string;
  description: string;
  icon: typeof UserRound;
}>;

function normalizeSettingsView(
  view: string | undefined,
  workspaceType: WorkspaceAccess["workspaceType"],
): SettingsView {
  const match = settingsNavigation.find((item) => item.id === view)?.id;
  if (match === "danger" && workspaceType !== "personal") return "account";
  return match ?? "account";
}

const messages: Record<string, string> = {
  "category-invalid": "Nama kategori wajib diisi dan maksimal 50 karakter.",
  "category-duplicate": "Kategori dengan nama dan jenis tersebut sudah ada.",
  "category-name-archived":
    "Nama tersebut dimiliki kategori arsip. Pulihkan dari daftar arsip.",
  "category-conflict": "Kategori sudah berubah. Muat ulang lalu coba kembali.",
  "category-recurring-active":
    "Nonaktifkan template transaksi berulang yang memakai kategori ini terlebih dahulu.",
  "category-failed": "Perubahan kategori belum dapat disimpan.",
  "category-created": "Kategori berhasil dibuat.",
  "category-renamed": "Kategori berhasil diperbarui.",
  "category-archived": "Kategori berhasil diarsipkan.",
  "category-restored": "Kategori berhasil dipulihkan.",
  "cycle-invalid": "Hari mulai harus berada antara tanggal 1 dan 31.",
  "cycle-future-conflict":
    "Siklus berubah di tab lain atau ada budget pada periode masa depan. Muat ulang; budget tersebut tidak diubah otomatis.",
  "cycle-failed": "Siklus budget belum dapat diperbarui.",
  "cycle-updated":
    "Siklus dan periode aktif langsung diperbarui. Transaksi tetap utuh.",
  "account-delete-invalid": "Isi email dan password dengan benar.",
  "account-delete-unavailable":
    "Penghapusan akun belum tersedia karena credential Auth Admin server belum dikonfigurasi.",
  "account-delete-personal-only":
    "Buka Pengaturan pada Ruang pribadi untuk menghapus akun.",
  "account-delete-auth": "Password tidak sesuai. Akun belum dihapus.",
  "account-delete-email": "Email konfirmasi tidak sesuai.",
  "account-delete-owner":
    "Alihkan kepemilikan atau hapus semua ruang bersama milikmu terlebih dahulu.",
  "account-delete-conflict":
    "Kondisi akun sudah berubah. Muat ulang lalu periksa kembali.",
  "profile-invalid": "Nama tampilan wajib diisi dan maksimal 100 karakter.",
  "profile-access":
    "Akses ruang sudah berubah. Pilih kembali ruang aktif lalu coba lagi.",
  "profile-provider-failed":
    "Profil autentikasi belum dapat diperbarui. Coba kembali.",
  "profile-failed": "Profil aplikasi belum dapat diperbarui. Coba kembali.",
  "profile-updated": "Nama tampilan berhasil diperbarui.",
  "password-invalid":
    "Password baru minimal 8 karakter, harus cocok, dan berbeda dari password saat ini.",
  "password-auth": "Password saat ini tidak sesuai.",
  "password-failed": "Password belum dapat diperbarui.",
};

export async function SettingsSection({
  access,
  today,
  error,
  success,
  view,
}: {
  access: WorkspaceAccess;
  today: Date;
  error?: string;
  success?: string;
  view?: string;
}) {
  const workspaceId = access.workspaceId;
  const canManage = access.role === "owner";
  const activeView = normalizeSettingsView(view, access.workspaceType);
  const profile =
    activeView === "account" ? await getUserProfile(access.actorId) : null;
  const categories =
    activeView === "categories" ? await listCategories(access.workspaceId) : [];
  const cycle =
    activeView === "workspace"
      ? await getCycleOverview(access.workspaceId, today)
      : null;
  const deletion =
    activeView === "danger" && access.workspaceType === "personal"
      ? await getAccountDeletionSummary(access.actorId)
      : null;
  const webPush =
    activeView === "automation" ? await getWebPushSettings(access) : null;
  const [
    shortcut,
    telegram,
    shortcutAccounts,
    shortcutCategories,
    categoryRules,
  ] =
    activeView === "automation" && access.role !== "viewer"
      ? await Promise.all([
          getShortcutIntegration(access),
          getTelegramSettings(access),
          listActiveAccountOptions(access.workspaceId),
          listActiveCategoryOptions(access.workspaceId),
          listPersonalCategoryRules(access),
        ])
      : [null, null, [], [], []];
  const accountDeletionConfigured =
    activeView === "danger" && Boolean(getAuthAdminConfig());
  const status = error ?? success;
  const activeNavigation = settingsNavigation.find(
    (item) => item.id === activeView,
  )!;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
      <nav
        aria-label="Bagian pengaturan"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:sticky lg:top-6 lg:grid-cols-1"
      >
        {settingsNavigation
          .filter(
            (item) =>
              item.id !== "danger" || access.workspaceType === "personal",
          )
          .map((item) => {
            const Icon = item.icon;
            const active = item.id === activeView;
            return (
              <Link
                key={item.id}
                href={`/settings?workspaceId=${encodeURIComponent(workspaceId)}&view=${item.id}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex min-h-16 items-center gap-3 rounded-xl border px-3 py-2.5 transition-[border-color,background-color,transform] duration-200 motion-safe:hover:-translate-y-0.5",
                  active
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "bg-card text-muted-foreground hover:border-primary/25 hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {item.label}
                  </span>
                  <span className="hidden text-xs text-muted-foreground lg:block">
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
      </nav>

      <section
        className="min-w-0 space-y-5"
        aria-labelledby="settings-view-title"
      >
        <div>
          <h2 id="settings-view-title" className="text-xl font-semibold">
            {activeNavigation.label}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeNavigation.description}
          </p>
        </div>
        {status && messages[status] && (
          <p
            role="status"
            className={
              error
                ? "rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                : "rounded-lg bg-secondary p-3 text-sm"
            }
          >
            {messages[status]}
          </p>
        )}
        {activeView === "account" && profile && (
          <Card className="shadow-none">
            <CardHeader>
              <UserRound
                className="mb-2 size-5 text-primary"
                aria-hidden="true"
              />
              <CardTitle>Profil akun</CardTitle>
              <p className="text-sm text-muted-foreground">
                Data ini berlaku untuk semua ruang keuangan yang kamu akses.
              </p>
            </CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4 rounded-xl border bg-background/50 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {profile.displayName ?? "Pengguna Alokasi"}
                    </p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                      {profile.email}
                    </p>
                  </div>
                </div>
                <form action={updateProfileAction} className="space-y-3">
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <label className="block text-sm font-medium">
                    Nama tampilan
                    <input
                      name="displayName"
                      required
                      maxLength={100}
                      autoComplete="name"
                      defaultValue={profile.displayName ?? ""}
                      className={inputClass}
                    />
                  </label>
                  <Button type="submit" variant="secondary">
                    Simpan profil
                  </Button>
                </form>
              </div>
              <div className="space-y-4 rounded-xl border bg-background/50 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <KeyRound className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Ganti password</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Setelah berhasil, semua sesi akan dikeluarkan dan kamu
                      perlu login kembali.
                    </p>
                  </div>
                </div>
                <form action={changePasswordAction} className="space-y-3">
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <label className="block text-sm font-medium">
                    Password saat ini
                    <input
                      type="password"
                      name="currentPassword"
                      required
                      maxLength={256}
                      autoComplete="current-password"
                      className={inputClass}
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium">
                      Password baru
                      <input
                        type="password"
                        name="newPassword"
                        required
                        minLength={8}
                        maxLength={128}
                        autoComplete="new-password"
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Ulangi password baru
                      <input
                        type="password"
                        name="confirmation"
                        required
                        minLength={8}
                        maxLength={128}
                        autoComplete="new-password"
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <Button type="submit" variant="outline">
                    Perbarui password
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        )}

        {activeView === "automation" && webPush && (
          <WebPushNotificationCard
            workspaceId={workspaceId}
            workspaceType={access.workspaceType}
            initial={{
              budgetAlertsEnabled: webPush.budgetAlertsEnabled,
              weeklySummaryEnabled: webPush.weeklySummaryEnabled,
              recurringRemindersEnabled: webPush.recurringRemindersEnabled,
              lowBalanceEnabled: webPush.lowBalanceEnabled,
              lowBalanceThreshold:
                webPush.lowBalanceThreshold?.toString() ?? "",
              staleDraftsEnabled: webPush.staleDraftsEnabled,
              sharedActivityEnabled: webPush.sharedActivityEnabled,
              debtDueRemindersEnabled: webPush.debtDueRemindersEnabled,
              quietHoursStart: formatClockMinutes(webPush.quietHoursStart),
              quietHoursEnd: formatClockMinutes(webPush.quietHoursEnd),
              hideSensitiveContent: webPush.hideSensitiveContent,
              activeDevices: webPush.activeDevices,
              configured: webPush.configured,
              publicKey: webPush.publicKey,
            }}
          />
        )}

        {activeView === "automation" &&
          (access.role !== "viewer" && shortcut && telegram ? (
            <>
              <ShortcutIntegrationCard
                workspaceId={workspaceId}
                accounts={shortcutAccounts.map(({ id, name }) => ({
                  id,
                  name,
                }))}
                categories={shortcutCategories
                  .filter((category) => category.type === "expense")
                  .map(({ id, name }) => ({ id, name }))}
                initialState={{
                  configured: shortcut.configured,
                  accountName: shortcut.accountName,
                  categoryName: shortcut.categoryName,
                  expiresAt: shortcut.expiresAt?.toISOString(),
                  lastUsedAt: shortcut.lastUsedAt?.toISOString(),
                }}
              />
              <TelegramIntegrationCard
                workspaceId={workspaceId}
                accounts={shortcutAccounts.map(({ id, name }) => ({
                  id,
                  name,
                }))}
                expenseCategories={shortcutCategories
                  .filter((category) => category.type === "expense")
                  .map(({ id, name }) => ({ id, name }))}
                incomeCategories={shortcutCategories
                  .filter((category) => category.type === "income")
                  .map(({ id, name }) => ({ id, name }))}
                initialState={telegram}
              />
              <PersonalCategoryRulesCard
                workspaceId={workspaceId}
                categories={shortcutCategories
                  .filter((category) => category.type === "expense")
                  .map(({ id, name }) => ({ id, name }))}
                rules={categoryRules.map((rule) => ({
                  id: rule.id,
                  keyword: rule.keyword,
                  categoryName: rule.category.name,
                  archived: Boolean(rule.category.archivedAt),
                }))}
              />
            </>
          ) : (
            <Card className="shadow-none">
              <CardContent className="py-8 text-sm text-muted-foreground">
                Automasi iPhone dan Telegram hanya dapat dikonfigurasi oleh
                Owner atau Editor ruang ini.
              </CardContent>
            </Card>
          ))}

        {activeView === "categories" && (
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Kategori</CardTitle>
              <p className="text-sm text-muted-foreground">
                Owner dapat mengelola kategori pemasukan dan pengeluaran untuk
                ruang ini.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {canManage && (
                <form
                  action={createCategoryAction}
                  className="grid gap-4 sm:grid-cols-[1fr_180px_auto]"
                >
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <label className="text-sm font-medium">
                    Nama kategori
                    <input
                      name="name"
                      required
                      maxLength={50}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Jenis
                    <AppSelect
                      name="type"
                      defaultValue="expense"
                      className={inputClass}
                      options={[
                        { value: "expense", label: "Pengeluaran" },
                        { value: "income", label: "Pemasukan" },
                      ]}
                    />
                  </label>
                  <div className="flex items-end">
                    <Button type="submit" className="min-h-11 w-full">
                      Tambah
                    </Button>
                  </div>
                </form>
              )}

              {(["expense", "income"] as const).map((type) => (
                <section key={type} aria-labelledby={`category-${type}`}>
                  <h3
                    id={`category-${type}`}
                    className="mb-3 text-sm font-semibold"
                  >
                    {type === "expense" ? "Pengeluaran" : "Pemasukan"}
                  </h3>
                  <ul className="grid gap-3 md:grid-cols-2">
                    {categories
                      .filter((category) => category.type === type)
                      .map((category) => (
                        <li key={category.id} className="rounded-xl border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <span
                              className={
                                category.archivedAt
                                  ? "text-muted-foreground line-through"
                                  : "font-medium"
                              }
                            >
                              {category.name}
                            </span>
                            {category.archivedAt && (
                              <Badge variant="outline">Arsip</Badge>
                            )}
                          </div>
                          {canManage && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {!category.archivedAt && (
                                <details className="min-w-40 flex-1 rounded-lg border p-2 text-sm">
                                  <summary className="cursor-pointer px-1 font-medium">
                                    Ubah nama
                                  </summary>
                                  <form
                                    action={renameCategoryAction}
                                    className="mt-2 space-y-2"
                                  >
                                    <input
                                      type="hidden"
                                      name="workspaceId"
                                      value={workspaceId}
                                    />
                                    <input
                                      type="hidden"
                                      name="id"
                                      value={category.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="version"
                                      value={category.version}
                                    />
                                    <input
                                      aria-label={`Nama baru untuk ${category.name}`}
                                      name="name"
                                      required
                                      maxLength={50}
                                      defaultValue={category.name}
                                      className={inputClass}
                                    />
                                    <Button
                                      type="submit"
                                      variant="secondary"
                                      className="w-full"
                                    >
                                      Simpan
                                    </Button>
                                  </form>
                                </details>
                              )}
                              <form
                                action={
                                  category.archivedAt
                                    ? restoreCategoryAction
                                    : archiveCategoryAction
                                }
                              >
                                <input
                                  type="hidden"
                                  name="workspaceId"
                                  value={workspaceId}
                                />
                                <input
                                  type="hidden"
                                  name="id"
                                  value={category.id}
                                />
                                <input
                                  type="hidden"
                                  name="version"
                                  value={category.version}
                                />
                                <Button type="submit" variant="outline">
                                  {category.archivedAt
                                    ? "Pulihkan"
                                    : "Arsipkan"}
                                </Button>
                              </form>
                            </div>
                          )}
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
            </CardContent>
          </Card>
        )}

        {activeView === "danger" && deletion && (
          <Card className="border-destructive/40 shadow-none">
            <CardHeader>
              <ShieldAlert
                className="mb-2 size-5 text-destructive"
                aria-hidden="true"
              />
              <CardTitle>Hapus akun</CardTitle>
              <p className="text-sm text-muted-foreground">
                Menghapus ruang pribadi dan menutup akses ke seluruh ruang.
                Transaksi yang pernah kamu catat di ruang bersama tetap
                tersimpan dengan identitas anonim.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Transaksi pribadi", deletion.personal.transactions],
                  ["Rekonsiliasi saldo", deletion.personal.reconciliations],
                  ["Catatan utang/piutang", deletion.personal.debts],
                  [
                    "Template transaksi berulang",
                    deletion.personal.recurringTemplates,
                  ],
                  ["Budget pribadi", deletion.personal.budgets],
                  ["Akun keuangan", deletion.personal.accounts],
                  ["Membership bersama", deletion.sharedMemberships],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              {deletion.ownedShared.length > 0 && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
                  <p className="font-medium">
                    Selesaikan kepemilikan ruang bersama terlebih dahulu:
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                    {deletion.ownedShared.map((workspace) => (
                      <li key={workspace.id}>{workspace.name}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-muted-foreground">
                    Alihkan kepemilikan kepada anggota lain atau hapus ruangnya
                    melalui halaman Anggota &amp; akses.
                  </p>
                </div>
              )}
              {!accountDeletionConfigured && (
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Fitur hapus akun belum dikonfigurasi oleh operator aplikasi.
                </p>
              )}
              <DeleteAccountForm
                workspaceId={workspaceId}
                email={deletion.email}
                configured={accountDeletionConfigured}
                blocked={deletion.ownedShared.length > 0}
              />
            </CardContent>
          </Card>
        )}

        {activeView === "workspace" && cycle && (
          <>
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Ekspor data ruang</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Unduh salinan terstruktur berisi akun, kategori, aturan
                  periode, budget, rekonsiliasi saldo, dan seluruh transaksi
                  termasuk data arsip.
                </p>
              </CardHeader>
              <CardContent>
                {canManage ? (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-background/50 p-4">
                    <div>
                      <p className="text-sm font-medium">
                        Format JSON · IDR integer
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Nominal disimpan sebagai teks integer agar tidak
                        kehilangan presisi. Token autentikasi dan teks OCR
                        mentah tidak disertakan.
                      </p>
                    </div>
                    <Button asChild variant="outline">
                      <a
                        href={`/api/reports/workspace.json?workspaceId=${encodeURIComponent(workspaceId)}`}
                      >
                        <Download aria-hidden="true" />
                        Unduh data ruang
                      </a>
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Hanya Owner yang dapat mengekspor seluruh data ruang.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Siklus budget</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Saat ini dimulai tanggal {cycle.setting.startDay}. Perubahan
                  Owner langsung menyesuaikan periode aktif dan agregatnya.
                </p>
                {cycle.pendingSetting && (
                  <p className="text-sm text-muted-foreground">
                    Rencana lama tanggal {cycle.pendingSetting.startDay} untuk{" "}
                    {cycle.pendingSetting.effectiveDate.toLocaleDateString(
                      "id-ID",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      },
                    )}
                    {" akan digantikan jika perubahan langsung disimpan."}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {canManage ? (
                  <CycleSettingsForm
                    workspaceId={workspaceId}
                    currentDay={
                      cycle.pendingSetting?.startDay ?? cycle.setting.startDay
                    }
                    version={
                      cycle.pendingSetting?.version ?? cycle.setting.version
                    }
                    activeStart={cycle.period.startDate
                      .toISOString()
                      .slice(0, 10)}
                    today={today.toISOString().slice(0, 10)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Hanya Owner yang dapat mengubah siklus ruang.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </div>
  );
}
