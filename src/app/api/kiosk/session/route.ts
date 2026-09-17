import { NextResponse } from "next/server";
import { clearKioskCookie, readKioskToken } from "@/lib/kiosk-session";
import { getKioskSnapshot } from "@/lib/time-engine";

export async function GET() {
  const session = await readKioskToken();
  if (!session) {
    return NextResponse.json({ error: "No kiosk session." }, { status: 401 });
  }
  const snapshot = await getKioskSnapshot(session.sub);
  return NextResponse.json({ snapshot });
}

export async function DELETE() {
  await clearKioskCookie();
  return NextResponse.json({ ok: true });
}
