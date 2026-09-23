import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getKioskSnapshot, startOfLocalWeek } from "@/lib/time-engine";
import { minutesToHoursLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionForm } from "@/components/action-form";
import { LeaveRequestForm } from "@/components/leave-request-form";
import { markBroadcastRead, requestShiftSwap } from "@/app/me/actions";

export default async function MePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const snapshot = await getKioskSnapshot(session.user.id);
  const from = startOfLocalWeek();
  const [entries, leaves, myShifts, otherShifts, alerts] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { userId: session.user.id, clockIn: { gte: from } },
      include: { breaks: true },
      orderBy: { clockIn: "desc" },
    }),
    prisma.leaveRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.shiftAssignment.findMany({
      where: { userId: session.user.id, startsAt: { gte: from } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.shiftAssignment.findMany({
      where: { user: { role: "EMPLOYEE" }, userId: { not: session.user.id }, startsAt: { gte: from } },
      include: { user: true },
      orderBy: { startsAt: "asc" },
      take: 40,
    }),
    prisma.floorBroadcastReceipt.findMany({
      where: { userId: session.user.id, readAt: null, broadcast: { expiresAt: { gt: new Date() } } },
      include: { broadcast: { include: { manager: { select: { name: true } } } } },
    }),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-emerald-800">My hours</p>
          <h1 className="text-3xl font-semibold">{session.user.name}</h1>
          <p className="text-sm text-stone-500">You can only see your own records.</p>
        </div>
        <div className="flex gap-2">
          {session.user.role === "ADMIN" && (
            <Button asChild variant="outline">
              <Link href="/admin">Admin</Link>
            </Button>
          )}
          {session.user.role === "MANAGER" && (
            <Button asChild variant="outline">
              <Link href="/manager/dashboard">Manager hub</Link>
            </Button>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="outline" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>

      {alerts.map((a) => (
        <div key={a.id} className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase text-amber-800">
            Floor request · {a.broadcast.manager.name}
          </p>
          <p className="font-medium">{a.broadcast.message}</p>
          <form
            className="mt-2"
            action={async () => {
              "use server";
              await markBroadcastRead(a.broadcastId);
            }}
          >
            <Button size="sm" variant="outline" type="submit">
              Dismiss
            </Button>
          </form>
        </div>
      ))}

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Today</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {minutesToHoursLabel(snapshot.todayMinutes)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Week</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {minutesToHoursLabel(snapshot.weekMinutes)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Month</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {minutesToHoursLabel(snapshot.monthMinutes)}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>This week</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.length === 0 && <p className="text-sm text-stone-500">No punches yet this week.</p>}
          {entries.map((e) => (
            <div key={e.id} className="rounded-xl bg-stone-50 p-3 text-sm">
              <p className="font-medium">
                {e.clockIn.toLocaleString()} → {e.clockOut ? e.clockOut.toLocaleString() : "in progress"}
              </p>
              <p className="text-stone-600">
                Worked {e.totalMinutes != null ? minutesToHoursLabel(e.totalMinutes) : "open"} · breaks{" "}
                {minutesToHoursLabel(e.breaks.reduce((s, b) => s + (b.durationMinutes ?? 0), 0))}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {session.user.role === "EMPLOYEE" && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Request leave</CardTitle>
            </CardHeader>
            <CardContent>
              <LeaveRequestForm leaves={leaves} heading="Your manager reviews holiday and sick leave." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shift swap</CardTitle>
            </CardHeader>
            <CardContent>
              {myShifts.length === 0 || otherShifts.length === 0 ? (
                <p className="text-sm text-stone-500">Swaps appear once managers publish shifts for two people.</p>
              ) : (
                <ActionForm action={requestShiftSwap} success="Swap requested" className="grid gap-3">
                  <div className="space-y-1">
                    <Label>My shift</Label>
                    <select name="requesterShiftId" required className="h-11 w-full rounded-xl border px-3 text-sm">
                      {myShifts.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.startsAt.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Swap with</Label>
                    <select name="counterpartShiftId" required className="h-11 w-full rounded-xl border px-3 text-sm">
                      {otherShifts.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.user.name} · {s.startsAt.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit">Request swap</Button>
                </ActionForm>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
