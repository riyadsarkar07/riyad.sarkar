"use client";

import { useEffect, useState } from "react";

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

/**
 * Lightweight global click ripple. Spawns a soft expanding ring at
 * every pointer-down point and fades it out. Desktop + touch safe,
 * respects reduced motion and keeps only the most recent ripples.
 */
export function ClickRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onPointerDown = (e: PointerEvent) => {
      const size = Math.max(
        (e.target as HTMLElement)?.getBoundingClientRect?.().width ?? 0,
        (e.target as HTMLElement)?.getBoundingClientRect?.().height ?? 0,
        96,
      );
      const id = Date.now() + Math.random();
      const ripple: Ripple = {
        id,
        x: e.clientX,
        y: e.clientY,
        size: Math.min(Math.max(size * 1.2, 96), 260),
      };
      setRipples((prev) => [...prev.slice(-5), ripple]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 750);
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  if (ripples.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[210] overflow-hidden" aria-hidden>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full border border-cyan-400/40 bg-cyan-400/15 animate-ripple"
          style={{
            left: r.x - r.size / 2,
            top: r.y - r.size / 2,
            width: r.size,
            height: r.size,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}
