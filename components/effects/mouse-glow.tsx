"use client";

import { useEffect, useRef } from "react";
import { useFinePointer } from "@/hooks/use-media-query";

/**
 * A soft radial glow that smoothly follows the cursor across the
 * whole page (rAF lerp for a buttery 60fps spotlight).
 */
export function MouseGlow() {
  const finePointer = useFinePointer();
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!finePointer) return;
    const el = glowRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { ...target };
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
    };

    const loop = () => {
      pos.x += (target.x - pos.x) * 0.12;
      pos.y += (target.y - pos.y) * 0.12;
      el.style.transform = `translate3d(${pos.x - 250}px, ${pos.y - 250}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [finePointer]);

  if (!finePointer) return null;

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed left-0 top-0 z-0 h-[500px] w-[500px] rounded-full opacity-60 will-change-transform"
      style={{
        background:
          "radial-gradient(circle, rgba(56,189,248,0.16) 0%, rgba(37,99,235,0.07) 35%, transparent 70%)",
      }}
      aria-hidden
    />
  );
}
