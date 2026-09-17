import { prisma } from "@/lib/prisma";
import { ORG_TIMEZONE, OVERTIME_DAILY_HOURS } from "@/lib/utils";
import { Prisma, TimeEntrySource } from "@prisma/client";

const MAX_SHIFT_MS = 12 * 60 * 60 * 1000;
const USER_PIN_LOCK_ATTEMPTS = 8;
const USER_PIN_LOCK_MS = 30 * 60 * 1000;

export type AttendanceStatus = "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK";

export type KioskSnapshot = {
  userId: string;
  name: string;
  status: AttendanceStatus;
  clockedInAt: string | null;
  breakStartedAt: string | null;
  todayMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
};

function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function utcFromZoned(year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const shown = zonedParts(new Date(asUtc), ORG_TIMEZONE);
  const shownUtc = Date.UTC(
    shown.year,
    shown.month - 1,
    shown.day,
    shown.hour,
    shown.minute,
    shown.second,
  );
  return new Date(asUtc - (shownUtc - asUtc));
}

export function startOfLocalDay(date = new Date()) {
  const p = zonedParts(date, ORG_TIMEZONE);
  return utcFromZoned(p.year, p.month, p.day);
}

export function endOfLocalDay(date = new Date()) {
  const p = zonedParts(date, ORG_TIMEZONE);
  return utcFromZoned(p.year, p.month, p.day, 23, 59, 59);
}

export function startOfLocalWeek(date = new Date()) {
  const start = startOfLocalDay(date);
  const weekday = new Intl.DateTimeFormat("en-GB", {
    timeZone: ORG_TIMEZONE,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const offset = map[weekday] ?? 0;
  return new Date(start.getTime() - offset * 24 * 60 * 60 * 1000);
}

export function startOfLocalMonth(date = new Date()) {
  const p = zonedParts(date, ORG_TIMEZONE);
  return utcFromZoned(p.year, p.month, 1);
}

function closedMinutes(clockIn: Date, clockOut: Date, breaks: { breakStart: Date; breakEnd: Date | null }[]) {
  let ms = clockOut.getTime() - clockIn.getTime();
  for (const b of breaks) {
    const end = b.breakEnd ?? clockOut;
    ms -= Math.max(0, end.getTime() - b.breakStart.getTime());
  }
  return Math.max(0, Math.round(ms / 60000));
}

export async function autoCloseStaleEntries(userId?: string) {
  const todayStart = startOfLocalDay();
  const open = await prisma.timeEntry.findMany({
    where: {
      status: "ACTIVE",
      clockIn: { lt: todayStart },
      ...(userId ? { userId } : {}),
    },
    include: { breaks: true },
  });

  for (const entry of open) {
    const localEnd = endOfLocalDay(entry.clockIn);
    const capped = new Date(Math.min(localEnd.getTime(), entry.clockIn.getTime() + MAX_SHIFT_MS));
    const openBreak = entry.breaks.find((b) => !b.breakEnd);
    await prisma.$transaction(async (tx) => {
      if (openBreak) {
        const durationMinutes = Math.max(
          0,
          Math.round((capped.getTime() - openBreak.breakStart.getTime()) / 60000),
        );
        await tx.breakLog.update({
          where: { id: openBreak.id },
          data: { breakEnd: capped, durationMinutes },
        });
      }
      const breaks = await tx.breakLog.findMany({ where: { timeEntryId: entry.id } });
      await tx.timeEntry.update({
        where: { id: entry.id },
        data: {
          clockOut: capped,
          status: "COMPLETED",
          totalMinutes: closedMinutes(entry.clockIn, capped, breaks),
          needsReview: true,
          source: TimeEntrySource.SYSTEM,
          notes: entry.notes
            ? `${entry.notes}\nAuto-closed: missing clock-out past midnight.`
            : "Auto-closed: missing clock-out past midnight.",
        },
      });
    });
  }
}

export async function getAttendanceState(userId: string) {
  const active = await prisma.timeEntry.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { breaks: true },
    orderBy: { clockIn: "desc" },
  });
  if (!active) return { status: "CLOCKED_OUT" as const, entry: null, openBreak: null };
  const openBreak = active.breaks.find((b) => !b.breakEnd) ?? null;
  if (openBreak) return { status: "ON_BREAK" as const, entry: active, openBreak };
  return { status: "CLOCKED_IN" as const, entry: active, openBreak: null };
}

