import Link from "next/link";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Leaf } from "lucide-react";

const links = [
  { href: "/admin", label: "Live board" },
  { href: "/admin/employees", label: "People" },
  { href: "/admin/timesheets", label: "Timesheets" },
  { href: "/admin/reports", label: "Reports" },
];

export function AdminNav({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2 font-semibold text-emerald-800">
          <Leaf className="h-5 w-5" />
          Harvest Clock
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-950"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-stone-500 sm:inline">{email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
