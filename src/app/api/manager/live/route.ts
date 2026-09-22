import { NextResponse } from "next/server";
import { requireManager } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { autoCloseStaleEntries, getAttendanceState } from "@/lib/time-engine";

export async function GET() {
  try {
    await requireManager();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await autoCloseStaleEntries();
  // Security boundary: never leak Admin presence, hours, or credentials on the manager floor.
  const users = await prisma.user.findMany({
    where: { isActive: true, role: "EMPLOYEE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });

  const board = await Promise.all(
    users.map(async (user) => {
      const { status, entry, openBreak } = await getAttendanceState(user.id);
      return {
        ...user,
        status,
        since: openBreak?.breakStart.toISOString() ?? entry?.clockIn.toISOString() ?? null,
      };
    }),
  );

  return NextResponse.json({ board, generatedAt: new Date().toISOString() });
}
