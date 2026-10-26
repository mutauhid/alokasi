"use client";

import { useActionState, useEffect, useState } from "react";
import { BellRing, BellOff, Eye, EyeOff, Smartphone } from "lucide-react";
import {
  webPushPreferenceAction,
  type WebPushActionState,
} from "@/app/(workspace)/web-push-actions";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InitialPreference = {
  budgetAlertsEnabled: boolean;
  weeklySummaryEnabled: boolean;
  recurringRemindersEnabled: boolean;
  lowBalanceEnabled: boolean;
  lowBalanceThreshold: string;
  staleDraftsEnabled: boolean;
  sharedActivityEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  hideSensitiveContent: boolean;
  activeDevices: number;
  configured: boolean;
  publicKey: string;
};

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function subscriptionPayload(
  subscription: PushSubscription,
  workspaceId: string,
) {
  const json = subscription.toJSON();
  return {
    workspaceId,
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
  };
}

const notificationOptions = [
  [
    "budgetAlertsEnabled",
    "Peringatan budget",
    "Sekali saat realisasi melewati 80% dan 100%.",
  ],
  [
    "weeklySummaryEnabled",
    "Ringkasan mingguan",
    "Setiap Senin untuk minggu yang telah selesai.",
  ],
  [
    "recurringRemindersEnabled",
    "Transaksi berulang",
    "Saat template jatuh tempo; transaksi tetap perlu dikonfirmasi.",
  ],
  [
    "staleDraftsEnabled",
    "Draf belum dikonfirmasi",
    "Setelah draf iPhone atau Telegram tertunda 24 jam.",
  ],
] as const;

