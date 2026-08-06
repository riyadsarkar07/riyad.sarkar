"use client";

import { useEffect, useRef } from "react";
import { useMousePosition } from "@/hooks/use-mouse-position";
import { useFinePointer } from "@/hooks/use-media-query";

/**
 * A soft radial glow that follows the cursor across the whole page.
 */
export function MouseGlow() {
  const { x, y } = useMousePosition();
  const finePointer = useFinePointer();
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!finePointer || !glowRef.current) return;
    glowRef.current.style.transform = `translate3d(${x - 250}px, ${y - 250}px, 0)`;
  }, [x, y, finePointer]);

  if (!finePointer) return null;

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed left-0 top-0 z-0 h-[500px] w-[500px] rounded-full opacity-60 transition-transform duration-300 ease-out"
      style={{
        background:
          "radial-gradient(circle, rgba(56,189,248,0.14) 0%, rgba(37,99,235,0.06) 35%, transparent 70%)",
      }}
      aria-hidden
    />
  );
}
