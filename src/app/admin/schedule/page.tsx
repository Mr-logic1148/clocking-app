import { prisma } from "@/lib/prisma";
import { BulkScheduleForm } from "@/components/bulk-schedule-form";
import { adminBulkSchedule, adminSaveTemplate } from "@/app/admin/schedule-actions";
import { startOfLocalWeek } from "@/lib/time-engine";

export default async function AdminSchedulePage() {
  const weekStart = startOfLocalWeek();
  const [people, templates, upcoming] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, role: { in: ["EMPLOYEE", "MANAGER"] } },
      orderBy: { name: "asc" },
    }),
    prisma.shiftTemplate.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.shiftAssignment.findMany({
      where: { startsAt: { gte: weekStart } },
      include: { user: true },
      orderBy: { startsAt: "asc" },
      take: 80,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">All schedules</h1>
        <p className="text-stone-600">Admins can create, edit, swap, and delete any shift without an audit note.</p>
      </div>
      <BulkScheduleForm
        people={people}
        templates={templates}
        bulkAction={adminBulkSchedule}
        saveTemplateAction={adminSaveTemplate}
      />
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-stone-50">
            <tr>
              <th className="p-3">Person</th>
              <th className="p-3">Role</th>
              <th className="p-3">Station</th>
              <th className="p-3">Start</th>
              <th className="p-3">End</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{s.user.name}</td>
                <td className="p-3">{s.user.role}</td>
                <td className="p-3">{s.station ?? s.label ?? "—"}</td>
                <td className="p-3">{s.startsAt.toLocaleString()}</td>
                <td className="p-3">{s.endsAt.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
