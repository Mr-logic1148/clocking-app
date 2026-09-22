import Link from "next/link";
import { Clock3, Leaf, MonitorSmartphone, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfdf5,_#f6f3ee_42%)]">
      <div className="mx-auto flex max-w-6xl flex-col px-6 py-10">
        <header className="mb-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800">
            <Leaf className="h-6 w-6" />
            <span className="text-sm font-semibold tracking-[0.18em] uppercase">Harvest Clock</span>
          </div>
          <Button asChild variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </header>

        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
          Packhouses · farms · DCs
        </p>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-stone-950 md:text-6xl">
          Clock in once. See the floor in real time.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-stone-600">
          Shared tablet kiosk with PIN access, automatic break handling, and an admin live board
          inspired by Clockify and Jibble — built for produce operations.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/kiosk">
              <MonitorSmartphone className="h-4 w-4" />
              Open kiosk
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">
              <Shield className="h-4 w-4" />
              Admin / manager / employee login
            </Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Clock3,
              title: "Kiosk in 2 taps",
              copy: "Large PIN pad, then only the actions that match the current status.",
            },
            {
              icon: Users,
              title: "Live attendance",
              copy: "See who is clocked in, on break, or off shift without a spreadsheet.",
            },
            {
              icon: Shield,
              title: "Private hours",
              copy: "Employees only ever see their own day, week, and month totals.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-sm">
              <item.icon className="h-5 w-5 text-emerald-700" />
              <h2 className="mt-3 font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm text-stone-600">{item.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
