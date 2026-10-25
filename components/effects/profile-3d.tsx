"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { profile } from "@/data/content";
import { prefersReducedMotion } from "@/lib/utils";
import { duration, easeOutExpo } from "@/lib/motion";

/**
 * 1:1 portrait card with a single subtle hover tilt.
 */
export function Profile3D() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const enabled = useRef(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    enabled.current =
      !prefersReducedMotion() && window.matchMedia("(pointer: fine)").matches;
    return () => cancelAnimationFrame(frame.current);
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current;
    const card = cardRef.current;
    if (!wrap || !card || !enabled.current) return;
    const rect = wrap.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const rx = (0.5 - py) * 6;
    const ry = (px - 0.5) * 7;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      card.style.transform = `perspective(1200px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    });
  }, []);

  const onPointerLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    cancelAnimationFrame(frame.current);
    card.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg)";
  }, []);

  return (
    <motion.div
      ref={wrapRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.cinematic, delay: 0.16, ease: easeOutExpo }}
      className="relative z-10 aspect-square h-full w-full"
      style={{ perspective: 1200 }}
    >
      <div
        ref={cardRef}
        className="profile-3d relative h-full w-full overflow-hidden rounded-[24px] border border-cyan-400/25 bg-slate-950 shadow-[0_18px_48px_rgba(8,47,73,0.28)] ring-1 ring-cyan-400/20 sm:rounded-[28px] lg:rounded-[32px]"
        style={{
          transform: "perspective(1200px) rotateX(0deg) rotateY(0deg)",
          transformStyle: "preserve-3d",
          transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <Image
          src={profile.avatar}
          alt="Professional portrait of Riyad Sarkar, Cyber Security Specialist"
          fill
          priority
          quality={90}
          sizes="(max-width: 640px) 280px, (max-width: 1024px) 360px, 400px"
          draggable={false}
          className="object-cover object-center"
          onLoad={() => setImageLoaded(true)}
        />
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-3xl font-bold text-cyan-400/50">
            {profile.initials}
          </div>
        )}
      </div>
    </motion.div>
  );
}
