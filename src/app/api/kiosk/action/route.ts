import { NextResponse } from "next/server";
import { z } from "zod";
import { clearKioskCookie, readKioskToken } from "@/lib/kiosk-session";
import { clockIn, clockOut, endBreak, getKioskSnapshot, startBreak } from "@/lib/time-engine";

const bodySchema = z.object({
  action: z.enum(["CLOCK_IN", "CLOCK_OUT", "START_BREAK", "END_BREAK"]),
});

export async function POST(req: Request) {
  const session = await readKioskToken();
  if (!session) {
    return NextResponse.json({ error: "Kiosk session expired." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  try {
    switch (parsed.data.action) {
      case "CLOCK_IN":
        await clockIn(session.sub);
        break;
      case "START_BREAK":
        await startBreak(session.sub);
        break;
      case "END_BREAK":
        await endBreak(session.sub);
        break;
      case "CLOCK_OUT":
        await clockOut(session.sub);
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const snapshot = await getKioskSnapshot(session.sub);
  await clearKioskCookie();
  return NextResponse.json({ ok: true, snapshot });
}
