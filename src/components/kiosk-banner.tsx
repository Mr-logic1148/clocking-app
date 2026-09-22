"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

type Alert = { id: string; message: string; manager: string; expiresAt: string };

export function KioskBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/kiosk/banner", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled) setAlerts(data.alerts ?? []);
    }
    void load();
    const id = setInterval(() => void load(), 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {alerts.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-400 px-4 py-3 text-stone-950"
        >
          <Megaphone className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide">Floor request · {a.manager}</p>
            <p className="font-medium">{a.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
