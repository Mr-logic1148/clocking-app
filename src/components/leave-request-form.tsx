"use client";

import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LEAVE_TYPES, leaveTypeLabel } from "@/lib/leave";
import { requestLeave } from "@/app/me/actions";

type LeaveRow = {
  id: string;
  type: string;
  startDate: Date;
  endDate: Date;
  status: string;
};

export function LeaveRequestForm({
  leaves,
  heading = "Your leave is reviewed by an Admin — you cannot approve it yourself.",
}: {
  leaves: LeaveRow[];
  heading?: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">{heading}</p>
      <ActionForm action={requestLeave} success="Leave submitted for Admin review" className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Type</Label>
          <select name="type" required className="h-11 w-full rounded-xl border px-3 text-sm">
            {LEAVE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Start</Label>
          <Input name="startDate" type="date" required />
        </div>
        <div className="space-y-1">
          <Label>End</Label>
          <Input name="endDate" type="date" required />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Note</Label>
          <Input name="employeeNote" />
        </div>
        <Button type="submit">Submit request</Button>
      </ActionForm>
      <div className="space-y-2">
        {leaves.map((l) => (
          <div key={l.id} className="flex items-center justify-between text-sm">
            <span>
              {leaveTypeLabel(l.type)} · {l.startDate.toLocaleDateString()}–{l.endDate.toLocaleDateString()}
            </span>
            <Badge tone={l.status === "PENDING" ? "amber" : l.status === "APPROVED" ? "green" : "rose"}>
              {l.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