async function summedMinutes(userId: string, from: Date) {
  const entries = await prisma.timeEntry.findMany({
    where: { userId, clockIn: { gte: from } },
    include: { breaks: true },
  });
  let total = 0;
  const now = new Date();
  for (const e of entries) {
    if (e.totalMinutes != null) {
      total += e.totalMinutes;
      continue;
    }
    const end = e.clockOut ?? now;
    total += closedMinutes(e.clockIn, end, e.breaks);
  }
  return total;
}

export async function getKioskSnapshot(userId: string): Promise<KioskSnapshot> {
  await autoCloseStaleEntries(userId);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const { status, entry, openBreak } = await getAttendanceState(userId);
  return {
    userId,
    name: user.name,
    status,
    clockedInAt: entry?.clockIn.toISOString() ?? null,
    breakStartedAt: openBreak?.breakStart.toISOString() ?? null,
    todayMinutes: await summedMinutes(userId, startOfLocalDay()),
    weekMinutes: await summedMinutes(userId, startOfLocalWeek()),
    monthMinutes: await summedMinutes(userId, startOfLocalMonth()),
  };
}

export async function clockIn(userId: string, source: TimeEntrySource = "KIOSK") {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const existing = await tx.timeEntry.findFirst({
      where: { userId, status: "ACTIVE" },
    });
    if (existing) {
      throw new Error("Already clocked in.");
    }
    return tx.timeEntry.create({
      data: { userId, clockIn: new Date(), source, status: "ACTIVE" },
    });
  });
}

export async function startBreak(userId: string) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.timeEntry.findFirst({
      where: { userId, status: "ACTIVE" },
      include: { breaks: true },
    });
    if (!entry) throw new Error("Clock in before starting a break.");
    if (entry.breaks.some((b) => !b.breakEnd)) throw new Error("A break is already open.");
    return tx.breakLog.create({
      data: { timeEntryId: entry.id, breakStart: new Date() },
    });
  });
}

export async function endBreak(userId: string) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.timeEntry.findFirst({
      where: { userId, status: "ACTIVE" },
      include: { breaks: true },
    });
    if (!entry) throw new Error("No active shift.");
    const open = entry.breaks.find((b) => !b.breakEnd);
    if (!open) throw new Error("No break to end.");
    const now = new Date();
    const durationMinutes = Math.max(0, Math.round((now.getTime() - open.breakStart.getTime()) / 60000));
    return tx.breakLog.update({
      where: { id: open.id },
      data: { breakEnd: now, durationMinutes },
    });
  });
}

export async function clockOut(userId: string) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.timeEntry.findFirst({
      where: { userId, status: "ACTIVE" },
      include: { breaks: true },
    });
    if (!entry) throw new Error("Not clocked in.");
    const now = new Date();
    const openBreak = entry.breaks.find((b) => !b.breakEnd);
    if (openBreak) {
      const durationMinutes = Math.max(
        0,
        Math.round((now.getTime() - openBreak.breakStart.getTime()) / 60000),
      );
      await tx.breakLog.update({
        where: { id: openBreak.id },
        data: { breakEnd: now, durationMinutes },
      });
    }
    const breaks = await tx.breakLog.findMany({ where: { timeEntryId: entry.id } });
    return tx.timeEntry.update({
      where: { id: entry.id },
      data: {
        clockOut: now,
        status: "COMPLETED",
        totalMinutes: closedMinutes(entry.clockIn, now, breaks),
      },
    });
  });
}

export async function registerPinFailure(userId: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { failedPinAttempts: { increment: 1 } },
  });
  if (user.failedPinAttempts >= USER_PIN_LOCK_ATTEMPTS) {
    await prisma.user.update({
      where: { id: userId },
      data: { pinLockedUntil: new Date(Date.now() + USER_PIN_LOCK_MS) },
    });
  }
}

export async function clearPinFailures(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { failedPinAttempts: 0, pinLockedUntil: null },
  });
}

export function overtimeMinutes(workedMinutes: number, dailyHours = OVERTIME_DAILY_HOURS) {
  return Math.max(0, workedMinutes - dailyHours * 60);
}

export { Prisma };
