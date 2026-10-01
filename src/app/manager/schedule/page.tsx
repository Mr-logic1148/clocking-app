import { prisma } from "@/lib/prisma";
import { BulkScheduleForm } from "@/components/bulk-schedule-form";
import { managerBulkSchedule, managerSaveTemplate } from "@/app/manager/schedule-actions";
import { startOfLocalWeek } from "@/lib/time-engine";

export default async function ManagerSchedulePage() {
  const weekStart = startOfLocalWeek();
  const [people, templates, upcoming] = await Promise.all([
    prisma.user.findMany({
      where: { role: "EMPLOYEE", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.shiftTemplate.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.shiftAssignment.findMany({
      where: { startsAt: { gte: weekStart }, user: { role: "EMPLOYEE" } },
      include: { user: true },
      orderBy: { startsAt: "asc" },
      take: 60,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Weekly schedule</h1>
        <p className="text-stone-600">
          Batch-assign a crew across a week. Every manager change still needs an audit note.
        </p>
      </div>
      <BulkScheduleForm
        people={people}
        templates={templates}
        bulkAction={managerBulkSchedule}
        saveTemplateAction={managerSaveTemplate}
        requireReason
      />
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-stone-50">
            <tr>
              <th className="p-3">Employee</th>
              <th className="p-3">Station</th>
              <th className="p-3">Start</th>
              <th className="p-3">End</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{s.user.name}</td>
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
