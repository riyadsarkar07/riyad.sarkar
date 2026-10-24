"use client";

import { stats } from "@/data/content";
import { useCountUp } from "@/hooks/use-count-up";
import { useI18n } from "@/lib/i18n";
import { Reveal, RevealGroup, RevealItem } from "@/components/effects/reveal";
import { formatNumber } from "@/lib/utils";

function AnimatedStat({
  value,
  suffix,
  labelKey,
}: {
  value: number;
  suffix: string;
  labelKey: string;
}) {
  const { ref, value: current } = useCountUp(value, 2000, 0);
  const { t } = useI18n();

  return (
    <RevealItem className="group relative overflow-hidden rounded-[1.25rem] border border-border/70 bg-white/65 p-5 text-center backdrop-blur-md transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-glass dark:bg-white/[0.04] sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <p className="font-display text-3xl font-bold tracking-tight min-[400px]:text-4xl sm:text-5xl">
        <span ref={ref} className="text-gradient">
          {formatNumber(current)}
        </span>
        <span className="text-gradient">{suffix}</span>
      </p>
      <p className="mt-2 text-sm font-medium text-muted-foreground">
        {t.stats[labelKey as keyof typeof t.stats]}
      </p>
    </RevealItem>
  );
}

/** LIVE STATS — animated counters band. */
export function Stats() {
  const { t } = useI18n();

  return (
    <section id="stats" className="relative py-10 sm:py-12 md:py-16">
      <div className="container">
        <Reveal>
          <p className="mb-5 text-center text-sm text-muted-foreground sm:mb-8">{t.stats.title}</p>
        </Reveal>
        <RevealGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {stats.map((stat) => (
            <AnimatedStat key={stat.labelKey} {...stat} />
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
