"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
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
import Link from "next/link";
import { profile, socials, typingWords } from "@/data/content";
import { useTyping } from "@/hooks/use-typing";
import { useI18n } from "@/lib/i18n";
import { useLenis } from "@/hooks/use-lenis";
import { ParticleBackground } from "@/components/effects/particle-background";
import { MeshBackground } from "@/components/effects/mesh-background";
import { CyberGrid } from "@/components/effects/cyber-grid";
import { OrbitRings } from "@/components/effects/orbit-rings";
import { Magnetic } from "@/components/effects/magnetic";
import { AvailabilityBadge } from "@/components/widgets/availability-badge";
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

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Cinematic hero — on phones the portrait sits with the intro so the
 * first screen stays balanced. Desktop keeps the two-column layout.
 */
export function Hero() {
  const { t } = useI18n();
  const { lenis } = useLenis();
  const { text: typed, isDeleting } = useTyping(typingWords);
  const [imageLoaded, setImageLoaded] = useState(false);
  const reduceMotion = useReducedMotion();

  const scrollTo = (id: string) => {
    if (lenis) lenis.scrollTo(`#${id}`, { offset: -72, duration: 1.2 });
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      className="relative flex items-center overflow-hidden pt-[4.25rem] sm:pt-20 lg:min-h-[88dvh] lg:pt-24"
    >
      <MeshBackground />
      <CyberGrid />
      <ParticleBackground density={22} />
      <span
        className="light-streak pointer-events-none absolute left-0 top-[22%] hidden w-[42%] motion-reduce:animate-none animate-light-streak md:block"
        aria-hidden
      />

      <div className="container relative z-10 grid items-center gap-4 pb-8 min-[390px]:gap-5 sm:gap-7 sm:pb-12 lg:grid-cols-[1.08fr_0.92fr] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-5 lg:pb-16">
        <div className="order-1 text-center lg:col-start-1 lg:row-start-1 lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="mb-3 flex flex-wrap items-center justify-center gap-2 min-[390px]:mb-4 sm:mb-6 lg:justify-start"
          >
            <AvailabilityBadge compact />
            <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium min-[390px]:px-4 min-[390px]:py-2 min-[390px]:text-sm">
              <span className="text-muted-foreground">{t.hero.greeting}</span>
              <span className="font-semibold text-primary">— {t.hero.location}</span>
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.06, ease }}
            className="text-[2.05rem] font-bold leading-[1.08] tracking-tight min-[390px]:text-[2.35rem] min-[430px]:text-5xl sm:text-6xl md:text-7xl lg:text-[4.75rem]"
          >
            {t.hero.name.split(" ")[0]}{" "}
            <span className="text-gradient">{t.hero.name.split(" ").slice(1).join(" ")}</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.14, ease }}
            className="mt-2.5 flex min-h-[1.5em] flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[0.95rem] font-medium min-[390px]:mt-3 min-[390px]:text-base sm:mt-5 sm:text-2xl lg:justify-start"
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
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.12, ease }}
          className="relative order-2 mx-auto flex h-[188px] w-[188px] items-center justify-center min-[390px]:h-[208px] min-[390px]:w-[208px] min-[430px]:h-[228px] min-[430px]:w-[228px] sm:h-[380px] sm:w-[380px] md:h-[420px] md:w-[420px] lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[460px] lg:w-[460px] lg:self-center"
        >
          <div
            className="absolute inset-0 rounded-full opacity-70 motion-reduce:animate-none animate-spin-slow sm:opacity-80"
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
            className="absolute inset-8 rounded-full bg-gradient-to-br from-sky-400/28 via-cyan-400/16 to-blue-600/20 blur-xl motion-reduce:animate-none animate-breath sm:inset-10 sm:blur-2xl"
            aria-hidden
          />

          <motion.div
            className="relative z-10 aspect-square h-[138px] w-[138px] overflow-hidden rounded-full border-[3px] border-white/90 bg-sky-50 shadow-glow-lg ring-2 ring-cyan-400/25 dark:border-white/15 dark:bg-slate-900 min-[390px]:h-[152px] min-[390px]:w-[152px] min-[430px]:h-[168px] min-[430px]:w-[168px] sm:h-[280px] sm:w-[280px] sm:border-[5px] sm:ring-4 md:h-[312px] md:w-[312px] lg:h-[340px] lg:w-[340px]"
            animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image
              src={profile.avatar}
              alt="Riyad Sarkar — Cyber Security Specialist"
              fill
              priority
              quality={92}
              sizes="(max-width: 430px) 168px, (max-width: 640px) 188px, 340px"
              draggable={false}
              className="scale-[1.14] object-cover object-[50%_14%] sm:scale-[1.16] sm:object-[50%_16%]"
              onLoad={() => setImageLoaded(true)}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-100 to-blue-200 text-3xl font-bold text-blue-500/60 dark:from-slate-800 dark:to-slate-900">
                {profile.initials}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.85, duration: 0.7, ease }}
            className="glass-strong absolute left-0 top-6 z-20 hidden items-center gap-2 rounded-2xl px-3 py-2 shadow-glow motion-reduce:animate-none animate-float-card sm:flex sm:top-10 sm:px-4 sm:py-2.5"
          >
            <ShieldCheck className="h-5 w-5 text-cyan-500" />
            <div className="text-left">
              <p className="text-xs font-semibold leading-none">99% Success</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Recovery rate</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0, duration: 0.7, ease }}
            className="glass-strong absolute bottom-8 right-0 z-20 hidden items-center gap-2 rounded-2xl px-3 py-2 shadow-glow motion-reduce:animate-none animate-float-card sm:flex sm:bottom-12 sm:px-4 sm:py-2.5"
            style={{ animationDelay: "-2.4s" }}
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

        <div className="order-3 text-center lg:col-start-1 lg:row-start-2 lg:text-left">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.22, ease }}
            className="mx-auto mt-1 max-w-xl text-pretty text-[0.92rem] leading-relaxed text-muted-foreground min-[390px]:text-[0.98rem] sm:mt-0 sm:text-base md:text-lg lg:mx-0"
          >
            {t.hero.tagline}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease }}
            className="mt-4 flex w-full flex-col gap-2.5 min-[390px]:mt-5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 lg:justify-start"
          >
            <Magnetic strength={0.18} className="block w-full sm:inline-block sm:w-auto">
              <Button
                size="lg"
                className="h-11 w-full px-5 text-sm sm:h-12 sm:w-auto sm:px-8 sm:text-base"
                onClick={() => scrollTo("contact")}
              >
                <Mail className="mr-1 h-5 w-5" />
                {t.common.startProject}
              </Button>
            </Magnetic>
            <Magnetic strength={0.18} className="block w-full sm:inline-block sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="h-11 w-full px-5 text-sm sm:h-12 sm:w-auto sm:px-8 sm:text-base"
                asChild
              >
                <Link href="/consultation">
                  <ShieldCheck className="mr-1 h-5 w-5" />
                  {t.hero.primaryCta}
                </Link>
              </Button>
            </Magnetic>
            <Magnetic strength={0.18} className="block w-full sm:inline-block sm:w-auto">
              <Button size="lg" variant="outline" className="h-11 w-full px-5 text-sm sm:h-12 sm:w-auto sm:px-8 sm:text-base" asChild>
                <a href={profile.cvUrl} target="_blank" rel="noopener noreferrer" download>
                  <Download className="mr-1 h-5 w-5" />
                  {t.hero.downloadCv}
                </a>
              </Button>
            </Magnetic>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.38, ease }}
            className="mt-4 flex flex-wrap items-center justify-center gap-1.5 min-[390px]:mt-5 sm:mt-8 sm:gap-2 lg:justify-start"
          >
            <span className="mr-0.5 hidden text-xs font-medium uppercase tracking-widest text-muted-foreground min-[430px]:inline">
              Reach me
            </span>
            {socials.map((social, index) => {
              const Icon = roleIcons[social.id] ?? Globe;
              return (
                <motion.a
                  key={social.id}
                  href={social.href}
                  target={social.href.startsWith("mailto") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.42 + index * 0.04, type: "spring", stiffness: 320, damping: 18 }}
                  whileHover={{ y: -4, scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  className="glass flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:text-primary hover:shadow-glow sm:h-10 sm:w-10"
                >
                  <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                </motion.a>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.48, ease }}
            className="mt-4 inline-flex items-center gap-2.5 rounded-2xl border border-cyan-300/40 bg-cyan-400/10 px-3 py-2 backdrop-blur-sm min-[390px]:mt-5 sm:mt-8 sm:gap-3 sm:px-4 sm:py-3"
          >
            <BadgeCheck className="h-6 w-6 shrink-0 text-cyan-500 sm:h-8 sm:w-8" />
            <div className="text-left">
              <p className="text-xs font-semibold sm:text-sm">{t.hero.verified}</p>
              <p className="text-[11px] text-muted-foreground sm:text-xs">{t.hero.verifiedSub}</p>
            </div>
          </motion.div>
        </div>
      </div>

      <motion.button
        onClick={() => scrollTo("stats")}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-primary md:flex"
        aria-label={t.hero.scroll}
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.3em]">{t.hero.scroll}</span>
        <motion.span
          animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown className="h-4 w-4" />
        </motion.span>
      </motion.button>
    </section>
  );
}
