"use client";

import { Reveal } from "@/components/effects/reveal";
import { TextReveal } from "@/components/effects/text-reveal";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}

/** Consistent premium section header with cinematic title reveal. */
export function SectionHeading({ eyebrow, title, description, align = "center" }: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <Reveal>
        <div
          className={
            "mb-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyber-600 sm:mb-5 sm:text-xs sm:tracking-[0.28em] " +
            (align === "center" ? "justify-center" : "")
          }
        >
          <span className="hidden h-px w-7 bg-gradient-to-r from-transparent to-cyber-500 sm:block" />
          {eyebrow}
          <span className="hidden h-px w-7 bg-gradient-to-l from-transparent to-cyber-500 sm:block" />
        </div>
      </Reveal>
      <h2 className={`section-title text-balance ${align === "center" ? "justify-center" : ""} flex flex-wrap leading-[1.18]`}>
        <TextReveal text={title} delay={0.04} inView className={align === "center" ? "justify-center" : ""} />
      </h2>
      {description && (
        <Reveal delay={0.12}>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:mt-5 sm:text-[0.95rem] md:text-base">
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}
