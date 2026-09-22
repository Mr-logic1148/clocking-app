import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always look successful so the kiosk/admin login cannot enumerate accounts.
  if (!user || !user.isActive) {
    return NextResponse.json({ ok: true });
  }

  const raw = randomBytes(32).toString("hex");
  const token = createHash("sha256").update(raw).digest("hex");
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  });

  const origin = new URL(req.url).origin;
  const previewUrl = `${origin}/login/verify?token=${raw}`;

  if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
    console.info(`[magic-link] SMTP configured; deliver this URL to ${email}: ${previewUrl}`);
    return NextResponse.json({ ok: true });
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[magic-link] ${email} → ${previewUrl}`);
    return NextResponse.json({ ok: true, previewUrl });
  }

  return NextResponse.json({ ok: true });
}
