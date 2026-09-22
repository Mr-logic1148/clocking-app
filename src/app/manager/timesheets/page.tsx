import { prisma } from "@/lib/prisma";
import { ReasonNoteForm } from "@/components/reason-note-form";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { minutesToHoursLabel } from "@/lib/utils";
import { managerUpsertTimesheet } from "@/app/manager/actions";

function toLocalInput(d: Date | null) {
  if (!d) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function ManagerTimesheetsPage() {
  const [users, entries] = await Promise.all([
    prisma.user.findMany({ where: { role: "EMPLOYEE", isActive: true }, orderBy: { name: "asc" } }),
    prisma.timeEntry.findMany({
      where: { user: { role: "EMPLOYEE" } },
      include: { user: true, breaks: true },
      orderBy: { clockIn: "desc" },
      take: 80,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Timesheet approval</h1>
        <p className="text-stone-600">
          Edit or approve employee hours. Every save requires an audit note for Admins.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Add missing entry</h2>
        <ReasonNoteForm
          action={managerUpsertTimesheet}
          submitLabel="Add hours"
          extraFields={
            <>
              <div className="mb-3 space-y-1">
                <Label>Employee</Label>
                <select name="userId" required className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm">
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Clock in</Label>
                  <Input name="clockIn" type="datetime-local" required />
                </div>
                <div className="space-y-1">
                  <Label>Clock out</Label>
                  <Input name="clockOut" type="datetime-local" />
                </div>
              </div>
              <div className="mb-3 space-y-1">
                <Label>Notes</Label>
                <Input name="notes" />
              </div>
              <label className="mb-3 flex items-center gap-2 text-sm">
                <input type="checkbox" name="approve" value="true" defaultChecked />
                Approve
              </label>
            </>
          }
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-stone-50 text-stone-600">
            <tr>
              <th className="p-3">Employee</th>
              <th className="p-3">In</th>
              <th className="p-3">Out</th>
              <th className="p-3">Hours</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{e.user.name}</td>
                <td className="p-3 whitespace-nowrap">{e.clockIn.toLocaleString()}</td>
                <td className="p-3 whitespace-nowrap">{e.clockOut?.toLocaleString() ?? "—"}</td>
                <td className="p-3">{e.totalMinutes != null ? minutesToHoursLabel(e.totalMinutes) : "Open"}</td>
                <td className="p-3">
                  {e.needsReview ? <Badge tone="amber">Needs review</Badge> : <Badge tone="green">OK</Badge>}
                </td>
                <td className="p-3">
                  <ReasonNoteForm
                    action={managerUpsertTimesheet}
                    submitLabel="Edit / approve"
                    extraFields={
                      <>
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="userId" value={e.userId} />
                        <div className="mb-3 space-y-1">
                          <Label>Clock in</Label>
                          <Input name="clockIn" type="datetime-local" defaultValue={toLocalInput(e.clockIn)} required />
                        </div>
                        <div className="mb-3 space-y-1">
                          <Label>Clock out</Label>
                          <Input name="clockOut" type="datetime-local" defaultValue={toLocalInput(e.clockOut)} />
                        </div>
                        <div className="mb-3 space-y-1">
                          <Label>Notes</Label>
                          <Input name="notes" defaultValue={e.notes ?? ""} />
                        </div>
                        <label className="mb-3 flex items-center gap-2 text-sm">
                          <input type="checkbox" name="approve" value="true" defaultChecked />
                          Approve
                        </label>
                      </>
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
