"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

/**
 * Animates a number from 0 to `target` once it scrolls into view.
 * Snaps to the final value when the animation completes, unmounts, or
 * when the user prefers reduced motion.
 */
export function useCountUp(target: number, duration = 2000, decimals = 0) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(target);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;

    if (reduceMotion) {
      setValue(target);
      return;
    }

    let frame = 0;
    let start: number | null = null;
    setValue(0);

    const tick = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      if (progress >= 1) {
        setValue(target);
        return;
      }
      const eased = 1 - Math.pow(2, -10 * progress);
      setValue(Number((target * eased).toFixed(decimals)));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      setValue(target);
    };
  }, [inView, target, duration, decimals, reduceMotion]);

  return { ref, value };
}
