"use client";

import { Briefcase, GraduationCap, Sparkles } from "lucide-react";
import { experience } from "@/data/content";
import { SectionHeading } from "@/components/ui/section-heading";
import { TimelineItem, TimelineNode, TimelineTrack } from "@/components/effects/timeline";

const typeMeta = {
  work: { icon: Briefcase, badge: "Professional" },
  education: { icon: GraduationCap, badge: "Education" },
  milestone: { icon: Sparkles, badge: "Milestone" },
};

/**
 * Experience — luxury interactive timeline with reveal-on-scroll,
 * hover glow and big typographic years.
 */
export function Experience() {
  return (
    <section id="experience" className="section relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="container relative">
        <SectionHeading
          eyebrow="Experience"
          title="A Career Built on Trust"
          description="From first incident to enterprise-grade defense — a journey measured in recovered accounts and hardened businesses."
        />

        <TimelineTrack align="edge" className="mx-auto mt-16 max-w-4xl">
          <div className="space-y-12">
            {experience.map((item, index) => {
              const meta = typeMeta[item.type];
              const IconComp = meta.icon;
              const isLeft = index % 2 === 0;
              return (
                <TimelineItem key={item.id} index={index} className="relative pl-14 sm:pl-0">
                  <div className="absolute left-0 top-2 sm:left-1/2 sm:-translate-x-1/2">
                    <div className="relative">
                      <TimelineNode className="h-11 w-11">
                        <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white">
                          <IconComp className="h-5 w-5" />
                        </span>
                      </TimelineNode>
                    </div>
                  </div>

                  <div
                    className={`group glass hover-lift rounded-[1.35rem] p-5 sm:w-[calc(50%-3rem)] sm:p-7 ${
                      isLeft ? "sm:mr-auto" : "sm:ml-auto"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                        {item.period}
                      </span>
                      <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                        {meta.badge}
                      </span>
                    </div>
                    <h4 className="mt-4 font-display text-xl font-bold">{item.role}</h4>
                    <p className="mt-1 text-sm font-medium text-cyan-500">{item.company}</p>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {item.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary transition-colors group-hover:bg-primary/15"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </TimelineItem>
              );
            })}
          </div>
        </TimelineTrack>
      </div>
    </section>
  );
}
