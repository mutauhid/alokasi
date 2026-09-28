import { Banknote, CreditCard, Landmark, Plus, Wallet } from "lucide-react";
import {
  archiveAccountAction,
  createAccountAction,
  renameAccountAction,
} from "@/app/(workspace)/actions";
import { listAccounts } from "@/modules/accounts/service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-xs";

const typeDetails = {
  bank: { label: "Bank", icon: Landmark },
  ewallet: { label: "E-wallet", icon: CreditCard },
  cash: { label: "Tunai", icon: Banknote },
} as const;

const messages: Record<string, string> = {
  "account-invalid": "Periksa nama, jenis, saldo awal, dan tanggal mulai.",
  "account-conflict": "Akun sudah berubah. Muat ulang lalu coba kembali.",
  "account-not-zero": "Akun hanya dapat diarsipkan ketika saldonya Rp0.",
  "account-failed": "Perubahan akun belum dapat disimpan.",
  "account-created": "Akun berhasil dibuat.",
  "account-renamed": "Nama akun berhasil diperbarui.",
  "account-archived": "Akun berhasil diarsipkan.",
};

function rupiah(value: bigint) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function localToday(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function AccountsSection({
  workspaceId,
  canManage,
  timezone,
  error,
  success,
}: {
  workspaceId: string;
  canManage: boolean;
  timezone: string;
  error?: string;
  success?: string;
}) {
  const accounts = await listAccounts(workspaceId);
  const active = accounts.filter((account) => !account.archivedAt);
  const archived = accounts.filter((account) => account.archivedAt);
  const status = error ?? success;

  return (
    <div className="space-y-5">
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

      {canManage && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Tambah akun keuangan</CardTitle>
            <p className="text-sm text-muted-foreground">
              Saldo awal menjadi titik mulai pencatatan dan tidak dihitung
              sebagai pemasukan.
            </p>
          </CardHeader>
          <CardContent>
            <form
              action={createAccountAction}
              className="grid gap-4 md:grid-cols-4"
            >
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <label className="text-sm font-medium md:col-span-2">
                Nama akun
                <input
                  name="name"
                  required
                  maxLength={100}
                  placeholder="Contoh: BCA utama"
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium">
                Jenis
                <select name="type" className={inputClass} defaultValue="bank">
                  <option value="bank">Bank</option>
                  <option value="ewallet">E-wallet</option>
                  <option value="cash">Tunai</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Saldo awal
                <input
                  name="openingBalance"
                  type="number"
                  step="1"
                  required
                  defaultValue="0"
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium md:col-span-2">
                Tanggal mulai
                <input
                  name="openingDate"
                  type="date"
                  required
                  max={localToday(timezone)}
                  defaultValue={localToday(timezone)}
                  className={inputClass}
                />
              </label>
              <div className="flex items-end md:col-span-2 md:justify-end">
                <Button type="submit" className="min-h-11 w-full md:w-auto">
                  <Plus /> Tambah akun
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {active.map((account) => {
          const detail = typeDetails[account.type];
          const Icon = detail.icon;
          return (
            <Card key={account.id} className="gap-4 shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <Badge variant="outline">{detail.label}</Badge>
                </div>
                <CardTitle className="mt-3">{account.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Saldo saat ini
                  </p>
                  <p
                    className={`mt-1 text-xl font-semibold ${account.balance < 0n ? "text-destructive" : ""}`}
                  >
                    {rupiah(account.balance)}
                  </p>
                </div>
                {canManage && (
                  <details className="rounded-lg border p-3 text-sm">
                    <summary className="cursor-pointer font-medium">
                      Ubah nama
                    </summary>
                    <form
                      action={renameAccountAction}
                      className="mt-3 space-y-3"
                    >
                      <input
                        type="hidden"
                        name="workspaceId"
                        value={workspaceId}
                      />
                      <input type="hidden" name="id" value={account.id} />
                      <input
                        type="hidden"
                        name="version"
                        value={account.version}
                      />
                      <input
                        aria-label={`Nama baru untuk ${account.name}`}
                        name="name"
                        required
                        maxLength={100}
                        defaultValue={account.name}
                        className={inputClass}
                      />
                      <Button
                        type="submit"
                        variant="secondary"
                        className="w-full"
                      >
                        Simpan nama
                      </Button>
                    </form>
                  </details>
                )}
                {canManage && (
                  <form action={archiveAccountAction}>
                    <input
                      type="hidden"
                      name="workspaceId"
                      value={workspaceId}
                    />
                    <input type="hidden" name="id" value={account.id} />
                    <input
                      type="hidden"
                      name="version"
                      value={account.version}
                    />
                    <Button type="submit" variant="outline" className="w-full">
                      Arsipkan akun
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {active.length === 0 && (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <Wallet className="mb-3 size-7 text-primary" aria-hidden="true" />
            <p className="font-medium">Belum ada akun aktif</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Tambahkan bank, e-wallet, atau tunai untuk mulai mencatat.
            </p>
          </CardContent>
        </Card>
      )}

      {archived.length > 0 && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Akun diarsipkan</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {archived.map((account) => (
                <li
                  key={account.id}
                  className="flex justify-between gap-4 py-3 text-sm"
                >
                  <span>{account.name}</span>
                  <span className="text-muted-foreground">
                    {rupiah(account.balance)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
