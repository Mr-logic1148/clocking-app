"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addSingleShift, createBulkShifts, removeShift, swapShiftWorkers } from "@/lib/shift-ops";

function revalidate() {
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/floor-plan");
  revalidatePath("/manager/schedule");
  revalidatePath("/manager/floor-plan");
}

function fail(err: unknown) {
  return { error: err instanceof Error ? err.message : "Request failed." };
}

export async function adminBulkSchedule(formData: FormData) {
  try {
    const session = await requireAdmin();
    const userIds = formData.getAll("userIds").map(String).filter(Boolean);
    const result = await createBulkShifts({
      userIds,
      rangeStart: new Date(String(formData.get("rangeStart"))),
      rangeEnd: new Date(String(formData.get("rangeEnd"))),
      weekdays: formData.getAll("weekdays").map((v) => Number(v)),
      startTime: String(formData.get("startTime") ?? "06:00"),
      endTime: String(formData.get("endTime") ?? "14:00"),
      station: String(formData.get("station") ?? "") || null,
      createdById: session.user.id,
      isRecurring: String(formData.get("isRecurring") ?? "") === "true",
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function adminSaveTemplate(formData: FormData) {
  try {
    const session = await requireAdmin();
    const name = String(formData.get("name") ?? "").trim();
    if (name.length < 3) return { error: "Template name must be at least 3 characters." };
    await prisma.shiftTemplate.create({
      data: {
        name,
        station: String(formData.get("station") ?? "") || null,
        startTime: String(formData.get("startTime") ?? "06:00"),
        endTime: String(formData.get("endTime") ?? "14:00"),
        weekdays: formData.getAll("weekdays").map((v) => Number(v)),
        createdById: session.user.id,
      },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function adminAddShift(formData: FormData) {
  try {
    const session = await requireAdmin();
    await addSingleShift({
      userId: String(formData.get("userId") ?? ""),
      startsAt: new Date(String(formData.get("startsAt"))),
      endsAt: new Date(String(formData.get("endsAt"))),
      station: String(formData.get("station") ?? "") || null,
      createdById: session.user.id,
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function adminSwapShifts(formData: FormData) {
  try {
    await requireAdmin();
    await swapShiftWorkers(String(formData.get("shiftA") ?? ""), String(formData.get("shiftB") ?? ""));
    revalidate();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function adminRemoveShift(formData: FormData) {
  try {
    await requireAdmin();
    await removeShift(String(formData.get("id") ?? ""));
    revalidate();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function adminReviewLeave(formData: FormData) {
  try {
    const session = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const decision = String(formData.get("decision") ?? "");
    if (decision !== "APPROVED" && decision !== "REJECTED") return { error: "Invalid decision." };
    await prisma.leaveRequest.update({
      where: { id },
      data: { status: decision, reviewedById: session.user.id },
    });
    revalidatePath("/admin/leave");
    revalidatePath("/dashboard/leave");
    revalidatePath("/manager/leave");
    revalidatePath("/me");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
