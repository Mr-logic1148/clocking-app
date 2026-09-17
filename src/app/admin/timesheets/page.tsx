import { prisma } from "@/lib/prisma";
import { ActionForm, approveTimeEntry, upsertTimeEntry } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { minutesToHoursLabel } from "@/lib/utils";

function toLocalInput(d: Date | null) {
  if (!d) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function TimesheetsPage() {
  const [users, entries] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.timeEntry.findMany({
      include: { user: true, breaks: true },
      orderBy: { clockIn: "desc" },
      take: 80,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Timesheets</h1>
        <p className="text-stone-600">Correct missing punches and approve system auto-closes.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add missing entry</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={upsertTimeEntry} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label>Employee</Label>
              <select name="userId" required className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm">
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Clock in</Label>
              <Input name="clockIn" type="datetime-local" required />
            </div>
            <div className="space-y-1">
              <Label>Clock out</Label>
              <Input name="clockOut" type="datetime-local" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Notes</Label>
              <Input name="notes" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="approve" value="true" defaultChecked />
              Mark approved
            </label>
            <Button type="submit">Save entry</Button>
          </ActionForm>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-stone-50 text-stone-600">
            <tr>
              <th className="p-3">Employee</th>
              <th className="p-3">In</th>
              <th className="p-3">Out</th>
              <th className="p-3">Hours</th>
              <th className="p-3">Source</th>
              <th className="p-3">Status</th>
              <th className="p-3">Edit</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{e.user.name}</td>
                <td className="p-3 whitespace-nowrap">{e.clockIn.toLocaleString()}</td>
                <td className="p-3 whitespace-nowrap">{e.clockOut?.toLocaleString() ?? "—"}</td>
                <td className="p-3">{e.totalMinutes != null ? minutesToHoursLabel(e.totalMinutes) : "Open"}</td>
                <td className="p-3">{e.source}</td>
                <td className="p-3">
                  {e.needsReview ? <Badge tone="amber">Needs review</Badge> : <Badge tone="green">OK</Badge>}
                </td>
                <td className="p-3">
                  <ActionForm action={upsertTimeEntry} className="flex flex-col gap-2">
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="userId" value={e.userId} />
                    <Input name="clockIn" type="datetime-local" defaultValue={toLocalInput(e.clockIn)} />
                    <Input name="clockOut" type="datetime-local" defaultValue={toLocalInput(e.clockOut)} />
                    <Input name="notes" defaultValue={e.notes ?? ""} />
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" name="approve" value="true" defaultChecked={!e.needsReview} />
                      Approved
                    </label>
                    <Button size="sm" type="submit">
                      Update
                    </Button>
                  </ActionForm>
                  {e.needsReview && (
                    <form
                      className="mt-2"
                      action={async () => {
                        "use server";
                        await approveTimeEntry(e.id);
                      }}
                    >
                      <Button size="sm" variant="secondary" type="submit">
                        Approve
                      </Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
