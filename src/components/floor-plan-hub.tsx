"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PrintButton } from "@/components/print-button";
import { ReasonNoteForm } from "@/components/reason-note-form";
import { ActionForm } from "@/components/action-form";
import { STATIONS } from "@/lib/shifts";
import { cn } from "@/lib/utils";

export type FloorRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  station: string | null;
  startsAt: string;
  endsAt: string;
  status: "CLOCKED_IN" | "ON_BREAK" | "CLOCKED_OUT" | "SCHEDULED";
};

const tabs = [
  { id: "live", label: "Live floor" },
  { id: "actions", label: "Shift actions" },
  { id: "print", label: "Print roster" },
] as const;

export function FloorPlanHub({
  rows,
  people,
  addAction,
  swapAction,
  removeAction,
  requireReason = false,
}: {
  rows: FloorRow[];
  people: { id: string; name: string }[];
  addAction: (formData: FormData) => Promise<{ ok?: boolean; error?: string }>;
  swapAction: (formData: FormData) => Promise<{ ok?: boolean; error?: string }>;
  removeAction: (formData: FormData) => Promise<{ ok?: boolean; error?: string }>;
  requireReason?: boolean;
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("live");
  const byStation = useMemo(() => {
    const map = new Map<string, FloorRow[]>();
    for (const row of rows) {
      const key = row.station || "Unassigned";
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return map;
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="print:hidden flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium",
              tab === t.id ? "bg-emerald-800 text-white" : "bg-white text-stone-700 border border-stone-200",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "live" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.length === 0 && <p className="text-sm text-stone-500">No one is scheduled today.</p>}
          {[...byStation.entries()].map(([station, group]) => (
            <div key={station} className="rounded-2xl border border-stone-200 bg-white p-4">
              <h2 className="mb-3 font-semibold">{station}</h2>
              <div className="space-y-3">
                {group.map((row) => (
                  <div key={row.id} className="rounded-xl bg-stone-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{row.name}</p>
                      <Badge
                        tone={
                          row.status === "CLOCKED_IN" ? "green" : row.status === "ON_BREAK" ? "amber" : "neutral"
                        }
                      >
                        {row.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-stone-500">
                      {new Date(row.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–
                      {new Date(row.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="mt-2">
                      <Link href={`mailto:${row.email}`} className="inline-flex items-center gap-1 text-xs text-emerald-800">
                        <Mail className="h-3 w-3" /> Email
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "actions" && (
        <div className="grid gap-6 print:hidden md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5">
            <h2 className="mb-3 font-semibold">Add to shift</h2>
            {requireReason ? (
              <ReasonNoteForm
                action={addAction}
                submitLabel="Add worker"
                extraFields={<AddFields people={people} />}
              />
            ) : (
              <ActionForm action={addAction} className="space-y-3">
                <AddFields people={people} />
                <Button type="submit">Add worker</Button>
              </ActionForm>
            )}
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <h2 className="mb-3 font-semibold">Swap two workers</h2>
            <p className="mb-3 text-xs text-stone-500">Overlapping shifts are rejected.</p>
            {requireReason ? (
              <ReasonNoteForm
                action={swapAction}
                submitLabel="Swap shifts"
                extraFields={<SwapFields rows={rows} />}
              />
            ) : (
              <ActionForm action={swapAction} className="space-y-3">
                <SwapFields rows={rows} />
                <Button type="submit">Swap shifts</Button>
              </ActionForm>
            )}
          </div>
          <div className="rounded-2xl border bg-white p-5 md:col-span-2">
            <h2 className="mb-3 font-semibold">Remove shift</h2>
            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-50 p-3">
                  <p className="text-sm">
                    {row.name} · {row.station ?? "Unassigned"} ·{" "}
                    {new Date(row.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {requireReason ? (
                    <ReasonNoteForm
                      action={removeAction}
                      submitLabel="Remove"
                      extraFields={<input type="hidden" name="id" value={row.id} />}
                    />
                  ) : (
                    <ActionForm action={removeAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <Button type="submit" size="sm" variant="danger">
                        Remove
                      </Button>
                    </ActionForm>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "print" && <PrintRoster rows={rows} />}
    </div>
  );
}

function AddFields({ people }: { people: { id: string; name: string }[] }) {
  return (
    <>
      <div className="mb-3 space-y-1">
        <Label>Employee</Label>
        <select name="userId" required className="h-11 w-full rounded-xl border px-3 text-sm">
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Starts</Label>
          <Input name="startsAt" type="datetime-local" required />
        </div>
        <div className="space-y-1">
          <Label>Ends</Label>
          <Input name="endsAt" type="datetime-local" required />
        </div>
      </div>
      <div className="mb-3 space-y-1">
        <Label>Station</Label>
        <select name="station" className="h-11 w-full rounded-xl border px-3 text-sm">
          {STATIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function SwapFields({ rows }: { rows: FloorRow[] }) {
  return (
    <>
      <div className="mb-3 space-y-1">
        <Label>Worker A</Label>
        <select name="shiftA" required className="h-11 w-full rounded-xl border px-3 text-sm">
          {rows.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {r.station ?? "—"}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3 space-y-1">
        <Label>Worker B</Label>
        <select name="shiftB" required className="h-11 w-full rounded-xl border px-3 text-sm">
          {rows.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {r.station ?? "—"}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function PrintRoster({ rows }: { rows: FloorRow[] }) {
  return (
    <div className="rounded-2xl border bg-white p-6 print:border-0 print:p-0 print:shadow-none">
      <div className="print:hidden">
        <PrintButton />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Harvest Clock — floor roster</h1>
      <p className="mb-4 text-sm text-stone-600">{new Date().toLocaleDateString()}</p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Name</th>
            <th>Station</th>
            <th>Shift</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="py-2 font-medium">{r.name}</td>
              <td>{r.station ?? "—"}</td>
              <td>
                {new Date(r.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–
                {new Date(r.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </td>
              <td>{r.status.replace("_", " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
