"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Live" },
  { href: "/admin/floor-plan", label: "Floor plan" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/leave", label: "Leave" },
  { href: "/admin/users", label: "Roles" },
  { href: "/admin/employees", label: "People" },
  { href: "/admin/timesheets", label: "Timesheets" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/notifications", label: "Audit" },
  { href: "/me", label: "Hours" },
];

export function AdminNav({
  email,
  unreadAudits = 0,
  signOutAction,
}: {
  email: string;
  unreadAudits?: number;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2 font-semibold text-emerald-800">
          <Leaf className="h-5 w-5" />
          Harvest Clock
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium",
                pathname === l.href
                  ? "bg-emerald-50 text-emerald-900"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-950",
              )}
            >
              {l.label}
              {l.href === "/admin/notifications" && unreadAudits > 0 && (
                <Badge tone="rose">{unreadAudits}</Badge>
              )}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-stone-500 sm:inline">{email}</span>
          <form action={signOutAction}>
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((v) => !v)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
      {open && (
        <nav className="grid gap-1 border-t border-stone-200 px-4 py-3 lg:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
            >
              {l.label}
              {l.href === "/admin/notifications" && unreadAudits > 0 && (
                <Badge tone="rose">{unreadAudits}</Badge>
              )}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
