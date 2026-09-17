import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { startOfLocalMonth, startOfLocalWeek } from "@/lib/time-engine";
import { minutesToHoursLabel, OVERTIME_WEEKLY_HOURS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReportsPage() {
  const from = startOfLocalWeek();
  const monthFrom = startOfLocalMonth();
  const users = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    include: {
      timeEntries: {
        where: { clockIn: { gte: monthFrom } },
        include: { breaks: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = users.map((u) => {
    const week = u.timeEntries.filter((e) => e.clockIn >= from);
    const weekMinutes = week.reduce((s, e) => s + (e.totalMinutes ?? 0), 0);
    const monthMinutes = u.timeEntries.reduce((s, e) => s + (e.totalMinutes ?? 0), 0);
    const breakMinutes = u.timeEntries.reduce(
      (s, e) => s + e.breaks.reduce((b, x) => b + (x.durationMinutes ?? 0), 0),
      0,
    );
    return {
      name: u.name,
      weekMinutes,
      monthMinutes,
      breakMinutes,
      overtime: Math.max(0, weekMinutes - OVERTIME_WEEKLY_HOURS * 60),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
          <p className="text-stone-600">
            Weekly overtime uses a {OVERTIME_WEEKLY_HOURS}h threshold. Forgotten midnight clock-outs
            are auto-closed and flagged for review.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href="/api/admin/export?range=week">CSV week</a>
          </Button>
          <Button asChild variant="outline">
            <a href="/api/admin/export?range=month">CSV month</a>
          </Button>
          <Button asChild>
            <Link href="/admin/reports/print">Print / PDF</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Week hours</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {minutesToHoursLabel(rows.reduce((s, r) => s + r.weekMinutes, 0))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Break time (month)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {minutesToHoursLabel(rows.reduce((s, r) => s + r.breakMinutes, 0))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Overtime (week)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {minutesToHoursLabel(rows.reduce((s, r) => s + r.overtime, 0))}
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-stone-50">
            <tr>
              <th className="p-3">Employee</th>
              <th className="p-3">This week</th>
              <th className="p-3">This month</th>
              <th className="p-3">Breaks (month)</th>
              <th className="p-3">Overtime (week)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b last:border-0">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3">{minutesToHoursLabel(r.weekMinutes)}</td>
                <td className="p-3">{minutesToHoursLabel(r.monthMinutes)}</td>
                <td className="p-3">{minutesToHoursLabel(r.breakMinutes)}</td>
                <td className="p-3">{minutesToHoursLabel(r.overtime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
