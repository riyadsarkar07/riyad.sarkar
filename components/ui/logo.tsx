"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Animated shield logo mark. */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <motion.div
      className={cn("relative flex shrink-0 items-center justify-center", className)}
      style={className ? undefined : { width: size, height: size }}
      whileHover={{ rotate: -6, scale: 1.06 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
      aria-hidden
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 shadow-glow" />
      <svg
        viewBox="0 0 24 24"
        className="relative h-[58%] w-[58%] text-white"
        fill="none"
      >
        <path
          d="M12 2l8 3v6c0 5.5-3.5 9.5-8 11-4.5-1.5-8-5.5-8-11V5l8-3z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9 12l2 2 4-4.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}
