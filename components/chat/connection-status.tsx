"use client";

import { Radio, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** Connectivity is not the same as message persistence: reads still resync. */
export function ChatConnectionStatus({
  connected,
  className,
}: {
  connected: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        connected
          ? "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300"
          : "border-amber-500/25 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {connected ? <Radio className="h-3 w-3" aria-hidden="true" /> : <WifiOff className="h-3 w-3" aria-hidden="true" />}
      {connected ? "Live" : "Reconnecting · auto-refresh"}
    </span>
  );
}
