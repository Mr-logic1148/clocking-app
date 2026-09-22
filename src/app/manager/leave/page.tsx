import { prisma } from "@/lib/prisma";
import { ReasonNoteForm } from "@/components/reason-note-form";
import { Badge } from "@/components/ui/badge";
import { managerReviewLeave } from "@/app/manager/actions";

export default async function ManagerLeavePage() {
  const requests = await prisma.leaveRequest.findMany({
    where: { user: { role: "EMPLOYEE" } },
    include: { user: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Leave requests</h1>
        <p className="text-stone-600">Approve or reject holiday and sick leave. A reason note is mandatory.</p>
      </div>
      <div className="space-y-3">
        {requests.length === 0 && <p className="text-sm text-stone-500">No leave requests yet.</p>}
        {requests.map((r) => (
          <div key={r.id} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{r.user.name}</h2>
              <Badge>{r.type}</Badge>
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
                <ReasonNoteForm
                  action={managerReviewLeave}
                  submitLabel="Approve"
                  extraFields={
                    <>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="decision" value="APPROVED" />
                    </>
                  }
                />
                <ReasonNoteForm
                  action={managerReviewLeave}
                  submitLabel="Reject"
                  extraFields={
                    <>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="decision" value="REJECTED" />
                    </>
                  }
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
