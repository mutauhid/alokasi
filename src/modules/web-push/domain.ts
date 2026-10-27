export type PushKind =
  | "budget_alert"
  | "weekly_summary"
  | "recurring_reminder"
  | "low_balance"
  | "stale_draft"
  | "shared_activity"
  | "debt_due";

export function parseClockMinutes(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/u.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatClockMinutes(value: number | null) {
  if (value === null) return "";
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function localMinuteOfDay(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );
  return hour * 60 + minute;
}

export function isQuietTime(
  now: Date,
  timezone: string,
  start: number | null,
  end: number | null,
) {
  if (start === null || end === null) return false;
  const current = localMinuteOfDay(now, timezone);
  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
}

export function nextAllowedPushTime(
  now: Date,
  timezone: string,
  start: number | null,
  end: number | null,
) {
  if (!isQuietTime(now, timezone, start, end)) return now;
  const candidate = new Date(now);
  candidate.setUTCSeconds(0, 0);
  for (let minute = 1; minute <= 24 * 60; minute += 1) {
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
    if (!isQuietTime(candidate, timezone, start, end)) return candidate;
  }
  return now;
}

export function preferenceField(kind: PushKind) {
  const fields: Record<
    PushKind,
    | "budgetAlertsEnabled"
    | "weeklySummaryEnabled"
    | "recurringRemindersEnabled"
    | "lowBalanceEnabled"
    | "staleDraftsEnabled"
    | "sharedActivityEnabled"
    | "debtDueRemindersEnabled"
  > = {
    budget_alert: "budgetAlertsEnabled",
    weekly_summary: "weeklySummaryEnabled",
    recurring_reminder: "recurringRemindersEnabled",
    low_balance: "lowBalanceEnabled",
    stale_draft: "staleDraftsEnabled",
    shared_activity: "sharedActivityEnabled",
    debt_due: "debtDueRemindersEnabled",
  };
  return fields[kind];
}

export function safeLocalNotificationUrl(value: string) {
  return /^\/(?!\/)[A-Za-z0-9_?&=/%.-]*$/u.test(value) ? value : "/dashboard";
}

export function privacySafeContent(input: {
  hideSensitiveContent: boolean;
  title: string;
  body: string;
}) {
  return input.hideSensitiveContent
    ? {
        title: "Pembaruan Alokasi",
        body: "Ada informasi keuangan baru. Buka Alokasi untuk melihat detail.",
      }
    : { title: input.title.slice(0, 120), body: input.body.slice(0, 300) };
}
