"use client";

import { tools } from "@/data/content";
import { RevealGroup, RevealItem } from "@/components/effects/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Icon } from "@/components/ui/icon";

/** Tools & platforms proficiency cards. */
export function Tools() {
  return (
    <section id="tools" className="section relative overflow-hidden">
      <div className="container">
        <SectionHeading
          eyebrow="Ecosystem"
          title="Platforms & Tools I Work With"
          description="Deep hands-on experience across the platforms where modern digital crime happens — and where recovery happens."
        />

        <RevealGroup className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9">
          {tools.map((tool) => (
            <RevealItem key={tool.name}>
              <div className="group glass hover-lift flex flex-col items-center gap-3 rounded-[1.2rem] p-4 text-center sm:p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/10 to-cyan-400/10 text-cyan-500 transition-all duration-500 group-hover:from-blue-600 group-hover:to-cyan-400 group-hover:text-white group-hover:shadow-glow">
                  <Icon name={tool.icon} className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">{tool.name}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {tool.category}
                  </p>
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
