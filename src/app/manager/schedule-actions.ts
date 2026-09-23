"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  assertEmployeeTarget,
  parseReasonNote,
  requireManager,
  writeManagerAudit,
} from "@/lib/access";
import {
  addSingleShift,
  createBulkShifts,
  removeShift,
  swapShiftWorkers,
} from "@/lib/shift-ops";

function revalidateSchedules() {
  revalidatePath("/manager/schedule");
  revalidatePath("/manager/floor-plan");
  revalidatePath("/manager/dashboard");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/floor-plan");
  revalidatePath("/admin/notifications");
  revalidatePath("/dashboard/leave");
}

function fail(err: unknown) {
  return { error: err instanceof Error ? err.message : "Request failed." };
}

function userIdsFrom(formData: FormData) {
  return formData.getAll("userIds").map(String).filter(Boolean);
}

function weekdaysFrom(formData: FormData) {
  return formData.getAll("weekdays").map((v) => Number(v)).filter((n) => !Number.isNaN(n));
}

export async function managerBulkSchedule(formData: FormData) {
  try {
    const session = await requireManager();
    const reasonNote = parseReasonNote(formData.get("reasonNote"));
    const userIds = userIdsFrom(formData);
    for (const id of userIds) await assertEmployeeTarget(id);
    const station = String(formData.get("station") ?? "") || null;
    const result = await createBulkShifts({
      userIds,
      rangeStart: new Date(String(formData.get("rangeStart"))),
      rangeEnd: new Date(String(formData.get("rangeEnd"))),
      weekdays: weekdaysFrom(formData),
      startTime: String(formData.get("startTime") ?? "06:00"),
      endTime: String(formData.get("endTime") ?? "14:00"),
      station,
      createdById: session.user.id,
      isRecurring: String(formData.get("isRecurring") ?? "") === "true",
    });
    await writeManagerAudit({
      managerId: session.user.id,
      targetUserId: userIds[0],
      actionType: "SCHEDULE_CHANGE",
      description: `${session.user.name} bulk-scheduled ${result.created} shift(s) for ${userIds.length} employee(s)${station ? ` on ${station}` : ""}.`,
      reasonNote,
    });
    revalidateSchedules();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function managerSaveTemplate(formData: FormData) {
  try {
    const session = await requireManager();
    const name = String(formData.get("name") ?? "").trim();
    if (name.length < 3) return { error: "Template name must be at least 3 characters." };
    await prisma.shiftTemplate.create({
      data: {
        name,
        station: String(formData.get("station") ?? "") || null,
        startTime: String(formData.get("startTime") ?? "06:00"),
        endTime: String(formData.get("endTime") ?? "14:00"),
        weekdays: weekdaysFrom(formData),
        createdById: session.user.id,
      },
    });
    revalidateSchedules();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function managerAddShift(formData: FormData) {
  try {
    const session = await requireManager();
    const reasonNote = parseReasonNote(formData.get("reasonNote"));
    const userId = String(formData.get("userId") ?? "");
    const target = await assertEmployeeTarget(userId);
    const startsAt = new Date(String(formData.get("startsAt")));
    const endsAt = new Date(String(formData.get("endsAt")));
    await addSingleShift({
      userId,
      startsAt,
      endsAt,
      station: String(formData.get("station") ?? "") || null,
      createdById: session.user.id,
    });
    await writeManagerAudit({
      managerId: session.user.id,
      targetUserId: userId,
      actionType: "SCHEDULE_CHANGE",
      description: `${session.user.name} added ${target.name} to a shift (${startsAt.toLocaleString()}).`,
      reasonNote,
    });
    revalidateSchedules();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function managerSwapShifts(formData: FormData) {
  try {
    const session = await requireManager();
    const reasonNote = parseReasonNote(formData.get("reasonNote"));
    const a = String(formData.get("shiftA") ?? "");
    const b = String(formData.get("shiftB") ?? "");
    const result = await swapShiftWorkers(a, b);
    await writeManagerAudit({
      managerId: session.user.id,
      targetUserId: result.aUserId,
      actionType: "SHIFT_SWAP_APPROVAL",
      description: `${session.user.name} swapped two scheduled shifts on the floor plan.`,
      reasonNote,
    });
    revalidateSchedules();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function managerRemoveShift(formData: FormData) {
  try {
    const session = await requireManager();
    const reasonNote = parseReasonNote(formData.get("reasonNote"));
    const id = String(formData.get("id") ?? "");
    const existing = await prisma.shiftAssignment.findUnique({ where: { id }, include: { user: true } });
    if (!existing || existing.user.role !== "EMPLOYEE") return { error: "Shift not found." };
    await removeShift(id);
    await writeManagerAudit({
      managerId: session.user.id,
      targetUserId: existing.userId,
      actionType: "SCHEDULE_CHANGE",
      description: `${session.user.name} removed ${existing.user.name}'s shift (${existing.startsAt.toLocaleString()}).`,
      reasonNote,
    });
    revalidateSchedules();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
