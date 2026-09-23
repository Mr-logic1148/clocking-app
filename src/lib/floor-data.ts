import { prisma } from "@/lib/prisma";
import { startOfLocalDay, endOfLocalDay, getAttendanceState } from "@/lib/time-engine";
import type { Prisma, Role } from "@prisma/client";
import type { FloorRow } from "@/components/floor-plan-hub";

export async function getTodayFloorRows(roles: Role[]): Promise<FloorRow[]> {
  const from = startOfLocalDay();
  const to = endOfLocalDay();
  const where: Prisma.ShiftAssignmentWhereInput = {
    startsAt: { lte: to },
    endsAt: { gte: from },
    user: { isActive: true, role: { in: roles } },
  };
  const shifts = await prisma.shiftAssignment.findMany({
    where,
    include: { user: true },
    orderBy: [{ station: "asc" }, { startsAt: "asc" }],
  });

  return Promise.all(
    shifts.map(async (s) => {
      const { status } = await getAttendanceState(s.userId);
      return {
        id: s.id,
        userId: s.userId,
        name: s.user.name,
        email: s.user.email,
        station: s.station,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        status: status === "CLOCKED_OUT" ? "SCHEDULED" : status,
      };
    }),
  );
}
