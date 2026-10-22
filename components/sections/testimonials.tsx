"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { testimonials } from "@/data/content";
import { Reveal } from "@/components/effects/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 5500;

/** Testimonials — auto-rotating glass slider with 5-star ratings. */
export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = testimonials.length;

  const go = (next: number, dir: number) => {
    setDirection(dir);
    setIndex((next + count) % count);
  };

  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (paused || !inView) return;
    timerRef.current = setInterval(() => {
      setDirection(1);
      setIndex((prev) => (prev + 1) % count);
    }, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, inView, count]);

  const current = testimonials[index];

  return (
    <section id="testimonials" ref={sectionRef} className="section relative overflow-hidden">
      <div className="container">
        <SectionHeading
          eyebrow="Testimonials"
          title="Stories of Recovery & Trust"
          description="Real outcomes from real clients — the reason every referral matters."
        />

        <div
          className="relative mx-auto mt-14 max-w-3xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="perspective-1000 relative">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.figure
                key={current.id}
                custom={direction}
                initial={{ opacity: 0, x: direction * 80, rotateY: direction * 12 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                exit={{ opacity: 0, x: direction * -80, rotateY: direction * -12 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="glass gradient-border relative flex min-h-[320px] flex-col rounded-3xl p-6 sm:p-8 md:min-h-[300px] md:p-10"
              >
                <Quote className="h-10 w-10 text-cyan-400/60" />
                <div className="mt-4 flex items-center gap-1">
                  {Array.from({ length: current.rating }).map((_, starIndex) => (
                    <Star key={starIndex} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-base leading-relaxed text-foreground/90 md:text-lg">
                  “{current.text}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-4 border-t border-border pt-5">
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-glow",
                      current.avatarColor,
                    )}
                  >
                    {current.name.charAt(0)}
                  </span>
                  <div>
                    <p className="font-display font-bold">{current.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {current.role} · {current.location}
                    </p>
                  </div>
                  <span className="ml-auto hidden rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary sm:block">
                    {current.case}
                  </span>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={() => go(index - 1, -1)}
              className="glass flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-all hover:scale-110 hover:text-primary hover:shadow-glow"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              {testimonials.map((item, dotIndex) => (
                <button
                  key={item.id}
                  onClick={() => go(dotIndex, dotIndex > index ? 1 : -1)}
                  className={cn(
                    "flex h-6 items-center justify-center rounded-full transition-all duration-300",
                  )}
                  aria-label={`Go to testimonial ${dotIndex + 1}`}
                >
                  <span
                    className={cn(
                      "block h-2 rounded-full transition-all duration-300",
                      dotIndex === index
                        ? "w-8 bg-gradient-to-r from-blue-600 to-cyan-400 shadow-glow"
                        : "w-2 bg-primary/20 hover:bg-primary/40",
                    )}
                  />
                </button>
              ))}
            </div>

            <button
              onClick={() => go(index + 1, 1)}
              className="glass flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-all hover:scale-110 hover:text-primary hover:shadow-glow"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <Reveal delay={0.2} className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary">4.9/5</span> average rating from 100+
            clients across 25+ countries
          </p>
        </Reveal>
      </div>
    </section>
  );
}
