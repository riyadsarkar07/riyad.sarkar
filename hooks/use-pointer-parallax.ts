"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import { prefersReducedMotion } from "@/lib/utils";

/**
 * Mouse parallax via data-depth layers. Direct DOM transforms, no re-renders.
 */
export function usePointerParallax(range = 28) {
  const ref = useRef<HTMLElement | null>(null);
  const frame = useRef(0);
  const enabled = useRef(false);

  useEffect(() => {
    enabled.current =
      !prefersReducedMotion() && window.matchMedia("(pointer: fine)").matches;
    return () => cancelAnimationFrame(frame.current);
  }, []);

  const apply = useCallback(
    (nx: number, ny: number, withTransition: boolean) => {
      const el = ref.current;
      if (!el) return;
      const layers = el.querySelectorAll<HTMLElement>("[data-depth]");
      layers.forEach((layer) => {
        const depth = Number(layer.dataset.depth) || 0;
        layer.style.transition = withTransition
          ? "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)"
          : "transform 0.12s linear";
        layer.style.willChange = "transform";
        layer.style.transform = `translate3d(${(nx * depth * range).toFixed(1)}px, ${(ny * depth * range * 0.72).toFixed(1)}px, 0)`;
      });
    },
    [range],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const el = ref.current;
      if (!el || !enabled.current) return;
      const rect = el.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => apply(nx, ny, false));
    },
    [apply],
  );

  const onPointerLeave = useCallback(() => {
    cancelAnimationFrame(frame.current);
    apply(0, 0, true);
  }, [apply]);

  return { ref, onPointerMove, onPointerLeave };
}
