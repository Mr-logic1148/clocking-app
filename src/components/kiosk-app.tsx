"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Delete, Leaf } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KIOSK_IDLE_MS, minutesToHoursLabel } from "@/lib/utils";
import type { KioskSnapshot } from "@/lib/time-engine";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];

export function KioskApp() {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [snapshot, setSnapshot] = useState<KioskSnapshot | null>(null);
  const [remaining, setRemaining] = useState(KIOSK_IDLE_MS);
  const timer = useRef<number | null>(null);

  const logout = useCallback(async (silent = false) => {
    setSnapshot(null);
    setPin("");
    setRemaining(KIOSK_IDLE_MS);
    await fetch("/api/kiosk/session", { method: "DELETE" });
    if (!silent) toast.message("Returned to kiosk lock screen");
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    const started = Date.now();
    timer.current = window.setInterval(() => {
      const left = KIOSK_IDLE_MS - (Date.now() - started);
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        void logout(true);
      }
    }, 100);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [snapshot, logout]);

  async function submitPin(value: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/kiosk/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "PIN rejected");
        setPin("");
        return;
      }
      setSnapshot(data.snapshot);
      setPin("");
    } catch {
      toast.error("Kiosk is offline");
    } finally {
      setBusy(false);
    }
  }

  function onKey(key: string) {
    if (busy || snapshot) return;
    if (key === "C") {
      setPin("");
      return;
    }
    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    const next = (pin + key).slice(0, 6);
    setPin(next);
    if (next.length >= 4) {
      // auto-submit at 4+ if they hit 6, or wait for 4-6; submit at 6 automatically
    }
    if (next.length === 6) void submitPin(next);
  }

  async function runAction(action: "CLOCK_IN" | "CLOCK_OUT" | "START_BREAK" | "END_BREAK") {
    setBusy(true);
    try {
      const res = await fetch("/api/kiosk/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update status");
        return;
      }
      toast.success("Saved");
      await logout(true);
    } catch {
      toast.error("Kiosk is offline");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-emerald-950 via-stone-950 to-stone-900 text-white">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-8">
        <div className="mb-8 flex items-center gap-2 text-emerald-200">
          <Leaf className="h-6 w-6" />
          <p className="text-sm font-semibold tracking-wide uppercase">Harvest Clock · Kiosk</p>
        </div>
        <AnimatePresence mode="wait">
          {!snapshot ? (
            <motion.div
              key="pin"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-1 flex-col"
            >
              <h1 className="text-4xl font-semibold tracking-tight">Enter PIN</h1>
              <p className="mt-2 text-stone-300">4–6 digits. Only your own hours are shown after sign-in.</p>
              <div className="mt-8 flex justify-center gap-3">
                {Array.from({ length: Math.max(4, pin.length || 4) }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-4 w-4 rounded-full ${i < pin.length ? "bg-emerald-400" : "bg-white/20"}`}
                  />
                ))}
              </div>
              <div className="mt-10 grid grid-cols-3 gap-3">
                {KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onKey(key)}
                    className="flex h-20 items-center justify-center rounded-2xl bg-white/10 text-3xl font-semibold hover:bg-white/20 active:scale-95"
                  >
                    {key === "⌫" ? <Delete className="h-8 w-8" /> : key}
                  </button>
                ))}
              </div>
              <Button
                className="mt-6 h-14 text-lg"
                disabled={busy || pin.length < 4}
                onClick={() => void submitPin(pin)}
              >
                {busy ? "Checking…" : "Continue"}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="dash"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-1 flex-col"
            >
              <p className="text-sm text-emerald-200">Welcome back</p>
              <h1 className="text-4xl font-semibold">{snapshot.name}</h1>
              <p className="mt-2 text-stone-300">
                Status:{" "}
                <span className="font-semibold text-white">
                  {snapshot.status.replace("_", " ")}
                </span>
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                {[
                  ["Today", snapshot.todayMinutes],
                  ["This week", snapshot.weekMinutes],
                  ["This month", snapshot.monthMinutes],
                ].map(([label, mins]) => (
                  <div key={String(label)} className="rounded-2xl bg-white/10 p-3">
                    <p className="text-xs uppercase tracking-wide text-stone-300">{label}</p>
                    <p className="mt-1 text-lg font-semibold">{minutesToHoursLabel(Number(mins))}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3">
                {snapshot.status === "CLOCKED_OUT" && (
                  <Button size="xl" disabled={busy} onClick={() => void runAction("CLOCK_IN")}>
                    Clock In
                  </Button>
                )}
                {snapshot.status === "CLOCKED_IN" && (
                  <>
                    <Button size="xl" variant="amber" disabled={busy} onClick={() => void runAction("START_BREAK")}>
                      Start Break
                    </Button>
                    <Button size="xl" variant="danger" disabled={busy} onClick={() => void runAction("CLOCK_OUT")}>
                      Clock Out
                    </Button>
                  </>
                )}
                {snapshot.status === "ON_BREAK" && (
                  <>
                    <Button size="xl" disabled={busy} onClick={() => void runAction("END_BREAK")}>
                      End Break
                    </Button>
                    <Button size="xl" variant="danger" disabled={busy} onClick={() => void runAction("CLOCK_OUT")}>
                      Clock Out
                    </Button>
                  </>
                )}
              </div>
              <p className="mt-auto pt-8 text-center text-sm text-stone-400">
                Auto-lock in {Math.ceil(remaining / 1000)}s
              </p>
              <Button variant="ghost" className="mt-2 text-stone-300" onClick={() => void logout()}>
                Cancel
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
