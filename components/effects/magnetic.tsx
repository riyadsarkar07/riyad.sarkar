"use client";

import { useCallback, useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { cn, prefersReducedMotion } from "@/lib/utils";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
}

/**
 * Subtle magnetic hover. Direct DOM transforms, no React re-renders,
 * fine-pointer only, and immediately reset on leave.
 */
export function Magnetic({ children, className, strength = 0.28 }: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const enabled = useRef(false);

  useEffect(() => {
    enabled.current =
      !prefersReducedMotion() && window.matchMedia("(pointer: fine)").matches;
    return () => cancelAnimationFrame(frame.current);
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el || !enabled.current) return;
      const rect = el.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const tx = dx * strength;
      const ty = dy * strength;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`;
      });
    },
    [strength],
  );

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.transform = "translate3d(0, 0, 0)";
  }, []);

  return (
    <div
      ref={ref}
      className={cn("inline-block will-change-transform", className)}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </div>
  );
}
