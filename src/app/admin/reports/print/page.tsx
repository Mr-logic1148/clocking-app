import { prisma } from "@/lib/prisma";
import { startOfLocalWeek } from "@/lib/time-engine";
import { minutesToHoursLabel, OVERTIME_WEEKLY_HOURS } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";

export default async function PrintReportPage() {
  const from = startOfLocalWeek();
  const users = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    include: { timeEntries: { where: { clockIn: { gte: from } } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Harvest Clock — weekly hours</h1>
      <p className="mb-4 text-sm text-stone-600">Week starting {from.toLocaleDateString()}</p>
      <PrintButton />
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Employee</th>
            <th>Hours</th>
            <th>Overtime (&gt;{OVERTIME_WEEKLY_HOURS}h)</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const mins = u.timeEntries.reduce((s, e) => s + (e.totalMinutes ?? 0), 0);
            return (
              <tr key={u.id} className="border-b">
                <td className="py-2">{u.name}</td>
                <td>{minutesToHoursLabel(mins)}</td>
                <td>{minutesToHoursLabel(Math.max(0, mins - OVERTIME_WEEKLY_HOURS * 60))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
