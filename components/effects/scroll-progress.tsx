"use client";

import { useEffect, useRef } from "react";
import { useScroll } from "framer-motion";

/**
 * Slim gradient progress bar fixed at the top of the viewport.
 */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (v) => {
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${v})`;
      }
    });
    return unsubscribe;
  }, [scrollYProgress]);

  return (
    <div ref={ref} className="fixed inset-x-0 top-0 z-[110] h-[3px]" aria-hidden>
      <div
        ref={barRef}
        className="h-full w-full origin-left bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 shadow-glow"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
