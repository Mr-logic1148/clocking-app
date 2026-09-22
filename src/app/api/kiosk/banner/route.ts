import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const alerts = await prisma.floorBroadcast.findMany({
    where: { expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { manager: { select: { name: true } } },
  });

  return NextResponse.json({
    alerts: alerts.map((a) => ({
      id: a.id,
      message: a.message,
      manager: a.manager.name,
      expiresAt: a.expiresAt.toISOString(),
    })),
  });
}
