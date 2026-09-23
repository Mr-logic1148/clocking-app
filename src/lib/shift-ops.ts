import { prisma } from "@/lib/prisma";
import { combineLocalDateAndTime, eachLocalDate, jsWeekday, shiftsOverlap } from "@/lib/shifts";

export async function findOverlappingShift(userId: string, startsAt: Date, endsAt: Date, ignoreId?: string) {
  const nearby = await prisma.shiftAssignment.findMany({
    where: {
      userId,
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    take: 1,
  });
  return nearby[0] ?? null;
}

export async function createBulkShifts(input: {
  userIds: string[];
  rangeStart: Date;
  rangeEnd: Date;
  weekdays: number[];
  startTime: string;
  endTime: string;
  station: string | null;
  createdById: string;
  isRecurring: boolean;
}) {
  if (input.userIds.length === 0) throw new Error("Select at least one employee.");
  if (input.weekdays.length === 0) throw new Error("Select at least one weekday.");
  const days = eachLocalDate(input.rangeStart, input.rangeEnd).filter((d) =>
    input.weekdays.includes(jsWeekday(d)),
  );
  if (days.length === 0) throw new Error("That range has no matching weekdays.");

  const created: string[] = [];
  const skipped: string[] = [];

  for (const userId of input.userIds) {
    for (const day of days) {
      const startsAt = combineLocalDateAndTime(day, input.startTime);
      const endsAt = combineLocalDateAndTime(day, input.endTime);
      if (endsAt <= startsAt) throw new Error("End time must be after start time.");
      const clash = await findOverlappingShift(userId, startsAt, endsAt);
      if (clash) {
        skipped.push(userId);
        continue;
      }
      const row = await prisma.shiftAssignment.create({
        data: {
          userId,
          startsAt,
          endsAt,
          station: input.station,
          label: input.station,
          isRecurring: input.isRecurring,
          createdById: input.createdById,
        },
      });
      created.push(row.id);
    }
  }

  return { created: created.length, skipped: skipped.length };
}

export async function addSingleShift(input: {
  userId: string;
  startsAt: Date;
  endsAt: Date;
  station: string | null;
  createdById: string;
}) {
  if (input.endsAt <= input.startsAt) throw new Error("End time must be after start time.");
  const clash = await findOverlappingShift(input.userId, input.startsAt, input.endsAt);
  if (clash) throw new Error("That person already has an overlapping shift.");
  return prisma.shiftAssignment.create({
    data: {
      userId: input.userId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      station: input.station,
      label: input.station,
      createdById: input.createdById,
    },
  });
}

export async function swapShiftWorkers(shiftAId: string, shiftBId: string) {
  if (shiftAId === shiftBId) throw new Error("Pick two different shifts.");
  const [a, b] = await Promise.all([
    prisma.shiftAssignment.findUnique({ where: { id: shiftAId } }),
    prisma.shiftAssignment.findUnique({ where: { id: shiftBId } }),
  ]);
  if (!a || !b) throw new Error("Shift not found.");

  const aClash = await findOverlappingShift(b.userId, a.startsAt, a.endsAt, a.id);
  const bClash = await findOverlappingShift(a.userId, b.startsAt, b.endsAt, b.id);
  if (aClash || bClash) throw new Error("Swap would create overlapping shifts.");

  await prisma.$transaction([
    prisma.shiftAssignment.update({ where: { id: a.id }, data: { userId: b.userId } }),
    prisma.shiftAssignment.update({ where: { id: b.id }, data: { userId: a.userId } }),
  ]);
  return { aUserId: a.userId, bUserId: b.userId };
}

export async function removeShift(id: string) {
  return prisma.shiftAssignment.delete({ where: { id } });
}

export { shiftsOverlap };
