"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPin, isValidPinFormat } from "@/lib/pin";
import { closedMinutes } from "@/lib/time-engine";
import { TimeEntrySource } from "@prisma/client";

const employeeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  pin: z.string().optional(),
  password: z.string().min(8).optional(),
  hourlyRate: z.string().optional(),
  isActive: z.string().optional(),
  role: z.enum(["ADMIN", "EMPLOYEE", "MANAGER"]).optional(),
});

export async function createEmployee(formData: FormData) {
  await requireAdmin();
  const parsed = employeeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    pin: formData.get("pin") || undefined,
    password: formData.get("password") || undefined,
    hourlyRate: formData.get("hourlyRate") || undefined,
    role: formData.get("role") || "EMPLOYEE",
  });
  if (!parsed.success) return { error: "Check name, email, and PIN (4–6 digits)." };

  const pin = parsed.data.pin;
  if (pin && !isValidPinFormat(pin)) return { error: "PIN must be 4–6 digits." };

  const password = parsed.data.password ?? "Employee123!";
  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role ?? "EMPLOYEE",
        passwordHash: await bcrypt.hash(password, 12),
        pinHash: pin ? hashPin(pin) : null,
        hourlyRate: parsed.data.hourlyRate ? parsed.data.hourlyRate : null,
      },
    });
  } catch {
    return { error: "Email or PIN already in use." };
  }
  revalidatePath("/admin/employees");
  return { ok: true };
}

export async function updateEmployee(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = employeeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    pin: formData.get("pin") || undefined,
    password: formData.get("password") || undefined,
    hourlyRate: formData.get("hourlyRate") || undefined,
    isActive: formData.get("isActive") || undefined,
    role: (formData.get("role") as "ADMIN" | "EMPLOYEE") || undefined,
  });
  if (!id || !parsed.success) return { error: "Invalid employee update." };

  const pin = parsed.data.pin;
  if (pin && !isValidPinFormat(pin)) return { error: "PIN must be 4–6 digits." };

  try {
    await prisma.user.update({
      where: { id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        isActive: parsed.data.isActive !== "false",
        hourlyRate: parsed.data.hourlyRate ? parsed.data.hourlyRate : null,
        ...(pin
          ? { pinHash: hashPin(pin), failedPinAttempts: 0, pinLockedUntil: null }
          : {}),
        ...(parsed.data.password
          ? { passwordHash: await bcrypt.hash(parsed.data.password, 12) }
          : {}),
      },
    });
  } catch {
    return { error: "Could not save employee (duplicate email/PIN?)." };
  }
  revalidatePath("/admin/employees");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deactivateEmployee(id: string) {
  await requireAdmin();
  await prisma.user.update({
    where: { id },
    data: { isActive: false, pinHash: null },
  });
  revalidatePath("/admin/employees");
  return { ok: true };
}

const entrySchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  clockIn: z.string(),
  clockOut: z.string().optional(),
  notes: z.string().optional(),
  approve: z.string().optional(),
});

async function totalFrom(clockIn: Date, clockOut: Date | null, entryId?: string) {
  if (!clockOut) return null;
  const breaks = entryId
    ? await prisma.breakLog.findMany({ where: { timeEntryId: entryId } })
    : [];
  return closedMinutes(clockIn, clockOut, breaks);
}

export async function upsertTimeEntry(formData: FormData) {
  const session = await requireAdmin();
  const parsed = entrySchema.safeParse({
    id: formData.get("id") || undefined,
    userId: formData.get("userId"),
    clockIn: formData.get("clockIn"),
    clockOut: formData.get("clockOut") || undefined,
    notes: formData.get("notes") || undefined,
    approve: formData.get("approve") || undefined,
  });
  if (!parsed.success) return { error: "Invalid timesheet values." };

  const clockIn = new Date(parsed.data.clockIn);
  const clockOut = parsed.data.clockOut ? new Date(parsed.data.clockOut) : null;
  if (Number.isNaN(clockIn.getTime()) || (clockOut && Number.isNaN(clockOut.getTime()))) {
    return { error: "Invalid date." };
  }
  if (clockOut && clockOut <= clockIn) return { error: "Clock-out must be after clock-in." };

  const data = {
    userId: parsed.data.userId,
    clockIn,
    clockOut,
    totalMinutes: await totalFrom(clockIn, clockOut, parsed.data.id),
    status: clockOut ? ("COMPLETED" as const) : ("ACTIVE" as const),
    source: TimeEntrySource.MANUAL,
    notes: parsed.data.notes,
    needsReview: parsed.data.approve !== "true",
    approvedAt: parsed.data.approve === "true" ? new Date() : null,
    approvedById: parsed.data.approve === "true" ? session.user.id : null,
  };

  if (parsed.data.id) {
    await prisma.timeEntry.update({ where: { id: parsed.data.id }, data });
  } else {
    await prisma.timeEntry.create({ data });
  }
  revalidatePath("/admin/timesheets");
  return { ok: true };
}

export async function approveTimeEntry(id: string) {
  const session = await requireAdmin();
  await prisma.timeEntry.update({
    where: { id },
    data: {
      needsReview: false,
      approvedAt: new Date(),
      approvedById: session.user.id,
    },
  });
  revalidatePath("/admin/timesheets");
  return { ok: true };
}
