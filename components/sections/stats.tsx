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
    <RevealItem className="group relative overflow-hidden rounded-2xl border border-border/60 bg-white/50 p-6 text-center backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-primary/30 hover:shadow-glow dark:bg-white/[0.04]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <p className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
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
    <section id="stats" className="relative py-10 md:py-14">
      <div className="container">
        <Reveal>
          <p className="mb-8 text-center text-sm text-muted-foreground">{t.stats.title}</p>
        </Reveal>
        <RevealGroup className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => (
            <AnimatedStat key={stat.labelKey} {...stat} />
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
