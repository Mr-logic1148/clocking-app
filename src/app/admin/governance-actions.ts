"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Security boundary: only ADMIN may promote or demote the MANAGER role. */
export async function setStaffRole(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!id || (role !== "EMPLOYEE" && role !== "MANAGER")) {
    return { error: "Role must be EMPLOYEE or MANAGER." };
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "User not found." };
  if (target.role === Role.ADMIN) {
    return { error: "Admin accounts cannot be changed from this screen." };
  }

  await prisma.user.update({
    where: { id },
    data: { role: role as "EMPLOYEE" | "MANAGER" },
  });
  revalidatePath("/admin/users");
  revalidatePath("/admin/employees");
  revalidatePath("/admin/notifications");
  return { ok: true };
}

export async function markAuditRead(id: string) {
  await requireAdmin();
  await prisma.auditLog.update({
    where: { id },
    data: { isReadByAdmin: true },
  });
  revalidatePath("/admin/notifications");
  return { ok: true };
}

export async function markAllAuditsRead() {
  await requireAdmin();
  await prisma.auditLog.updateMany({
    where: { isReadByAdmin: false },
    data: { isReadByAdmin: true },
  });
  revalidatePath("/admin/notifications");
  return { ok: true };
}
