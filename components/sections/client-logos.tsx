"use client";

import { clientLogos } from "@/data/content";
import { Logo } from "@/components/ui/logo";
import { Reveal } from "@/components/effects/reveal";

/** Infinite marquee of client brands. */
export function ClientLogos() {
  const doubled = [...clientLogos, ...clientLogos];

  return (
    <section className="relative overflow-hidden py-16" aria-label="Trusted by clients">
      <Reveal>
        <p className="mb-10 text-center text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Trusted by teams & businesses worldwide
        </p>
      </Reveal>

      <div className="mask-fade-x group relative overflow-hidden">
        <div className="animate-marquee flex w-max gap-14 motion-reduce:animate-none group-hover:[animation-play-state:paused]">
          {doubled.map((logo, index) => (
            <div
              key={`${logo}-${index}`}
              className="flex shrink-0 items-center gap-3 opacity-50 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0"
            >
              <Logo size={26} />
              <span className="whitespace-nowrap font-display text-lg font-bold text-muted-foreground">
                {logo}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
