"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowDown,
  BadgeCheck,
  Download,
  Facebook,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { profile, socials, typingWords } from "@/data/content";
import { useTyping } from "@/hooks/use-typing";
import { useI18n } from "@/lib/i18n";
import { useLenis } from "@/hooks/use-lenis";
import { ParticleBackground } from "@/components/effects/particle-background";
import { MeshBackground } from "@/components/effects/mesh-background";
import { CyberGrid } from "@/components/effects/cyber-grid";
import { OrbitRings } from "@/components/effects/orbit-rings";
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

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

/**
 * Hero with a centered portrait, typewriter roles, CTAs and social rail.
 * Mouse-tracking 3D tilt was removed so the face stays level and sharp.
 */
export function Hero() {
  const { t } = useI18n();
  const { lenis } = useLenis();
  const { text: typed, isDeleting } = useTyping(typingWords);
  const [imageLoaded, setImageLoaded] = useState(false);

  const scrollTo = (id: string) => {
    if (lenis) lenis.scrollTo(`#${id}`, { offset: -72, duration: 1.2 });
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="home" className="relative flex min-h-[100dvh] items-center overflow-hidden pt-24">
      <MeshBackground />
      <CyberGrid />
      <ParticleBackground density={18} />

      <div className="container relative z-10 grid items-center gap-10 pb-24 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
        <div className="text-center lg:text-left">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
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
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl font-bold leading-[1.08] min-[400px]:text-5xl sm:text-6xl md:text-7xl lg:text-[4.75rem]"
          >
            {t.hero.name.split(" ")[0]}{" "}
            <span className="text-gradient">{t.hero.name.split(" ").slice(1).join(" ")}</span>
          </motion.h1>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 flex min-h-9 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-base font-medium sm:text-2xl lg:justify-start"
          >
            <span className="hidden h-6 w-1 rounded-full bg-gradient-to-b from-sky-500 to-blue-600 sm:block" />
            <span className="text-muted-foreground">{t.hero.role1}</span>
            <span className="hidden text-muted-foreground/50 sm:inline">·</span>
            <span className="inline-flex items-center gap-1" style={{ opacity: isDeleting ? 0.45 : 1 }}>
              <span className="text-gradient font-semibold">{typed}</span>
              <span
                className="ml-0.5 inline-block h-[1.1em] w-[2px] rounded-full bg-gradient-to-b from-sky-500 to-blue-600 animate-blink"
                aria-hidden
              />
            </span>
          </motion.div>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-muted-foreground md:text-lg lg:mx-0"
          >
            {t.hero.tagline}
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            <Button size="lg" onClick={() => scrollTo("consultation")}>
              <ShieldCheck className="mr-1 h-5 w-5" />
              {t.hero.primaryCta}
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href={profile.cvUrl} target="_blank" rel="noopener noreferrer" download>
                <Download className="mr-1 h-5 w-5" />
                {t.hero.downloadCv}
              </a>
            </Button>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-wrap items-center justify-center gap-2 lg:justify-start"
          >
            <span className="mr-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Reach me
            </span>
            {socials.map((social) => {
              const Icon = roleIcons[social.id] ?? Globe;
              return (
                <a
                  key={social.id}
                  href={social.href}
                  target={social.href.startsWith("mailto") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="glass flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:text-primary hover:shadow-glow"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              );
            })}
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-3 backdrop-blur-sm"
          >
            <BadgeCheck className="h-8 w-8 shrink-0 text-cyan-500" />
            <div className="text-left">
              <p className="text-sm font-semibold">{t.hero.verified}</p>
              <p className="text-xs text-muted-foreground">{t.hero.verifiedSub}</p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto flex h-[300px] w-[300px] items-center justify-center min-[375px]:h-[330px] min-[375px]:w-[330px] sm:h-[420px] sm:w-[420px] lg:h-[440px] lg:w-[440px]"
        >
          <div
            className="absolute inset-0 rounded-full opacity-80 motion-reduce:animate-none animate-spin-slow"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(14,165,233,0) 0%, rgba(14,165,233,0.55) 12%, rgba(56,189,248,0) 28%, rgba(37,99,235,0.45) 55%, rgba(14,165,233,0) 75%, rgba(56,189,248,0.55) 90%, rgba(14,165,233,0) 100%)",
              WebkitMask:
                "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
            }}
            aria-hidden
          />

          <OrbitRings />

          <div
            className="absolute inset-10 rounded-full bg-gradient-to-br from-sky-400/30 via-cyan-400/18 to-blue-600/22 blur-2xl"
            aria-hidden
          />

          <div className="relative z-10 aspect-square h-[214px] w-[214px] overflow-hidden rounded-full border-[5px] border-white/90 bg-sky-50 shadow-glow-lg ring-4 ring-cyan-400/25 dark:border-white/15 dark:bg-slate-900 min-[375px]:h-[240px] min-[375px]:w-[240px] sm:h-[312px] sm:w-[312px] lg:h-[328px] lg:w-[328px]">
            <Image
              src={profile.avatar}
              alt="Riyad Sarkar — Cyber Security Specialist"
              fill
              priority
              quality={90}
              sizes="(max-width: 640px) 240px, 328px"
              draggable={false}
              className="scale-[1.08] object-cover object-[50%_12%]"
              onLoad={() => setImageLoaded(true)}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-100 to-blue-200 text-4xl font-bold text-blue-500/60 dark:from-slate-800 dark:to-slate-900">
                {profile.initials}
              </div>
            )}
          </div>

          <div className="glass-strong absolute left-0 top-6 z-20 hidden items-center gap-2 rounded-2xl px-3 py-2 shadow-glow sm:flex sm:top-10 sm:px-4 sm:py-2.5">
            <ShieldCheck className="h-5 w-5 text-cyan-500" />
            <div className="text-left">
              <p className="text-xs font-semibold leading-none">99% Success</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Recovery rate</p>
            </div>
          </div>

          <div className="glass-strong absolute bottom-8 right-0 z-20 hidden items-center gap-2 rounded-2xl px-3 py-2 shadow-glow sm:flex sm:bottom-12 sm:px-4 sm:py-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <div className="text-left">
              <p className="text-xs font-semibold leading-none">24/7 Support</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Always available</p>
            </div>
          </div>
        </motion.div>
      </div>

      <button
        onClick={() => scrollTo("stats")}
        className="absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-primary md:flex"
        aria-label={t.hero.scroll}
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.3em]">{t.hero.scroll}</span>
        <ArrowDown className="h-4 w-4" />
      </button>
    </section>
  );
}
