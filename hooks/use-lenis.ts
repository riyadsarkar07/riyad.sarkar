"use client";

import { getLenis } from "@/components/layout/smooth-scroll";

/**
 * Returns the shared Lenis instance (may be null).
 * Use `scrollToSection` for a guaranteed fallback.
 */
export function useLenis() {
  return { lenis: getLenis() };
}
