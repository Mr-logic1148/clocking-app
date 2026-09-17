"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Row = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK";
  since: string | null;
};

const tone = {
  CLOCKED_IN: "green",
  ON_BREAK: "amber",
  CLOCKED_OUT: "neutral",
} as const;

export function LiveBoard() {
  const [board, setBoard] = useState<Row[]>([]);
  const [at, setAt] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/admin/live", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled) {
        setBoard(data.board);
        setAt(data.generatedAt);
      }
    }
    void load();
    const id = setInterval(() => void load(), 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const groups = {
    CLOCKED_IN: board.filter((b) => b.status === "CLOCKED_IN"),
    ON_BREAK: board.filter((b) => b.status === "ON_BREAK"),
    CLOCKED_OUT: board.filter((b) => b.status === "CLOCKED_OUT"),
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {(
        [
          ["Clocked in", "CLOCKED_IN"],
          ["On break", "ON_BREAK"],
          ["Clocked out", "CLOCKED_OUT"],
        ] as const
      ).map(([title, key]) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {title}
              <Badge tone={tone[key]}>{groups[key].length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groups[key].length === 0 && (
              <p className="text-sm text-stone-500">Nobody in this state.</p>
            )}
            {groups[key].map((row) => (
              <div key={row.id} className="rounded-xl bg-stone-50 p-3">
                <p className="font-medium">{row.name}</p>
                <p className="text-xs text-stone-500">{row.email}</p>
                {row.since && (
                  <p className="mt-1 text-xs text-stone-600">
                    Since {new Date(row.since).toLocaleTimeString()}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      {at && (
        <p className="md:col-span-3 text-xs text-stone-500">
          Live · refreshed {new Date(at).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
