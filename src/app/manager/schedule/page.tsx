import { prisma } from "@/lib/prisma";
import { startOfLocalWeek } from "@/lib/time-engine";
import { ReasonNoteForm } from "@/components/reason-note-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { managerReviewSwap, managerUpsertShift } from "@/app/manager/actions";

function toLocalInput(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function ManagerSchedulePage() {
  const weekStart = startOfLocalWeek();
  const horizon = new Date(weekStart.getTime() + 42 * 24 * 60 * 60 * 1000);

  const [staff, shifts, swaps] = await Promise.all([
    prisma.user.findMany({ where: { role: "EMPLOYEE", isActive: true }, orderBy: { name: "asc" } }),
    prisma.shiftAssignment.findMany({
      where: { startsAt: { gte: weekStart, lt: horizon }, user: { role: "EMPLOYEE" } },
      include: { user: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.shiftSwapRequest.findMany({
      where: { status: "PENDING" },
      include: { requester: true, counterpart: true, requesterShift: true, counterpartShift: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Staff schedule</h1>
        <p className="text-stone-600">Weekly and upcoming shifts for regular employees. Changes need an audit note.</p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Add or move a shift</h2>
        <ReasonNoteForm
          action={managerUpsertShift}
          submitLabel="Schedule shift"
          extraFields={
            <>
              <div className="mb-3 space-y-1">
                <Label>Employee</Label>
                <select name="userId" required className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm">
                  {staff.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
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
                <Label>Label</Label>
                <Input name="label" placeholder="Pack line A" />
              </div>
            </>
          }
        />
      </div>

      {swaps.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Pending shift swaps</h2>
          {swaps.map((s) => (
            <div key={s.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-medium">
                {s.requester.name} wants to swap with {s.counterpart.name}
              </p>
              <p className="text-sm text-stone-600">
                {s.requesterShift.startsAt.toLocaleString()} ↔ {s.counterpartShift.startsAt.toLocaleString()}
              </p>
              <div className="mt-3 flex gap-2">
                <ReasonNoteForm
                  action={managerReviewSwap}
                  submitLabel="Approve swap"
                  extraFields={
                    <>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="decision" value="APPROVED" />
                    </>
                  }
                />
                <ReasonNoteForm
                  action={managerReviewSwap}
                  submitLabel="Reject swap"
                  extraFields={
                    <>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="decision" value="REJECTED" />
                    </>
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-stone-50">
            <tr>
              <th className="p-3">Employee</th>
              <th className="p-3">Start</th>
              <th className="p-3">End</th>
              <th className="p-3">Label</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{s.user.name}</td>
                <td className="p-3">{s.startsAt.toLocaleString()}</td>
                <td className="p-3">{s.endsAt.toLocaleString()}</td>
                <td className="p-3">{s.label ?? "—"}</td>
                <td className="p-3">
                  <ReasonNoteForm
                    action={managerUpsertShift}
                    submitLabel="Edit"
                    extraFields={
                      <>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="userId" value={s.userId} />
                        <div className="mb-3 space-y-1">
                          <Label>Starts</Label>
                          <Input name="startsAt" type="datetime-local" defaultValue={toLocalInput(s.startsAt)} required />
                        </div>
                        <div className="mb-3 space-y-1">
                          <Label>Ends</Label>
                          <Input name="endsAt" type="datetime-local" defaultValue={toLocalInput(s.endsAt)} required />
                        </div>
                        <div className="mb-3 space-y-1">
                          <Label>Label</Label>
                          <Input name="label" defaultValue={s.label ?? ""} />
                        </div>
                      </>
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shifts.length === 0 && <p className="p-4 text-sm text-stone-500">No shifts in the coming weeks.</p>}
      </div>
    </div>
  );
}
