"use client";

import { useEffect } from "react";

const MAX_TILT = 5;
const SCALE = 1.015;
const PX = 1000;
const LERP = 0.18;

interface TiltState {
  tx: number;
  ty: number;
}

/**
 * Global 3D tilt for glass cards. A single delegated pointermove +
 * one rAF loop drives every eligible `.glass` card, so there is no
 * per-card listener or React re-render. Adds a cursor-following glare.
 *
 * Skipped for dialogs, glass-strong panels, coarse pointers and
 * prefers-reduced-motion. Existing tilt wrappers (perspective
 * transform ancestors) are left untouched.
 */
export function TiltController() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(pointer: fine)");
    if (reduced.matches || !fine.matches) return;

    const states = new WeakMap<HTMLElement, TiltState>();
    let current: HTMLElement | null = null;
    let raf = 0;
    let targetX = 0;
    let targetY = 0;

    const isEligible = (el: HTMLElement | null): el is HTMLElement => {
      if (!el || !el.classList.contains("glass")) return false;
      if (el.classList.contains("glass-strong")) return false;
      if (el.closest('[role="dialog"]')) return false;
      if (el.closest(".glass-strong")) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width < 140 || rect.height < 110) return false;
      let node = el.parentElement;
      for (let i = 0; i < 4 && node; i += 1, node = node.parentElement) {
        if (node.style.transform && node.style.transform.includes("perspective")) return false;
      }
      return true;
    };

    const release = (restore = true) => {
      if (!current) return;
      const el = current;
      if (restore) {
        el.style.transform = `perspective(${PX}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      }
      el.classList.remove("tilt-active");
      el.style.transition = "";
      el.style.willChange = "";
      window.setTimeout(() => {
        if (!el.classList.contains("tilt-active")) el.classList.remove("tilt-card");
      }, 450);
      current = null;
      targetX = 0;
      targetY = 0;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const tick = () => {
      if (!current) return;
      const el = current;
      const state = states.get(el) ?? { tx: 0, ty: 0 };
      state.tx += (targetX - state.tx) * LERP;
      state.ty += (targetY - state.ty) * LERP;
      states.set(el, state);
      el.style.transform = `perspective(${PX}px) rotateX(${state.tx.toFixed(
        2,
      )}deg) rotateY(${state.ty.toFixed(2)}deg) scale3d(${SCALE}, ${SCALE}, ${SCALE})`;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const at = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const card = at?.closest(".glass") as HTMLElement | null;
      if (!isEligible(card)) {
        release();
        return;
      }
      if (current !== card) {
        release(false);
        current = card;
        card.classList.add("tilt-card", "tilt-active");
        card.style.willChange = "transform";
        card.style.transition = "box-shadow .4s ease, border-color .4s ease, opacity .4s ease";
        if (!raf) raf = requestAnimationFrame(tick);
      }
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      targetX = (0.5 - py) * 2 * MAX_TILT;
      targetY = (px - 0.5) * 2 * MAX_TILT;
      card.style.setProperty("--tilt-gx", `${(px * 100).toFixed(1)}%`);
      card.style.setProperty("--tilt-gy", `${(py * 100).toFixed(1)}%`);
    };

    const onScroll = () => release();
    const onLeaveDoc = () => release();

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseleave", onLeaveDoc, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseleave", onLeaveDoc);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
