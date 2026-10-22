"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/utils";

/**
 * Lightweight scroll parallax. One rAF-throttled listener, paused
 * off-screen. Transform-only so it never causes layout.
 */
export function Parallax({
  children,
  className,
  offset = 28,
}: {
  children: ReactNode;
  className?: string;
  offset?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    let inView = false;
    let raf = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (!inView) {
          cancelAnimationFrame(raf);
        }
      },
      { rootMargin: "80px" },
    );
    observer.observe(el);

    const onScroll = () => {
      if (!inView) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const progress = (window.innerHeight * 0.5 - (rect.top + rect.height * 0.5)) / window.innerHeight;
        el.style.transform = `translate3d(0, ${(progress * offset).toFixed(1)}px, 0)`;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [offset]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
