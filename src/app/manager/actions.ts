"use server";

import { revalidatePath } from "next/cache";
import { TimeEntrySource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { closedMinutes } from "@/lib/time-engine";
import {
  assertEmployeeTarget,
  parseReasonNote,
  requireManager,
  writeManagerAudit,
} from "@/lib/access";

function revalidateManager() {
  revalidatePath("/manager/dashboard");
  revalidatePath("/manager/timesheets");
  revalidatePath("/manager/schedule");
  revalidatePath("/manager/leave");
  revalidatePath("/manager/broadcasts");
  revalidatePath("/admin/notifications");
}

function fail(err: unknown) {
  return { error: err instanceof Error ? err.message : "Request failed." };
}

export async function managerUpsertTimesheet(formData: FormData) {
  try {
  const session = await requireManager();
  const reasonNote = parseReasonNote(formData.get("reasonNote"));
  const id = String(formData.get("id") || "");
  const userId = String(formData.get("userId") ?? "");
  const target = await assertEmployeeTarget(userId);

  const clockIn = new Date(String(formData.get("clockIn")));
  const clockOutRaw = String(formData.get("clockOut") ?? "");
  const clockOut = clockOutRaw ? new Date(clockOutRaw) : null;
  if (Number.isNaN(clockIn.getTime()) || (clockOut && Number.isNaN(clockOut.getTime()))) {
    return { error: "Invalid date." };
  }
  if (clockOut && clockOut <= clockIn) return { error: "Clock-out must be after clock-in." };

  const approve = String(formData.get("approve") ?? "") === "true";
  const notes = String(formData.get("notes") ?? "") || null;
  const breaks = id ? await prisma.breakLog.findMany({ where: { timeEntryId: id } }) : [];
  const totalMinutes = clockOut ? closedMinutes(clockIn, clockOut, breaks) : null;

  const data = {
    userId,
    clockIn,
    clockOut,
    totalMinutes,
    status: clockOut ? ("COMPLETED" as const) : ("ACTIVE" as const),
    source: TimeEntrySource.MANUAL,
    notes,
    needsReview: !approve,
    approvedAt: approve ? new Date() : null,
    approvedById: approve ? session.user.id : null,
  };

  if (id) {
    const existing = await prisma.timeEntry.findUnique({ where: { id }, include: { user: true } });
    if (!existing || existing.user.role !== "EMPLOYEE") {
      return { error: "Cannot edit this timesheet." };
    }
    await prisma.timeEntry.update({ where: { id }, data });
  } else {
    await prisma.timeEntry.create({ data });
  }

  await writeManagerAudit({
    managerId: session.user.id,
    targetUserId: userId,
    actionType: approve ? "TIMESHEET_APPROVAL" : "TIMESHEET_EDIT",
    description: `${session.user.name} ${approve ? "approved" : "edited"} hours for ${target.name} (${clockIn.toLocaleString()} → ${clockOut?.toLocaleString() ?? "open"}).`,
    reasonNote,
  });
  revalidateManager();
  return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function managerReviewLeave(formData: FormData) {
  try {
  const session = await requireManager();
  const reasonNote = parseReasonNote(formData.get("reasonNote"));
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "APPROVED" && decision !== "REJECTED") return { error: "Invalid decision." };

  const leave = await prisma.leaveRequest.findUnique({ where: { id }, include: { user: true } });
  if (!leave || leave.user.role !== "EMPLOYEE") return { error: "Leave request not found." };

  await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: decision,
      reviewedById: session.user.id,
    },
  });

  await writeManagerAudit({
    managerId: session.user.id,
    targetUserId: leave.userId,
    actionType: decision === "APPROVED" ? "LEAVE_APPROVAL" : "LEAVE_REJECTION",
    description: `${session.user.name} ${decision.toLowerCase()} ${leave.type.toLowerCase()} leave for ${leave.user.name} (${leave.startDate.toLocaleDateString()}–${leave.endDate.toLocaleDateString()}).`,
    reasonNote,
  });
  revalidateManager();
  return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function managerUpsertShift(formData: FormData) {
  try {
  const session = await requireManager();
  const reasonNote = parseReasonNote(formData.get("reasonNote"));
  const id = String(formData.get("id") || "");
  const userId = String(formData.get("userId") ?? "");
  const target = await assertEmployeeTarget(userId);
  const startsAt = new Date(String(formData.get("startsAt")));
  const endsAt = new Date(String(formData.get("endsAt")));
  const label = String(formData.get("label") ?? "") || null;
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return { error: "Invalid shift times." };
  }

  if (id) {
    const existing = await prisma.shiftAssignment.findUnique({ where: { id }, include: { user: true } });
    if (!existing || existing.user.role !== "EMPLOYEE") return { error: "Cannot edit this shift." };
    await prisma.shiftAssignment.update({
      where: { id },
      data: { userId, startsAt, endsAt, label },
    });
  } else {
    await prisma.shiftAssignment.create({
      data: { userId, startsAt, endsAt, label, createdById: session.user.id },
    });
  }

  await writeManagerAudit({
    managerId: session.user.id,
    targetUserId: userId,
    actionType: "SCHEDULE_CHANGE",
    description: `${session.user.name} ${id ? "updated" : "scheduled"} a shift for ${target.name} (${startsAt.toLocaleString()}–${endsAt.toLocaleString()}).`,
    reasonNote,
  });
  revalidateManager();
  return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function managerReviewSwap(formData: FormData) {
  try {
  const session = await requireManager();
  const reasonNote = parseReasonNote(formData.get("reasonNote"));
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "APPROVED" && decision !== "REJECTED") return { error: "Invalid decision." };

  const swap = await prisma.shiftSwapRequest.findUnique({
    where: { id },
    include: {
      requester: true,
      counterpart: true,
      requesterShift: true,
      counterpartShift: true,
    },
  });
  if (!swap || swap.requester.role !== "EMPLOYEE" || swap.counterpart.role !== "EMPLOYEE") {
    return { error: "Swap not found." };
  }

  if (decision === "APPROVED") {
    await prisma.$transaction([
      prisma.shiftAssignment.update({
        where: { id: swap.requesterShiftId },
        data: { userId: swap.counterpartId },
      }),
      prisma.shiftAssignment.update({
        where: { id: swap.counterpartShiftId },
        data: { userId: swap.requesterId },
      }),
      prisma.shiftSwapRequest.update({
        where: { id },
        data: { status: "APPROVED", reviewedById: session.user.id },
      }),
    ]);
  } else {
    await prisma.shiftSwapRequest.update({
      where: { id },
      data: { status: "REJECTED", reviewedById: session.user.id },
    });
  }

  await writeManagerAudit({
    managerId: session.user.id,
    targetUserId: swap.requesterId,
    actionType: decision === "APPROVED" ? "SHIFT_SWAP_APPROVAL" : "SHIFT_SWAP_REJECTION",
    description: `${session.user.name} ${decision.toLowerCase()} a shift swap between ${swap.requester.name} and ${swap.counterpart.name}.`,
    reasonNote,
  });
  revalidateManager();
  return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function managerSendBroadcast(formData: FormData) {
  try {
  const session = await requireManager();
  const reasonNote = parseReasonNote(formData.get("reasonNote"));
  const message = String(formData.get("message") ?? "").trim();
  const hours = Number(formData.get("hours") ?? 4);
  if (message.length < 8) return { error: "Alert message must be at least 8 characters." };
  const expiresAt = new Date(Date.now() + Math.min(24, Math.max(1, hours)) * 60 * 60 * 1000);

  const offDuty = await prisma.user.findMany({
    where: { role: "EMPLOYEE", isActive: true },
    select: { id: true, timeEntries: { where: { status: "ACTIVE" }, select: { id: true } } },
  });
  const recipients = offDuty.filter((u) => u.timeEntries.length === 0);

  const broadcast = await prisma.floorBroadcast.create({
    data: {
      managerId: session.user.id,
      message,
      channel: "KIOSK+IN_APP",
      expiresAt,
      receipts: {
        create: recipients.map((u) => ({ userId: u.id })),
      },
    },
  });

  const targetId = recipients[0]?.id ?? session.user.id;
  await writeManagerAudit({
    managerId: session.user.id,
    targetUserId: targetId,
    actionType: "FLOOR_BROADCAST",
    description: `${session.user.name} sent a floor request alert to ${recipients.length} off-duty staff: "${message}"`,
    reasonNote,
  });
  revalidateManager();
  return { ok: true, delivered: recipients.length, id: broadcast.id };
  } catch (err) {
    return fail(err);
  }
}
