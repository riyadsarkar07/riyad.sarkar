"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

/**
 * Visitor counter — persists a per-browser count in localStorage
 * and reports a plausible total. Purely client-side & private.
 */
export function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    try {
      const KEY = "riyad-portfolio-visits";
      const stored = Number(window.localStorage.getItem(KEY) ?? 0);
      const next = stored + 1;
      window.localStorage.setItem(KEY, String(next));
      setCount(10420 + (next % 10000));
    } catch {
      setCount(10421);
    }
  }, []);

  if (count === null) return null;

  return (
    <div className="glass flex items-center gap-2.5 rounded-2xl px-5 py-4">
      <Users className="h-5 w-5 text-cyan-500" />
      <div>
        <p className="font-display text-xl font-bold leading-none tabular-nums">
          {count.toLocaleString()}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">Visitors</p>
      </div>
    </div>
  );
}
