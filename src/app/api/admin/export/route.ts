import { NextResponse } from "next/server";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfLocalMonth, startOfLocalWeek } from "@/lib/time-engine";
import { OVERTIME_WEEKLY_HOURS } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") === "month" ? "month" : "week";
  const from = range === "month" ? startOfLocalMonth() : startOfLocalWeek();

  const users = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    include: {
      timeEntries: {
        where: { clockIn: { gte: from } },
        include: { breaks: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const header = [
    "Name",
    "Email",
    "Worked Minutes",
    "Break Minutes",
    "Overtime Minutes",
    "Needs Review",
  ];
  const rows = users.map((u) => {
    let worked = 0;
    let breaks = 0;
    let review = 0;
    for (const e of u.timeEntries) {
      worked += e.totalMinutes ?? 0;
      if (e.needsReview) review += 1;
      for (const b of e.breaks) breaks += b.durationMinutes ?? 0;
    }
    const overtime = Math.max(0, worked - OVERTIME_WEEKLY_HOURS * 60);
    return [u.name, u.email, worked, breaks, overtime, review].join(",");
  });

  const csv = [header.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="harvest-hours-${range}.csv"`,
    },
  });
}
