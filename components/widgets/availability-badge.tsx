"use client";

import { useReducedMotion } from "framer-motion";
import { availability } from "@/data/content";
import { cn } from "@/lib/utils";

export function AvailabilityBadge({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const isAvailable = availability.status === "available";
  const label = isAvailable ? availability.availableLabel : availability.unavailableLabel;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-semibold",
        isAvailable
          ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300"
          : "border-amber-400/40 bg-amber-400/10 text-amber-800 dark:text-amber-300",
        compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs sm:px-3.5 sm:py-2 sm:text-sm",
        className,
      )}
    >
      <span className={cn("relative flex", compact ? "h-1.5 w-1.5" : "h-2 w-2 sm:h-2.5 sm:w-2.5")}>
        {!reduceMotion && isAvailable && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex rounded-full",
            compact ? "h-1.5 w-1.5" : "h-2 w-2 sm:h-2.5 sm:w-2.5",
            isAvailable ? "bg-emerald-500" : "bg-amber-500",
          )}
        />
      </span>
      {label}
    </div>
  );
}
