"use client";

import { achievements } from "@/data/content";
import { useCountUp } from "@/hooks/use-count-up";
import { RevealGroup, RevealItem } from "@/components/effects/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatNumber } from "@/lib/utils";

function AchievementCounter({ value, suffix }: { value: number; suffix: string }) {
  const { ref, value: current } = useCountUp(value, 1800);
  return (
    <span className="text-gradient font-display text-4xl font-bold md:text-5xl">
      <span ref={ref}>{formatNumber(current)}</span>
      {suffix}
    </span>
  );
}

/** Achievements — animated numbers and professional milestones. */
export function Achievements() {
  return (
    <section id="achievements" className="section relative overflow-hidden">
      <div className="bg-mesh-blue pointer-events-none absolute inset-0" />
      <div className="container relative">
        <SectionHeading
          eyebrow="Milestones"
          title="Numbers That Speak for Themselves"
          description="Every figure below represents a real person or business protected, recovered or hardened."
        />

        <RevealGroup className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement) => (
            <RevealItem key={achievement.id}>
              <div className="group glass gradient-border relative h-full overflow-hidden rounded-3xl p-8 text-center transition-all duration-500 hover:-translate-y-1.5 hover:shadow-glow-lg">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <AchievementCounter value={achievement.value} suffix={achievement.suffix} />
                <h4 className="mt-3 font-display text-lg font-bold">{achievement.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {achievement.description}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
