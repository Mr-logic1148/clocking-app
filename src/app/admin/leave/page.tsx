import { prisma } from "@/lib/prisma";
import { ActionForm } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminReviewLeave } from "@/app/admin/schedule-actions";
import { leaveTypeLabel } from "@/lib/leave";

export default async function AdminLeavePage() {
  const requests = await prisma.leaveRequest.findMany({
    include: { user: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Leave approvals</h1>
        <p className="text-stone-600">
          Manager self-requests land here. Admins can approve or reject any leave in the system.
        </p>
      </div>
      <div className="space-y-3">
        {requests.length === 0 && <p className="text-sm text-stone-500">No leave requests.</p>}
        {requests.map((r) => (
          <div key={r.id} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{r.user.name}</h2>
              <Badge>{r.user.role}</Badge>
              <Badge>{leaveTypeLabel(r.type)}</Badge>
              <Badge tone={r.status === "PENDING" ? "amber" : r.status === "APPROVED" ? "green" : "rose"}>
                {r.status}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-stone-600">
              {r.startDate.toLocaleDateString()} – {r.endDate.toLocaleDateString()}
            </p>
            {r.employeeNote && <p className="mt-1 text-sm">Note: {r.employeeNote}</p>}
            {r.status === "PENDING" && (
              <div className="mt-3 flex gap-2">
                <ActionForm action={adminReviewLeave}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="decision" value="APPROVED" />
                  <Button type="submit" size="sm">
                    Approve
                  </Button>
                </ActionForm>
                <ActionForm action={adminReviewLeave}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="decision" value="REJECTED" />
                  <Button type="submit" size="sm" variant="outline">
                    Reject
                  </Button>
                </ActionForm>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
