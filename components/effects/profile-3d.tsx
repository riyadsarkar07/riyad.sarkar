"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { profile } from "@/data/content";
import { prefersReducedMotion } from "@/lib/utils";
import { duration, easeOutExpo } from "@/lib/motion";

/**
 * Subtle 3D portrait: mouse-tilt, inner image parallax, holographic shine.
 */
export function Profile3D() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);
  const enabled = useRef(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const reduceMotion = useReducedMotion();

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
    const rx = (0.5 - py) * 10;
    const ry = (px - 0.5) * 12;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      card.style.transform = `perspective(1100px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(12px)`;
      if (imageRef.current) {
        imageRef.current.style.transform = `translate3d(${((px - 0.5) * -10).toFixed(1)}px, ${((py - 0.5) * -8).toFixed(1)}px, 18px) scale(1.16)`;
      }
      if (shineRef.current) {
        shineRef.current.style.opacity = "1";
        shineRef.current.style.background = `radial-gradient(220px circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.38), transparent 58%)`;
      }
    });
  }, []);

  const onPointerLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    cancelAnimationFrame(frame.current);
    card.style.transform = "perspective(1100px) rotateX(4deg) rotateY(-6deg) translateZ(0)";
    if (imageRef.current) {
      imageRef.current.style.transform = "translate3d(0, 0, 0) scale(1.14)";
    }
    if (shineRef.current) {
      shineRef.current.style.opacity = "0";
    }
  }, []);

  return (
    <motion.div
      ref={wrapRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      initial={{ opacity: 0, scale: 0.88, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: duration.cinematic, delay: 0.18, ease: easeOutExpo }}
      className="relative z-10 aspect-square h-[144px] w-[144px] min-[390px]:h-[158px] min-[390px]:w-[158px] min-[430px]:h-[172px] min-[430px]:w-[172px] sm:h-[268px] sm:w-[268px] md:h-[300px] md:w-[300px] lg:h-[324px] lg:w-[324px]"
      style={{ perspective: 1100 }}
    >
      <div
        ref={cardRef}
        className="profile-3d relative h-full w-full overflow-hidden rounded-full border-[3px] border-white/90 bg-slate-900 shadow-glow-lg ring-2 ring-cyan-400/25 dark:border-white/10 dark:bg-slate-950 sm:border-[4px] sm:ring-4"
        style={{
          transform: "perspective(1100px) rotateX(4deg) rotateY(-6deg)",
          transformStyle: "preserve-3d",
          transition: "transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div
          ref={imageRef}
          className="absolute inset-0"
          style={{
            transform: "translateZ(8px) scale(1.14)",
            transition: "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <Image
            src={profile.avatar}
            alt="Professional portrait of Riyad Sarkar, Cyber Security Specialist"
            fill
            priority
            quality={90}
            sizes="(max-width: 430px) 172px, (max-width: 640px) 268px, (max-width: 1024px) 300px, 324px"
            draggable={false}
            className="object-cover object-[50%_28%] min-[430px]:object-[50%_26%] sm:object-[50%_24%]"
            onLoad={() => setImageLoaded(true)}
          />
        </div>
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-3xl font-bold text-cyan-400/50">
            {profile.initials}
          </div>
        )}
        <span
          ref={shineRef}
          className="pointer-events-none absolute inset-0 rounded-full opacity-0 mix-blend-soft-light transition-opacity duration-300"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            boxShadow:
              "inset 0 -28px 36px rgba(8, 47, 73, 0.28), inset 0 12px 18px rgba(255,255,255,0.18)",
          }}
          aria-hidden
        />
        <span
          className="pointer-events-none absolute inset-x-[12%] top-[10%] h-[28%] rounded-full bg-gradient-to-b from-white/35 to-transparent blur-[2px]"
          aria-hidden
        />
        {!reduceMotion && (
          <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full" aria-hidden>
            <span className="absolute inset-x-0 h-1/4 bg-gradient-to-b from-transparent via-cyan-300/25 to-transparent motion-reduce:animate-none animate-scan-portrait" />
          </span>
        )}
      </div>
    </motion.div>
  );
}