export function WebPushNotificationCard({
  workspaceId,
  workspaceType,
  initial,
}: {
  workspaceId: string;
  workspaceType: "personal" | "shared";
  initial: InitialPreference;
}) {
  const [actionState, action, pending] = useActionState<
    WebPushActionState,
    FormData
  >(webPushPreferenceAction, {});
  const [supported, setSupported] = useState<boolean | null>(null);
  const [deviceEnabled, setDeviceEnabled] = useState(false);
  const [devicePending, setDevicePending] = useState(false);
  const [deviceMessage, setDeviceMessage] = useState<string>();
  const [activeDevices, setActiveDevices] = useState(initial.activeDevices);
  const [lowBalanceEnabled, setLowBalanceEnabled] = useState(
    initial.lowBalanceEnabled,
  );
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(
    Boolean(initial.quietHoursStart && initial.quietHoursEnd),
  );
  const [hideSensitiveContent, setHideSensitiveContent] = useState(
    initial.hideSensitiveContent,
  );

  useEffect(() => {
    const available =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    void Promise.resolve(available).then(setSupported);
    if (!available) return;
    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setDeviceEnabled(Boolean(subscription)))
      .catch(() => setDeviceEnabled(false));
  }, []);

  async function enableCurrentDevice() {
    if (!initial.configured || !initial.publicKey) return;
    setDevicePending(true);
    setDeviceMessage(undefined);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setDeviceMessage("Izin notifikasi belum diberikan di browser.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(initial.publicKey),
        });
      }
      const response = await fetch("/api/web-push/subscriptions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscriptionPayload(subscription, workspaceId)),
      });
      if (!response.ok) throw new Error("subscribe failed");
      if (!deviceEnabled) setActiveDevices((count) => count + 1);
      setDeviceEnabled(true);
      setDeviceMessage("Notifikasi aktif pada perangkat ini.");
    } catch {
      setDeviceMessage("Perangkat belum dapat didaftarkan. Coba lagi.");
    } finally {
      setDevicePending(false);
    }
  }

  async function disableCurrentDevice() {
    setDevicePending(true);
    setDeviceMessage(undefined);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/web-push/subscriptions", {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            endpoint: subscription.endpoint,
          }),
        });
        if (!response.ok) throw new Error("revoke failed");
        await subscription.unsubscribe();
      }
      if (deviceEnabled) setActiveDevices((count) => Math.max(0, count - 1));
      setDeviceEnabled(false);
      setDeviceMessage("Notifikasi dimatikan pada perangkat ini.");
    } catch {
      setDeviceMessage("Notifikasi belum dapat dimatikan. Coba lagi.");
    } finally {
      setDevicePending(false);
    }
  }

  return (
    <Card id="web-push" className="scroll-mt-5 shadow-none">
      <CardHeader>
        <BellRing className="mb-2 size-5 text-primary" aria-hidden="true" />
        <CardTitle>Notifikasi perangkat</CardTitle>
        <p className="text-sm text-muted-foreground">
          Terima informasi yang perlu ditindaklanjuti saat Alokasi sedang tidak
          dibuka. Setiap perangkat perlu diaktifkan secara terpisah.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-3 rounded-xl border bg-secondary/35 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Smartphone
              className="mt-0.5 size-5 text-primary"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold">
                {deviceEnabled
                  ? "Aktif di perangkat ini"
                  : "Belum aktif di perangkat ini"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeDevices} perangkat tersimpan untuk akunmu.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant={deviceEnabled ? "outline" : "default"}
            disabled={
              devicePending || supported !== true || !initial.configured
            }
            onClick={deviceEnabled ? disableCurrentDevice : enableCurrentDevice}
          >
            {deviceEnabled ? (
              <BellOff className="size-4" />
            ) : (
              <BellRing className="size-4" />
            )}
            {devicePending
              ? "Memproses…"
              : deviceEnabled
                ? "Matikan di perangkat ini"
                : "Aktifkan notifikasi"}
          </Button>
        </div>
        {!initial.configured && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            VAPID Web Push belum dikonfigurasi di server.
          </p>
        )}
        {supported === false && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            Browser ini belum mendukung Web Push. Pada iPhone, pasang Alokasi ke
            Layar Utama lalu buka dari ikon aplikasi.
          </p>
        )}
        {deviceMessage && (
          <p role="status" className="rounded-lg bg-secondary p-3 text-sm">
            {deviceMessage}
          </p>
        )}

        <form action={action} className="space-y-5">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          {(actionState.error || actionState.message) && (
            <p
              role={actionState.error ? "alert" : "status"}
              className="rounded-lg bg-secondary p-3 text-sm"
            >
              {actionState.error ?? actionState.message}
            </p>
          )}
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-3 text-sm font-semibold">
              Jenis notifikasi Web Push
            </legend>
            {notificationOptions.map(([name, label, description]) => (
              <label
                key={name}
                className="flex gap-3 rounded-xl border bg-background/50 p-3"
              >
                <input
                  type="checkbox"
                  name={name}
                  defaultChecked={initial[name]}
                  className="mt-1 size-4 accent-primary"
                />
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {description}
                  </span>
                </span>
              </label>
            ))}
            {workspaceType === "shared" && (
              <label className="flex gap-3 rounded-xl border bg-background/50 p-3">
                <input
                  type="checkbox"
                  name="sharedActivityEnabled"
                  defaultChecked={initial.sharedActivityEnabled}
                  className="mt-1 size-4 accent-primary"
                />
                <span>
                  <span className="block text-sm font-medium">
                    Aktivitas ruang bersama
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Saat anggota lain menambah, mengubah, atau menghapus
                    transaksi.
                  </span>
                </span>
              </label>
            )}
            <div className="rounded-xl border bg-background/50 p-3">
              <label className="flex gap-3">
                <input
                  type="checkbox"
                  name="lowBalanceEnabled"
                  checked={lowBalanceEnabled}
                  onChange={(event) =>
                    setLowBalanceEnabled(event.target.checked)
                  }
                  className="mt-1 size-4 accent-primary"
                />
                <span>
                  <span className="block text-sm font-medium">
                    Saldo akun menipis
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Sekali ketika saldo tercatat melewati batas ke bawah.
                  </span>
                </span>
              </label>
              {lowBalanceEnabled && (
                <label className="mt-3 block text-xs font-medium">
                  Batas untuk setiap akun aktif
                  <RupiahInput
                    name="lowBalanceThreshold"
                    required
                    defaultValue={initial.lowBalanceThreshold}
                    className="mt-1.5 min-h-11 rounded-lg border bg-background px-3 text-sm"
                  />
                </label>
              )}
            </div>
          </fieldset>

          <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
            <label className="flex gap-3 sm:col-span-2">
              <input
                type="checkbox"
                name="quietHoursEnabled"
                checked={quietHoursEnabled}
                onChange={(event) => setQuietHoursEnabled(event.target.checked)}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium">Jam tenang</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Notifikasi ditunda hingga jam tenang berakhir, mengikuti zona
                  waktu ruang.
                </span>
              </span>
            </label>
            {quietHoursEnabled && (
              <>
                <label className="text-sm font-medium">
                  Mulai
                  <input
                    type="time"
                    name="quietHoursStart"
                    required
                    defaultValue={initial.quietHoursStart || "22:00"}
                    className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3"
                  />
                </label>
                <label className="text-sm font-medium">
                  Berakhir
                  <input
                    type="time"
                    name="quietHoursEnd"
                    required
                    defaultValue={initial.quietHoursEnd || "07:00"}
                    className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3"
                  />
                </label>
              </>
            )}
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-background/50 p-3 sm:col-span-2">
              <div>
                <p className="text-sm font-medium">Privasi isi notifikasi</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hideSensitiveContent
                    ? "Nominal dan nama akun disamarkan pada layar terkunci."
                    : "Rincian notifikasi dapat terlihat pada layar terkunci."}
                </p>
              </div>
              <input
                type="hidden"
                name="hideSensitiveContent"
                value={hideSensitiveContent ? "on" : ""}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-pressed={hideSensitiveContent}
                aria-label={
                  hideSensitiveContent
                    ? "Tampilkan rincian notifikasi"
                    : "Sembunyikan rincian notifikasi"
                }
                title={
                  hideSensitiveContent
                    ? "Tampilkan rincian notifikasi"
                    : "Sembunyikan rincian notifikasi"
                }
                onClick={() => setHideSensitiveContent((value) => !value)}
              >
                {hideSensitiveContent ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan pengaturan notifikasi"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Saldo berasal dari catatan Alokasi, bukan saldo bank langsung. Draf
          yang sudah disimpan, dibatalkan, atau kedaluwarsa tidak diingatkan
          kembali.
        </p>
      </CardContent>
    </Card>
  );
}
