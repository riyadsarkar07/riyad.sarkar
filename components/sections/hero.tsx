"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  ArrowDown,
  BadgeCheck,
  Cpu,
  Download,
  Facebook,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { profile, socials, typingWords } from "@/data/content";
import { useTyping } from "@/hooks/use-typing";
import { useFinePointer } from "@/hooks/use-media-query";
import { useI18n } from "@/lib/i18n";
import { useLenis } from "@/hooks/use-lenis";
import { Magnetic } from "@/components/effects/magnetic";
import { ParticleBackground } from "@/components/effects/particle-background";
import { MeshBackground } from "@/components/effects/mesh-background";
import { CyberGrid } from "@/components/effects/cyber-grid";
import { HoloShield } from "@/components/effects/holo-shield";
import { OrbitRings } from "@/components/effects/orbit-rings";
import { Parallax } from "@/components/effects/parallax";
import { Button } from "@/components/ui/button";

const roleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  whatsapp: Phone,
  messenger: MessageCircle,
  email: Mail,
  github: Github,
  linkedin: Linkedin,
  facebook: Facebook,
  instagram: Instagram,
  telegram: Globe,
};

/**
 * Massive premium hero with floating profile, typewriter roles,
 * magnetic CTAs, gentle mouse parallax and a layered background.
 */
