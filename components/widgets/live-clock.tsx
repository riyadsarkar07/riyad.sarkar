"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function formatWithTimeZone(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    ...options,
  }).format(date);
}

/** Live Bangladesh (Asia/Dhaka) clock. */
export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div className="glass flex h-full min-h-[88px] items-center gap-3 rounded-[1.2rem] px-5 py-4">
        <Clock className="h-5 w-5 text-cyan-500" />
        <div className="h-8 w-24 animate-pulse rounded bg-primary/10" />
      </div>
    );
  }

  const time = formatWithTimeZone(now, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const date = formatWithTimeZone(now, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="glass hover-lift flex h-full min-h-[88px] items-center gap-3 rounded-[1.2rem] px-5 py-4">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
      <div>
        <p className="font-display text-xl font-bold tabular-nums leading-none text-gradient">
          {time}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">{date} · Dhaka, BD</p>
      </div>
    </div>
  );
}
