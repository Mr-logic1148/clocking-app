import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPin, isValidPinFormat } from "@/lib/pin";
import {
  assertPinRateLimit,
  RateLimitError,
  recordPinFailure,
  recordPinSuccess,
} from "@/lib/rate-limit";
import { setKioskCookie, signKioskToken } from "@/lib/kiosk-session";
import { clearPinFailures, getKioskSnapshot, registerPinFailure } from "@/lib/time-engine";

const bodySchema = z.object({ pin: z.string() });

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  try {
    await assertPinRateLimit(ip);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: err.message, retryAfterMs: err.retryAfterMs },
        { status: 429 },
      );
    }
    throw err;
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isValidPinFormat(parsed.data.pin)) {
    await recordPinFailure(ip);
    return NextResponse.json({ error: "Invalid PIN." }, { status: 400 });
  }

  const pinHash = hashPin(parsed.data.pin);
  const user = await prisma.user.findUnique({ where: { pinHash } });

  if (!user || !user.isActive) {
    await recordPinFailure(ip);
    return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
  }

  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    return NextResponse.json(
      { error: "PIN locked after too many attempts. Ask an admin to reset it." },
      { status: 423 },
    );
  }

  if (!user.pinHash) {
    await recordPinFailure(ip);
    await registerPinFailure(user.id);
    return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
  }

  await recordPinSuccess(ip);
  await clearPinFailures(user.id);

  const token = await signKioskToken({
    sub: user.id,
    name: user.name,
    role: user.role,
  });
  await setKioskCookie(token);

  const snapshot = await getKioskSnapshot(user.id);
  return NextResponse.json({ ok: true, snapshot });
}
