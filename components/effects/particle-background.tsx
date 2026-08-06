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
 * Canvas-based cyber particle field with subtle connecting lines.
 * Pauses when the tab is hidden and respects reduced motion.
 */
export function ParticleBackground({ density = 60 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let rectLeft = 0;
    let rectTop = 0;
    let raf = 0;
    let running = true;

    const hueRange = [199, 210, 222];

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const mouse = { x: -9999, y: -9999, active: false };

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const init = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      rectLeft = rect.left;
      rectTop = rect.top;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(Math.floor((width * height) / 14000), density);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.6,
        speedX: (Math.random() - 0.5) * 0.35,
        speedY: (Math.random() - 0.5) * 0.35,
        hue: hueRange[Math.floor(Math.random() * hueRange.length)],
        alpha: Math.random() * 0.5 + 0.2,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.speedX;
        p.y += p.speedY;

        if (finePointer && mouse.active) {
          const mdx = p.x - (mouse.x - rectLeft);
          const mdy = p.y - (mouse.y - rectTop);
          const dist = Math.sqrt(mdx * mdx + mdy * mdy);
          const radius = 110;
          if (dist < radius && dist > 0.01) {
            const force = ((radius - dist) / radius) * 0.55;
            p.x += (mdx / dist) * force;
            p.y += (mdy / dist) * force;
          }
        }

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 60%, ${p.alpha})`;
        ctx.fill();
      }

      const linkDistance = 120;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDistance) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `hsla(199, 89%, 60%, ${(1 - dist / linkDistance) * 0.12})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      if (running) raf = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      running = document.visibilityState === "visible";
      if (running && !raf) raf = requestAnimationFrame(draw);
      else if (!running) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    init();
    draw();
    window.addEventListener("resize", init);
    window.addEventListener("scroll", init, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("resize", init);
      window.removeEventListener("scroll", init);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("visibilitychange", onVisibility);
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
