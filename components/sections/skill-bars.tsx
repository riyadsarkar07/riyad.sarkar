"use client";

import { tools } from "@/data/content";
import { Reveal } from "@/components/effects/reveal";

/** Animated skill / tool proficiency bars. */
export function SkillBars() {
  return (
    <div className="glass gradient-border rounded-[1.35rem] p-6 sm:p-8">
      <Reveal>
        <h3 className="mb-1 text-2xl font-bold">Platform Focus</h3>
        <p className="mb-8 text-sm text-muted-foreground">
          Hands-on work across the platforms and tools I use in recovery and protection engagements.
        </p>
      </Reveal>
      <ul className="grid gap-3 sm:grid-cols-2">
        {tools.map((tool) => (
          <li
            key={tool.name}
            className="flex items-center justify-between rounded-2xl border border-border/50 bg-primary/5 px-4 py-3"
          >
            <span className="text-sm font-medium">{tool.name}</span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {tool.category}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
