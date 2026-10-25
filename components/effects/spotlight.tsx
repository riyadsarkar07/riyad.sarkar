"use client";

import { useCallback, useRef, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SpotlightProps {
  children: ReactNode;
  className?: string;
  size?: number;
}

/**
 * Interactive radial spotlight that follows the pointer inside a card.
 */
export function Spotlight({ children, className, size = 320 }: SpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  }, []);

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      className={cn("spotlight-card", className)}
      style={{ ["--spot-size" as string]: `${size}px` }}
    >
      {children}
    </div>
  );
}
