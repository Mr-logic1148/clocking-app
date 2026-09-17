import { NextResponse } from "next/server";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/prisma";
import { autoCloseStaleEntries, getAttendanceState } from "@/lib/time-engine";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await autoCloseStaleEntries();
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, hourlyRate: true },
  });

  const board = await Promise.all(
    users.map(async (user) => {
      const { status, entry, openBreak } = await getAttendanceState(user.id);
      return {
        ...user,
        hourlyRate: user.hourlyRate ? Number(user.hourlyRate) : null,
        status,
        since: openBreak?.breakStart.toISOString() ?? entry?.clockIn.toISOString() ?? null,
      };
    }),
  );

  return NextResponse.json({ board, generatedAt: new Date().toISOString() });
}
