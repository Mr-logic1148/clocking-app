import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getKioskSnapshot, startOfLocalWeek } from "@/lib/time-engine";
import { minutesToHoursLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const snapshot = await getKioskSnapshot(session.user.id);
  const from = startOfLocalWeek();
  const entries = await prisma.timeEntry.findMany({
    where: { userId: session.user.id, clockIn: { gte: from } },
    include: { breaks: true },
    orderBy: { clockIn: "desc" },
  });

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

      <Card>
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
    </main>
  );
}
