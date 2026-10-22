"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  hue: number;
  alpha: number;
}

/**
 * Lightweight canvas particle field with faint connecting lines.
 * Pauses off-screen, when the tab is hidden, and under
 * prefers-reduced-motion. No mouse tracking.
 */
export function ParticleBackground({ density = 28 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let running = true;
    let inView = true;
    let last = 0;
    let linkDistance = 110;

    const hueRange = [199, 210, 222];

    const init = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const isMobile = width < 768;
      const cap = isMobile ? Math.min(density, 16) : density;
      const count = Math.min(Math.floor((width * height) / 22000), cap);
      linkDistance = isMobile ? 80 : 110;
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.6,
        speedX: (Math.random() - 0.5) * 0.22,
        speedY: (Math.random() - 0.5) * 0.22,
        hue: hueRange[Math.floor(Math.random() * hueRange.length)],
        alpha: Math.random() * 0.38 + 0.18,
      }));
    };

    const draw = (now: number) => {
      if (!running || !inView) return;
      if (now - last < 33) {
        raf = requestAnimationFrame(draw);
        return;
      }
      last = now;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 60%, ${p.alpha})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = dx * dx + dy * dy;
          const max = linkDistance * linkDistance;
          if (dist < max) {
            const opacity = (1 - dist / max) * 0.18;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${opacity})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      running = document.visibilityState === "visible";
      if (running && inView && !raf) raf = requestAnimationFrame(draw);
      else if (!running) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView && running && !raf) raf = requestAnimationFrame(draw);
        else if (!inView) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(canvas);

    init();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", init);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("resize", init);
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
