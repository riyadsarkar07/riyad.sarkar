"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { duration, easeOutExpo } from "@/lib/motion";

/**
 * Soft page enter used by the App Router template.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : duration.slow, ease: easeOutExpo }}
    >
      {children}
    </motion.div>
  );
}
