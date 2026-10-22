"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import { prefersReducedMotion } from "@/lib/utils";

/**
 * GPU-friendly 3D tilt. Mutates transform on the node directly so
 * hover never re-renders React. Fine pointers only; skipped on
 * reduced-motion and coarse (touch) devices.
 */
export function useTilt(maxTilt = 10) {
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
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const rx = (0.5 - py) * maxTilt;
      const ry = (px - 0.5) * maxTilt;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        el.style.willChange = "transform";
        el.style.transform = `perspective(920px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
        el.style.setProperty("--tilt-gx", `${px * 100}%`);
        el.style.setProperty("--tilt-gy", `${py * 100}%`);
        el.classList.add("tilt-active");
      });
    },
    [maxTilt],
  );

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.transform = "perspective(920px) rotateX(0deg) rotateY(0deg) translateZ(0)";
    el.style.willChange = "auto";
    el.classList.remove("tilt-active");
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}
