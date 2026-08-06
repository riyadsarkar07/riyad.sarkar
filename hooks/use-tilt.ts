"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 3D tilt effect for cards. Returns ref + style transform.
 * Respects reduced motion.
 */
export function useTilt(maxTilt = 10) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(
    "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
  );

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const rotateY = (x - 0.5) * maxTilt;
      const rotateX = (0.5 - y) * maxTilt;

      setTransform(
        `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(
          2,
        )}deg) scale3d(1.02, 1.02, 1.02)`,
      );
    },
    [maxTilt],
  );

  const onMouseLeave = useCallback(() => {
    setTransform("perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("mousemove", onMouseMove, { passive: true });
    el.addEventListener("mouseleave", onMouseLeave);
    return () => {
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [onMouseMove, onMouseLeave]);

  return { ref, transform };
}
