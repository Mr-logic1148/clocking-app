import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

export class RateLimitError extends Error {
  retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super("Too many PIN attempts. Try again later.");
    this.retryAfterMs = retryAfterMs;
  }
}

/** Security boundary: persisted per-IP counters to stop kiosk PIN brute force. */
export async function assertPinRateLimit(identifier: string) {
  const now = new Date();
  const record = await prisma.pinRateLimit.upsert({
    where: { identifier },
    create: { identifier, attempts: 0, windowStart: now },
    update: {},
  });

  if (record.lockedUntil && record.lockedUntil > now) {
    throw new RateLimitError(record.lockedUntil.getTime() - now.getTime());
  }

  const windowExpired = now.getTime() - record.windowStart.getTime() > WINDOW_MS;
  if (windowExpired || (record.lockedUntil && record.lockedUntil <= now)) {
    await prisma.pinRateLimit.update({
      where: { identifier },
      data: { attempts: 0, windowStart: now, lockedUntil: null },
    });
  }
}

export async function recordPinFailure(identifier: string) {
  const now = new Date();
  const existing = await prisma.pinRateLimit.findUnique({ where: { identifier } });
  const windowExpired =
    !existing || now.getTime() - existing.windowStart.getTime() > WINDOW_MS;

  if (!existing || windowExpired) {
    await prisma.pinRateLimit.upsert({
      where: { identifier },
      create: { identifier, attempts: 1, windowStart: now, lockedUntil: null },
      update: { attempts: 1, windowStart: now, lockedUntil: null },
    });
    return;
  }

  const fresh = await prisma.pinRateLimit.update({
    where: { identifier },
    data: { attempts: { increment: 1 } },
  });

  if (fresh.attempts >= MAX_ATTEMPTS) {
    await prisma.pinRateLimit.update({
      where: { identifier },
      data: { lockedUntil: new Date(now.getTime() + LOCK_MS) },
    });
  }
}

export async function recordPinSuccess(identifier: string) {
  await prisma.pinRateLimit.deleteMany({ where: { identifier } });
}
