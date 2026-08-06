"use client";

import { useEffect, useRef, useState } from "react";
import { useFinePointer } from "@/hooks/use-media-query";

const TRAIL_COUNT = 4;

/**
 * Premium custom cursor — a small glowing dot, a smooth follower
 * ring that expands over interactive elements, plus a subtle
 * multi-point trail. Only activates on fine pointers (desktop).
 */
export function CustomCursor() {
  const finePointer = useFinePointer();
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (!finePointer) return;

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...pos };
    const trail: { x: number; y: number }[] = Array.from({ length: TRAIL_COUNT }, () => ({
      ...pos,
    }));
    let raf = 0;

    document.documentElement.classList.add("custom-cursor-active");

    const onMove = (e: MouseEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      const target = e.target as HTMLElement;
      setHovering(
        !!target.closest("a, button, [role='button'], input, textarea, select, label, [data-cursor]"),
      );
    };

    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);

    const loop = () => {
      ringPos.x += (pos.x - ringPos.x) * 0.16;
      ringPos.y += (pos.y - ringPos.y) * 0.16;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%)`;
      }

      let prev = { x: pos.x, y: pos.y };
      for (let i = 0; i < TRAIL_COUNT; i++) {
        const point = trail[i];
        point.x += (prev.x - point.x) * 0.35;
        point.y += (prev.y - point.y) * 0.35;
        const el = trailRefs.current[i];
        if (el) {
          el.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
          el.style.opacity = String((TRAIL_COUNT - i) * 0.16);
        }
        prev = { ...point };
      }

      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("custom-cursor-active");
    };
  }, [finePointer]);

  if (!finePointer) return null;

  const ringScale = pressed ? 0.6 : hovering ? 1.8 : 1;

  return (
    <div className="pointer-events-none fixed inset-0 z-[150]" aria-hidden>
      {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
          className="fixed left-0 top-0 h-1.5 w-1.5 rounded-full bg-sky-400/80 will-change-transform"
          style={{ position: "fixed", opacity: 0 }}
        />
      ))}
      <div
        ref={dotRef}
        className="fixed left-0 top-0 h-2 w-2 rounded-full bg-primary shadow-glow"
        style={{ position: "fixed" }}
      />
      <div
        ref={ringRef}
        className="fixed left-0 top-0 h-9 w-9 rounded-full border border-primary/50 bg-primary/10 backdrop-blur-[1px]"
        style={{
          position: "fixed",
          transform: `scale(${ringScale})`,
          transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), background 0.25s ease",
        }}
      />
    </div>
  );
}
