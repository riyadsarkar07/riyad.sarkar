import { Reveal } from "@/components/effects/reveal";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}

/** Consistent premium section header. */
export function SectionHeading({ eyebrow, title, description, align = "center" }: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <Reveal>
        <div
          className={
            "mb-2 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyber-500 sm:text-sm sm:tracking-[0.25em] " +
            (align === "center" ? "justify-center" : "")
          }
        >
          <span className="hidden h-px w-8 bg-gradient-to-r from-transparent to-cyber-500 sm:block" />
          {eyebrow}
          <span className="hidden h-px w-8 bg-gradient-to-l from-transparent to-cyber-500 sm:block" />
        </div>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="section-title text-balance">{title}</h2>
      </Reveal>
      {description && (
        <Reveal delay={0.16}>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-3 md:text-base">
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}
