"use client";

import { ReasonNoteForm } from "@/components/reason-note-form";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATIONS, WEEKDAYS } from "@/lib/shifts";

type Person = { id: string; name: string };
type Template = {
  id: string;
  name: string;
  station: string | null;
  startTime: string;
  endTime: string;
  weekdays: number[];
};

export function BulkScheduleForm({
  people,
  templates,
  bulkAction,
  saveTemplateAction,
  requireReason = false,
}: {
  people: Person[];
  templates: Template[];
  bulkAction: (formData: FormData) => Promise<{ ok?: boolean; error?: string }>;
  saveTemplateAction: (formData: FormData) => Promise<{ ok?: boolean; error?: string }>;
  requireReason?: boolean;
}) {
  const fields = (
    <>
      <div className="mb-3 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-stone-200 p-3">
        <Label>Employees</Label>
        {people.map((p) => (
          <label key={p.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="userIds" value={p.id} />
            {p.name}
          </label>
        ))}
      </div>
      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>From</Label>
          <Input name="rangeStart" type="date" required />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input name="rangeEnd" type="date" required />
        </div>
        <div className="space-y-1">
          <Label>Start time</Label>
          <Input name="startTime" type="time" defaultValue="06:00" required />
        </div>
        <div className="space-y-1">
          <Label>End time</Label>
          <Input name="endTime" type="time" defaultValue="14:00" required />
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-3">
        {WEEKDAYS.map((d) => (
          <label key={d.value} className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="weekdays" value={d.value} defaultChecked={d.value >= 1 && d.value <= 5} />
            {d.label}
          </label>
        ))}
      </div>
      <div className="mb-3 space-y-1">
        <Label>Station / duty</Label>
        <select name="station" className="h-11 w-full rounded-xl border px-3 text-sm">
          <option value="">Unassigned</option>
          {STATIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input type="checkbox" name="isRecurring" value="true" />
        Mark as recurring template application
      </label>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-1 text-lg font-semibold">Weekly batch assignment</h2>
        <p className="mb-4 text-sm text-stone-600">
          Select one person or a group, a date range, and one start/end time. Matching weekdays all get the same shift.
        </p>
        {requireReason ? (
          <ReasonNoteForm action={bulkAction} submitLabel="Assign week" extraFields={fields} />
        ) : (
          <ActionForm action={bulkAction} success="Shifts created" className="space-y-3">
            {fields}
            <Button type="submit">Assign week</Button>
          </ActionForm>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Save as template</h2>
        <ActionForm action={saveTemplateAction} success="Template saved" className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <Label>Name</Label>
            <Input name="name" placeholder="Morning Processing Shift" required />
          </div>
          <div className="space-y-1">
            <Label>Start</Label>
            <Input name="startTime" type="time" defaultValue="06:00" required />
          </div>
          <div className="space-y-1">
            <Label>End</Label>
            <Input name="endTime" type="time" defaultValue="14:00" required />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Station</Label>
            <select name="station" className="h-11 w-full rounded-xl border px-3 text-sm">
              <option value="">Unassigned</option>
              {STATIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            {WEEKDAYS.map((d) => (
              <label key={d.value} className="flex items-center gap-1 text-sm">
                <input type="checkbox" name="weekdays" value={d.value} defaultChecked={d.value >= 1 && d.value <= 5} />
                {d.label}
              </label>
            ))}
          </div>
          <Button type="submit">Save template</Button>
        </ActionForm>
        {templates.length > 0 && (
          <ul className="mt-4 space-y-2 text-sm">
            {templates.map((t) => (
              <li key={t.id} className="rounded-xl bg-stone-50 p-3">
                <span className="font-medium">{t.name}</span> · {t.startTime}–{t.endTime}
                {t.station ? ` · ${t.station}` : ""} · days {t.weekdays.join(",")}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-stone-500">
          Apply a template by copying its times into the batch form above and selecting the crew.
        </p>
      </div>
    </div>
  );
}
