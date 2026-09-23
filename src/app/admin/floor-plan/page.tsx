import { prisma } from "@/lib/prisma";
import { FloorPlanHub } from "@/components/floor-plan-hub";
import { getTodayFloorRows } from "@/lib/floor-data";
import { adminAddShift, adminRemoveShift, adminSwapShifts } from "@/app/admin/schedule-actions";

export default async function AdminFloorPlanPage() {
  const [rows, people] = await Promise.all([
    getTodayFloorRows(["EMPLOYEE", "MANAGER", "ADMIN"]),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Floor plan</h1>
        <p className="text-stone-600">Full override: every scheduled person in the operation.</p>
      </div>
      <FloorPlanHub
        rows={rows}
        people={people}
        addAction={adminAddShift}
        swapAction={adminSwapShifts}
        removeAction={adminRemoveShift}
      />
    </div>
  );
}
