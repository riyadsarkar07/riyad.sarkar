"use client";

import { useEffect, useState } from "react";

export interface MousePosition {
  x: number;
  y: number;
}

/** Tracks the cursor position (normalized optionally). */
export function useMousePosition(normalized = false): MousePosition {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      setPosition(
        normalized
          ? {
              x: event.clientX / window.innerWidth,
              y: event.clientY / window.innerHeight,
            }
          : { x: event.clientX, y: event.clientY },
      );
    };
    window.addEventListener("mousemove", handler, { passive: true });
    return () => window.removeEventListener("mousemove", handler);
  }, [normalized]);

  return position;
}
