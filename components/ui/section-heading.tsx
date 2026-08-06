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
            "mb-4 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.25em] text-cyber-500 " +
            (align === "center" ? "justify-center" : "")
          }
        >
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-cyber-500" />
          {eyebrow}
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-cyber-500" />
        </div>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="section-title text-balance">{title}</h2>
      </Reveal>
      {description && (
        <Reveal delay={0.16}>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}
