"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { prefersReducedMotion } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Singleton Lenis instance shared across the app                      */
/* ------------------------------------------------------------------ */

let sharedLenis: Lenis | null = null;

export function getLenis(): Lenis | null {
  return sharedLenis;
}

/**
 * Initializes one Lenis smooth-scroll instance for the whole app.
 * Mounted once in the root layout; respects prefers-reduced-motion.
 */
export function SmoothScrollProvider() {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1,
      syncTouch: false,
    });
    sharedLenis = lenis;

    const raf = (time: number) => {
      lenis.raf(time);
      rafRef.current = requestAnimationFrame(raf);
    };
    rafRef.current = requestAnimationFrame(raf);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lenis.destroy();
      sharedLenis = null;
    };
  }, []);

  return null;
}

/**
 * Scroll helper used by nav, buttons and other UI. Falls back to
 * native smooth scrolling when Lenis is unavailable.
 */
export function scrollToSection(target: string, offset = -76): void {
  if (sharedLenis) {
    sharedLenis.scrollTo(target, { offset, duration: 1.2 });
  } else if (typeof document !== "undefined") {
    const id = target.replace("#", "");
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }
}

export function scrollToTop(): void {
  if (sharedLenis) {
    sharedLenis.scrollTo(0, { duration: 1.4 });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
