"use client";

import { useState } from "react";
import { changeCycleStartDayAction } from "@/app/(workspace)/actions";
import { previewImmediateCycleChange } from "@/modules/periods/domain";
import { Button } from "@/components/ui/button";

function label(start: Date, end: Date) {
  const inclusiveEnd = new Date(end.valueOf() - 86_400_000);
  const format = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${format.format(start)}–${format.format(inclusiveEnd)}`;
}

export function CycleSettingsForm({
  workspaceId,
  currentDay,
  version,
  activeStart,
  today,
}: {
  workspaceId: string;
  currentDay: number;
  version: number;
  activeStart: string;
  today: string;
}) {
  const [startDay, setStartDay] = useState(currentDay);
  const preview = previewImmediateCycleChange(
    new Date(`${activeStart}T00:00:00.000Z`),
    new Date(`${today}T00:00:00.000Z`),
    startDay,
  );
  return (
    <form action={changeCycleStartDayAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="version" value={version} />
      <label className="block max-w-xs text-sm font-medium">
        Hari mulai periode
        <select
          name="startDay"
          value={startDay}
          onChange={(event) => setStartDay(Number(event.target.value))}
          className="mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 text-sm shadow-xs"
        >
          {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
            <option key={day} value={day}>
              Tanggal {day}
            </option>
          ))}
        </select>
      </label>
      <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">
          Perubahan berlaku langsung setelah disimpan.
        </p>
        <p className="mt-1">
          Periode aktif menjadi:{" "}
          {label(preview.active.start, preview.active.end)}
          {preview.active.isTransition ? " (transisi)" : ""}.
        </p>
        {preview.historicalSplit && (
          <p className="mt-1">
            Rentang sebelumnya disimpan sebagai histori transisi:{" "}
            {label(preview.historicalSplit.start, preview.historicalSplit.end)}.
          </p>
        )}
        <p className="mt-1">
          Periode reguler berikutnya:{" "}
          {label(preview.nextRegular.start, preview.nextRegular.end)}.
        </p>
        <p className="mt-1">
          Budget aktif tetap terhubung dan realisasinya dihitung ulang mengikuti
          rentang baru.
        </p>
      </div>
      <Button type="submit" disabled={startDay === currentDay}>
        Terapkan sekarang
      </Button>
    </form>
  );
}
