"use client";

import { useRef } from "react";
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
 * Cinematic hero — framed portrait, restrained cyan lighting, calm motion.
 */
export function Hero() {
  const { t } = useI18n();
  const { lenis } = useLenis();
  const { text: typed, isDeleting } = useTyping(typingWords);
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 36]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.96]);
  const fadeOpacity = useTransform(scrollYProgress, [0.45, 1], [0.15, 1]);

  const scrollTo = (id: string) => {
    if (lenis) lenis.scrollTo(`#${id}`, { offset: -72, duration: 1.35 });
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const lastName = t.hero.name.split(" ").slice(1).join(" ");

  return (
    <section
      id="home"
      ref={sectionRef}
      className="relative flex items-center overflow-hidden pt-[4.5rem] sm:pt-24 lg:min-h-[92dvh] lg:pt-28"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_78%_18%,rgba(14,165,233,0.14),transparent_58%),radial-gradient(720px_360px_at_12%_8%,rgba(15,23,42,0.08),transparent_62%)] dark:bg-[radial-gradient(900px_420px_at_78%_18%,rgba(14,165,233,0.16),transparent_58%),radial-gradient(720px_360px_at_12%_8%,rgba(2,6,23,0.55),transparent_62%)]" />
        <div className="bg-grid absolute inset-0 opacity-20 dark:opacity-[0.14] [mask-image:radial-gradient(ellipse_at_center,black_18%,transparent_72%)]" />
      </div>

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

        <div className="relative order-2 mx-auto flex h-[220px] w-[220px] items-center justify-center min-[390px]:h-[248px] min-[390px]:w-[248px] min-[430px]:h-[268px] min-[430px]:w-[268px] sm:h-[340px] sm:w-[340px] md:h-[380px] md:w-[380px] lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[400px] lg:w-[400px] lg:self-center">
          <div
            className="pointer-events-none absolute inset-[-8%] rounded-[36px] bg-cyan-400/15 blur-3xl dark:bg-cyan-400/20"
            aria-hidden
          />
          <div className="relative z-10 h-full w-full">
            <Profile3D />
          </div>
        </div>

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