export function Hero() {
  const { t } = useI18n();
  const { lenis } = useLenis();
  const finePointer = useFinePointer();
  const { text: typed, isDeleting } = useTyping(typingWords);
  const [imageLoaded, setImageLoaded] = useState(false);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spring = { stiffness: 50, damping: 20, mass: 0.6 };
  const sx = useSpring(mx, spring);
  const sy = useSpring(my, spring);

  const parallaxProfileX = useTransform(sx, (v) => v * -16);
  const parallaxProfileY = useTransform(sy, (v) => v * -16);
  const parallaxShapesX = useTransform(sx, (v) => v * 28);
  const parallaxShapesY = useTransform(sy, (v) => v * 28);
  const rotateProfileX = useTransform(sy, (v) => -v * 8);
  const rotateProfileY = useTransform(sx, (v) => v * 8);

  useEffect(() => {
    if (!finePointer) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [finePointer, mx, my]);

  const scrollTo = (id: string) => {
    if (lenis) lenis.scrollTo(`#${id}`, { offset: -72, duration: 1.2 });
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="home" className="relative flex min-h-[100dvh] items-center overflow-hidden pt-24">
      {/* Layered background */}
      <MeshBackground />
      <CyberGrid />
      <ParticleBackground density={50} />

      {/* Floating glass shapes + cyber symbols (mouse + scroll parallax) */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ x: parallaxShapesX, y: parallaxShapesY }}
        aria-hidden
      >
        <Parallax className="absolute inset-0" offset={36}>
          <div className="animate-float-slow absolute left-[8%] top-[22%] h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-400/30 to-blue-600/20 backdrop-blur-sm sm:h-16 sm:w-16" />
          <div className="animate-float absolute right-[14%] top-[18%] h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400/30 to-sky-500/20 backdrop-blur-sm sm:h-10 sm:w-10" />
          <div className="animate-float-slow absolute bottom-[18%] left-[16%] h-10 w-10 rounded-full border border-cyan-300/40 bg-cyan-400/10 backdrop-blur-sm sm:h-12 sm:w-12" />
          <div className="animate-float absolute bottom-[26%] right-[10%] h-11 w-11 rounded-2xl border border-blue-400/30 bg-blue-400/10 backdrop-blur-sm sm:h-14 sm:w-14" />

          {/* Rotating cyber cube */}
          <div className="absolute right-[30%] top-[38%] hidden lg:block">
            <div className="animate-cube-spin h-10 w-10 rounded-lg border border-cyan-300/40 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 shadow-[0_0_24px_rgba(56,189,248,0.35)] backdrop-blur-sm" />
          </div>

          {/* Floating lock chip */}
          <div className="absolute bottom-[30%] right-[22%] hidden items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 backdrop-blur-sm lg:flex">
            <Lock className="icon-glow h-4 w-4 text-cyan-400" />
          </div>

          {/* Floating cpu chip */}
          <div className="absolute left-[24%] top-[52%] hidden items-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-400/10 px-3 py-2 backdrop-blur-sm lg:flex">
            <Cpu className="icon-glow h-4 w-4 text-sky-400" />
          </div>
        </Parallax>
      </motion.div>

      <div className="container relative z-10 grid items-center gap-8 pb-20 lg:grid-cols-[1.15fr_0.85fr] md:gap-14 lg:gap-8">
        {/* Left column — copy */}
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-muted-foreground">{t.hero.greeting}</span>
            <span className="font-semibold text-primary">— {t.hero.location}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl font-bold leading-[1.05] min-[400px]:text-5xl sm:text-6xl md:text-7xl lg:text-[5.25rem]"
          >
            {t.hero.name.split(" ")[0]}{" "}
            <span className="text-gradient">{t.hero.name.split(" ").slice(1).join(" ")}</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 flex min-h-9 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-base font-medium sm:text-2xl lg:justify-start"
          >
            <span className="hidden h-6 w-1 rounded-full bg-gradient-to-b from-sky-500 to-blue-600 sm:block" />
            <span className="text-muted-foreground">{t.hero.role1}</span>
            <span className="hidden text-muted-foreground/50 sm:inline">·</span>
            <motion.span
              animate={{ opacity: isDeleting ? 0.3 : 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="inline-flex items-center gap-1"
            >
              <span className="text-gradient font-semibold">{typed}</span>
              <span
                className="ml-0.5 inline-block h-[1.1em] w-[2px] rounded-full bg-gradient-to-b from-sky-500 to-blue-600 animate-blink"
                aria-hidden
              />
            </motion.span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-muted-foreground md:text-lg lg:mx-0"
          >
            {t.hero.tagline}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            <Magnetic>
              <Button size="lg" onClick={() => scrollTo("consultation")}>
                <ShieldCheck className="mr-1 h-5 w-5" />
                {t.hero.primaryCta}
              </Button>
            </Magnetic>
            <Magnetic>
              <Button size="lg" variant="outline" asChild>
                <a href={profile.cvUrl} target="_blank" rel="noopener noreferrer" download>
                  <Download className="mr-1 h-5 w-5" />
                  {t.hero.downloadCv}
                </a>
              </Button>
            </Magnetic>
          </motion.div>

          {/* Social row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-wrap items-center justify-center gap-2 lg:justify-start"
          >
            <span className="mr-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Reach me
            </span>
            {socials.map((social) => {
              const Icon = roleIcons[social.id] ?? Globe;
              return (
                <Magnetic key={social.id} strength={0.25}>
                  <a
                    href={social.href}
                    target={social.href.startsWith("mailto") ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="glass flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-primary hover:shadow-glow"
                  >
                    <Icon className="icon-glow h-[18px] w-[18px]" />
                  </a>
                </Magnetic>
              );
            })}
          </motion.div>

          {/* Trust badge */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-3 backdrop-blur-sm"
          >
            <BadgeCheck className="h-8 w-8 shrink-0 text-cyan-500" />
            <div className="text-left">
              <p className="text-sm font-semibold">{t.hero.verified}</p>
              <p className="text-xs text-muted-foreground">{t.hero.verifiedSub}</p>
            </div>
          </motion.div>
        </div>

        {/* Right column — floating profile */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            x: parallaxProfileX,
            y: parallaxProfileY,
            rotateX: rotateProfileX,
            rotateY: rotateProfileY,
            transformPerspective: 1000,
          }}
          className="relative mx-auto mt-4 flex h-[280px] w-[280px] items-center justify-center min-[375px]:h-[310px] min-[375px]:w-[310px] sm:mt-0 sm:h-[420px] sm:w-[420px] lg:h-[460px] lg:w-[460px]"
        >
          {/* Holographic cyber shield behind the profile */}
          <HoloShield className="z-0 scale-[1.15]" />

          {/* Rotating conic ring */}
          <div
            className="animate-spin-slow absolute inset-0 z-[1] rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(14,165,233,0) 0%, rgba(14,165,233,0.7) 12%, rgba(56,189,248,0) 28%, rgba(37,99,235,0.6) 55%, rgba(14,165,233,0) 75%, rgba(56,189,248,0.7) 90%, rgba(14,165,233,0) 100%)",
              WebkitMask:
                "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
            }}
          />

          {/* Rotating rings + orbit particles + energy pulses */}
          <OrbitRings />

          {/* Glow halo — breathing */}
          <div className="animate-breath absolute inset-6 rounded-full bg-gradient-to-br from-sky-400/40 via-cyan-400/25 to-blue-600/30 blur-2xl" />

          {/* Profile image — perfect 1:1 circle */}
          <div className="animate-float-slow relative z-10 aspect-square h-[200px] w-[200px] overflow-hidden rounded-full border-[5px] border-white/80 shadow-glow-lg ring-4 ring-cyan-400/20 transition-transform duration-500 hover:scale-[1.04] dark:border-white/20 min-[375px]:h-[230px] min-[375px]:w-[230px] sm:h-[320px] sm:w-[320px] lg:h-[340px] lg:w-[340px]">
            <Image
              src={profile.avatar}
              alt="Riyad Sarkar — Cyber Security Specialist"
              fill
              priority
              quality={95}
              sizes="(max-width: 640px) 240px, 320px"
              draggable={false}
              className="object-cover"
              onLoad={() => setImageLoaded(true)}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-100 to-blue-200 text-4xl font-bold text-blue-500/60 dark:from-slate-800 dark:to-slate-900">
                {profile.initials}
              </div>
            )}
          </div>

          {/* Floating badges */}
          <motion.div
            className="glass-strong absolute -left-1 top-4 z-20 flex items-center gap-2 rounded-2xl px-3 py-2 shadow-glow sm:left-0 sm:top-8 sm:px-4 sm:py-2.5"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ShieldCheck className="h-5 w-5 text-cyan-500" />
            <div className="text-left">
              <p className="text-xs font-semibold leading-none">99% Success</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Recovery rate</p>
            </div>
          </motion.div>

          <motion.div
            className="glass-strong absolute bottom-6 -right-1 z-20 flex items-center gap-2 rounded-2xl px-3 py-2 shadow-glow sm:bottom-10 sm:right-0 sm:px-4 sm:py-2.5"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <div className="text-left">
              <p className="text-xs font-semibold leading-none">24/7 Support</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Always available</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.button
        onClick={() => scrollTo("stats")}
        className="absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-primary md:flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        aria-label={t.hero.scroll}
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.3em]">{t.hero.scroll}</span>
        <motion.span
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown className="h-4 w-4" />
        </motion.span>
      </motion.button>
    </section>
  );
}
