import Link from "next/link";
import { Leaf, MonitorSmartphone, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <div className="mb-10 flex items-center gap-2 text-emerald-800">
        <Leaf className="h-7 w-7" />
        <p className="text-sm font-semibold uppercase tracking-[0.2em]">Produce operations</p>
      </div>
      <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-stone-950">
        Harvest Clock
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-stone-600">
        Shared-floor kiosk for clock-in, breaks, and clock-out. Admin live board, timesheets, and
        hours reporting for packhouses, farms, and DCs.
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
            Admin / employee login
          </Link>
        </Button>
      </div>
    </main>
  );
}
