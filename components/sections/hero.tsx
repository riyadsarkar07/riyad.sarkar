"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
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
import { usePointerParallax } from "@/hooks/use-pointer-parallax";
import { ParticleBackground } from "@/components/effects/particle-background";
import { MeshBackground } from "@/components/effects/mesh-background";
import { CyberGrid } from "@/components/effects/cyber-grid";
import { OrbitRings } from "@/components/effects/orbit-rings";
import { Magnetic } from "@/components/effects/magnetic";
import { Profile3D } from "@/components/effects/profile-3d";
import { TextReveal, LineReveal } from "@/components/effects/text-reveal";
import { Button } from "@/components/ui/button";
import { duration, easeOutExpo } from "@/lib/motion";

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
 * Cinematic hero — 3D portrait, text reveal, particle grid, mouse parallax.
 */
export function Hero() {
  const { t } = useI18n();
  const { lenis } = useLenis();
  const { text: typed, isDeleting } = useTyping(typingWords);
  const reduceMotion = useReducedMotion();
  const { ref, onPointerMove, onPointerLeave } = usePointerParallax(36);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0]);
  const portraitY = useTransform(scrollYProgress, [0, 1], [0, -48]);
  const fadeOpacity = useTransform(scrollYProgress, [0.35, 1], [0.2, 1]);

  const scrollTo = (id: string) => {
    if (lenis) lenis.scrollTo(`#${id}`, { offset: -72, duration: 1.35 });
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const lastName = t.hero.name.split(" ").slice(1).join(" ");

  return (
    <section
      id="home"
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative flex items-center overflow-hidden pt-[4.5rem] sm:pt-24 lg:min-h-[92dvh] lg:pt-28"
    >
      <MeshBackground />
      <div data-depth="0.18" className="pointer-events-none absolute inset-0">
        <CyberGrid />
      </div>
      <div data-depth="0.28" className="pointer-events-none absolute inset-0">
        <ParticleBackground density={38} />
      </div>
      <span
        data-depth="0.42"
        className="pointer-events-none absolute left-[8%] top-[18%] hidden h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl motion-reduce:animate-none animate-hero-orb md:block"
        aria-hidden
      />
      <span
        data-depth="0.32"
        className="pointer-events-none absolute right-[10%] top-[28%] hidden h-52 w-52 rounded-full bg-blue-500/16 blur-3xl motion-reduce:animate-none animate-hero-orb md:block"
        style={{ animationDelay: "-4s" }}
        aria-hidden
      />
      <span
        className="light-streak pointer-events-none absolute left-0 top-[22%] hidden w-[42%] motion-reduce:animate-none animate-light-streak md:block"
        aria-hidden
      />

      <motion.div
        style={reduceMotion ? undefined : { y: contentY, opacity: contentOpacity }}
        className="container relative z-10 grid items-center gap-5 pb-16 min-[390px]:gap-6 sm:gap-8 sm:pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:gap-y-6 lg:pb-24"
      >
        <div className="order-1 text-center lg:col-start-1 lg:row-start-1 lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: duration.slow, ease: easeOutExpo }}
            className="mb-4 flex flex-wrap items-center justify-center min-[390px]:mb-5 sm:mb-7 lg:justify-start"
          >
            <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium min-[390px]:px-4 min-[390px]:py-2 min-[390px]:text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-muted-foreground">{t.hero.greeting}</span>
              <span className="font-semibold text-primary">— {t.hero.location}</span>
            </span>
          </motion.div>

          <h1 className="flex flex-wrap justify-center gap-x-[0.32em] text-[2.15rem] font-bold leading-[1.05] tracking-tight min-[390px]:text-[2.45rem] min-[430px]:text-5xl sm:text-6xl md:text-7xl lg:justify-start lg:text-[4.6rem]">
            <TextReveal text={t.hero.name.split(" ")[0]} delay={0.08} />
            <TextReveal text={lastName} delay={0.18} gradientWords={lastName.split(" ")} />
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.slow, delay: 0.42, ease: easeOutExpo }}
            className="mt-3 flex min-h-[1.5em] flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[0.98rem] font-medium min-[390px]:mt-4 min-[390px]:text-lg sm:mt-5 sm:text-2xl lg:justify-start"
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
          style={reduceMotion ? undefined : { y: portraitY }}
          className="relative order-2 mx-auto flex h-[196px] w-[196px] items-center justify-center min-[390px]:h-[216px] min-[390px]:w-[216px] min-[430px]:h-[236px] min-[430px]:w-[236px] sm:h-[360px] sm:w-[360px] md:h-[400px] md:w-[400px] lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[440px] lg:w-[440px] lg:self-center"
        >
          <div data-depth="0.22" className="absolute inset-0">
            <div
              className="absolute inset-0 rounded-full opacity-70 motion-reduce:animate-none animate-spin-slow sm:opacity-80"
              style={{
                background:
                  "conic-gradient(from 0deg, rgba(14,165,233,0) 0%, rgba(14,165,233,0.55) 12%, rgba(56,189,248,0) 28%, rgba(37,99,235,0.45) 55%, rgba(14,165,233,0) 75%, rgba(56,189,248,0.55) 90%, rgba(14,165,233,0) 100%)",
                WebkitMask:
                  "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
                mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
              }}
              aria-hidden
            />
            <OrbitRings />
            <div
              className="absolute inset-8 rounded-full bg-gradient-to-br from-sky-400/30 via-cyan-400/20 to-blue-600/20 blur-xl motion-reduce:animate-none animate-breath sm:inset-10 sm:blur-2xl"
              aria-hidden
            />
          </div>

          <div data-depth="0.48" className="relative z-10">
            <Profile3D />
          </div>

          <motion.div
            data-depth="0.62"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.95, duration: 0.7, ease: easeOutExpo }}
            className="glass-strong absolute left-0 top-6 z-20 hidden items-center gap-2 rounded-2xl px-3 py-2 shadow-glass motion-reduce:animate-none animate-float-card sm:flex sm:top-10 sm:px-4 sm:py-2.5"
          >
            <ShieldCheck className="h-5 w-5 text-cyan-500" />
            <div className="text-left">
              <p className="text-xs font-semibold leading-none">99% Success</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Recovery rate</p>
            </div>
          </motion.div>

          <motion.div
            data-depth="0.58"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.08, duration: 0.7, ease: easeOutExpo }}
            className="glass-strong absolute bottom-8 right-0 z-20 hidden items-center gap-2 rounded-2xl px-3 py-2 shadow-glass motion-reduce:animate-none animate-float-card sm:flex sm:bottom-12 sm:px-4 sm:py-2.5"
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
          <p className="mx-auto mt-1 max-w-xl text-pretty text-[0.95rem] leading-relaxed text-muted-foreground min-[390px]:text-base sm:mt-0 md:text-lg lg:mx-0">
            <LineReveal delay={0.52}>{t.hero.tagline}</LineReveal>
          </p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.slow, delay: 0.64, ease: easeOutExpo }}
            className="mt-5 flex w-full flex-col gap-2.5 min-[390px]:mt-6 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 lg:justify-start"
          >
            <Magnetic strength={0.38} className="block w-full sm:inline-block sm:w-auto">
              <Button
                size="lg"
                className="h-11 w-full px-5 text-sm sm:h-12 sm:w-auto sm:px-8 sm:text-base"
                asChild
              >
                <Link href="/consultation">
                  <ShieldCheck className="mr-1 h-5 w-5" />
                  {t.common.bookConsultation}
                </Link>
              </Button>
            </Magnetic>
            <Magnetic strength={0.3} className="block w-full sm:inline-block sm:w-auto">
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
            transition={{ duration: duration.slow, delay: 0.74, ease: easeOutExpo }}
            className="mt-5 flex flex-wrap items-center justify-center gap-1.5 min-[390px]:mt-6 sm:mt-8 sm:gap-2 lg:justify-start"
          >
            <span className="mr-0.5 hidden text-xs font-medium uppercase tracking-widest text-muted-foreground min-[430px]:inline">
              Reach me
            </span>
            {socials.map((social, index) => {
              const Icon = roleIcons[social.id] ?? Globe;
              return (
                <Magnetic key={social.id} strength={0.42}>
                  <motion.a
                    href={social.href}
                    target={social.href.startsWith("mailto") ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.78 + index * 0.04, type: "spring", stiffness: 320, damping: 18 }}
                    className="glass flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:border-primary/30 hover:text-primary hover:shadow-glass sm:h-10 sm:w-10"
                  >
                    <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  </motion.a>
                </Magnetic>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.slow, delay: 0.86, ease: easeOutExpo }}
            className="mt-5 inline-flex items-center gap-2.5 rounded-2xl border border-cyan-300/40 bg-cyan-400/10 px-3.5 py-2.5 backdrop-blur-sm min-[390px]:mt-6 sm:mt-8 sm:gap-3 sm:px-4 sm:py-3"
          >
            <BadgeCheck className="h-6 w-6 shrink-0 text-cyan-500 sm:h-8 sm:w-8" />
            <div className="text-left">
              <p className="text-xs font-semibold sm:text-sm">{t.hero.verified}</p>
              <p className="text-[11px] text-muted-foreground sm:text-xs">{t.hero.verifiedSub}</p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        style={reduceMotion ? undefined : { opacity: fadeOpacity }}
        className="hero-fade pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-28 sm:h-36"
        aria-hidden
      />

      <motion.button
        onClick={() => scrollTo("stats")}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.25, duration: 0.6 }}
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-primary md:flex"
        aria-label={t.hero.scroll}
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.3em]">{t.hero.scroll}</span>
        <motion.span
          animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown className="h-4 w-4" />
        </motion.span>
      </motion.button>
    </section>
  );
}
