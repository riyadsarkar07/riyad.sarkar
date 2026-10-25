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
 * Canvas particle field with faint links and subtle mouse attraction.
 */
export function ParticleBackground({ density = 36 }: { density?: number }) {
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
    let linkDistance = 118;
    const mouse = { x: -9999, y: -9999, active: false };
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
      const cap = isMobile ? Math.min(density, 12) : density;
      const count = Math.min(Math.floor((width * height) / (isMobile ? 28000 : 18000)), cap);
      linkDistance = isMobile ? 68 : 124;
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.7 + 0.55,
        speedX: (Math.random() - 0.5) * 0.24,
        speedY: (Math.random() - 0.5) * 0.24,
        hue: hueRange[Math.floor(Math.random() * hueRange.length)],
        alpha: Math.random() * 0.42 + 0.18,
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
        if (mouse.active) {
          const mx = mouse.x - p.x;
          const my = mouse.y - p.y;
          const md = mx * mx + my * my;
          if (md < 22000) {
            p.x += mx * 0.0009;
            p.y += my * 0.0009;
          }
        }
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
            const opacity = (1 - dist / max) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${opacity})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
      mouse.active = true;
    };
    const onPointerLeave = () => {
      mouse.active = false;
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
    const host = canvas.closest("section") ?? canvas.parentElement;
    host?.addEventListener("pointermove", onPointerMove as EventListener);
    host?.addEventListener("pointerleave", onPointerLeave);

    return () => {
      window.removeEventListener("resize", init);
      document.removeEventListener("visibilitychange", onVisibility);
      host?.removeEventListener("pointermove", onPointerMove as EventListener);
      host?.removeEventListener("pointerleave", onPointerLeave);
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
