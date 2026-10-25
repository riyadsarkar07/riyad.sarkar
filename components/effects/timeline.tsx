"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import { duration, easeOutExpo, viewportOnce } from "@/lib/motion";

/**
 * Scroll-filled vertical spine for career timelines.
 */
export function TimelineTrack({
  children,
  className,
  align = "inset",
}: {
  children: ReactNode;
  className?: string;
  align?: "inset" | "edge";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.78", "end 0.35"],
  });
  const scaleY = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.35 });
  const lineClass =
    align === "edge"
      ? "absolute left-0 top-0 h-full w-px -translate-x-1/2 sm:left-1/2"
      : "absolute left-6 top-0 h-full w-px -translate-x-1/2 md:left-1/2";

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className={cn(lineClass, "bg-gradient-to-b from-blue-500/25 via-cyan-400/18 to-transparent")} />
      <motion.div
        className={cn(lineClass, "origin-top bg-gradient-to-b from-primary via-sky-500/80 to-cyan-400/40")}
        style={{ scaleY }}
      />
      {children}
    </div>
  );
}

export function TimelineItem({
  children,
  className,
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  index?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{
        duration: reduceMotion ? 0 : duration.slow,
        delay: reduceMotion ? 0 : Math.min(index * 0.06, 0.24),
        ease: easeOutExpo,
      }}
    >
      {children}
    </motion.div>
  );
}

export function TimelineNode({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <span className={cn("relative flex items-center justify-center", className)}>
      <span className="absolute -inset-1 rounded-full bg-cyan-400/30 motion-reduce:animate-none animate-pulse-ring" />
      {children ?? (
        <motion.span
          className="relative block h-3.5 w-3.5 rounded-full bg-primary"
          initial={reduceMotion ? { scale: 1 } : { scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={viewportOnce}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
        />
      )}
    </span>
  );
}
