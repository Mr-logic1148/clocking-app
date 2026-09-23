import { prisma } from "@/lib/prisma";
import { FloorPlanHub } from "@/components/floor-plan-hub";
import { getTodayFloorRows } from "@/lib/floor-data";
import { managerAddShift, managerRemoveShift, managerSwapShifts } from "@/app/manager/schedule-actions";

export default async function ManagerFloorPlanPage() {
  const [rows, people] = await Promise.all([
    getTodayFloorRows(["EMPLOYEE"]),
    prisma.user.findMany({ where: { role: "EMPLOYEE", isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Floor plan</h1>
        <p className="text-stone-600">Today’s stations, live status, and shift actions for regular employees.</p>
      </div>
      <FloorPlanHub
        rows={rows}
        people={people}
        addAction={managerAddShift}
        swapAction={managerSwapShifts}
        removeAction={managerRemoveShift}
        requireReason
      />
    </div>
  );
}
