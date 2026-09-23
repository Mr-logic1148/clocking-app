"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isLeaveType } from "@/lib/leave";

export async function requestLeave(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  if (session.user.role !== "EMPLOYEE" && session.user.role !== "MANAGER") {
    return { error: "Only staff can request leave." };
  }

  const type = String(formData.get("type") ?? "");
  if (!isLeaveType(type)) return { error: "Choose a valid leave type." };
  const startDate = new Date(String(formData.get("startDate")));
  const endDate = new Date(String(formData.get("endDate")));
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return { error: "Invalid leave dates." };
  }

  await prisma.leaveRequest.create({
    data: {
      userId: session.user.id,
      type,
      startDate,
      endDate,
      employeeNote: String(formData.get("employeeNote") ?? "") || null,
    },
  });
  revalidatePath("/me");
  revalidatePath("/dashboard/leave");
  revalidatePath("/manager/leave");
  revalidatePath("/admin/leave");
  return { ok: true };
}

export async function requestShiftSwap(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  if (session.user.role !== "EMPLOYEE") return { error: "Only employees can request swaps." };

  const requesterShiftId = String(formData.get("requesterShiftId") ?? "");
  const counterpartShiftId = String(formData.get("counterpartShiftId") ?? "");
  const mine = await prisma.shiftAssignment.findFirst({
    where: { id: requesterShiftId, userId: session.user.id },
  });
  const theirs = await prisma.shiftAssignment.findUnique({
    where: { id: counterpartShiftId },
    include: { user: true },
  });
  if (!mine || !theirs || theirs.user.role !== "EMPLOYEE" || theirs.userId === session.user.id) {
    return { error: "Pick two valid employee shifts." };
  }

  await prisma.shiftSwapRequest.create({
    data: {
      requesterId: session.user.id,
      counterpartId: theirs.userId,
      requesterShiftId,
      counterpartShiftId,
    },
  });
  revalidatePath("/me");
  revalidatePath("/manager/schedule");
  return { ok: true };
}

export async function markBroadcastRead(id: string) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  await prisma.floorBroadcastReceipt.updateMany({
    where: { broadcastId: id, userId: session.user.id },
    data: { readAt: new Date() },
  });
  revalidatePath("/me");
  return { ok: true };
}
