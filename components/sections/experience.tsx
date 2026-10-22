"use client";

import { motion } from "framer-motion";
import { Briefcase, GraduationCap, Sparkles } from "lucide-react";
import { experience } from "@/data/content";
import { SectionHeading } from "@/components/ui/section-heading";

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

        <div className="relative mx-auto mt-16 max-w-4xl">
          {/* Vertical line */}
          <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-blue-600/50 via-cyan-400/40 to-transparent sm:left-1/2 sm:-translate-x-1/2" />

          <div className="space-y-12">
            {experience.map((item, index) => {
              const meta = typeMeta[item.type];
              const IconComp = meta.icon;
              const isLeft = index % 2 === 0;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-70px" }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="relative pl-14 sm:pl-0"
                >
                  {/* Node */}
                  <div className="absolute left-0 top-2 sm:left-1/2 sm:-translate-x-1/2">
                    <div className="relative">
                      <span className="absolute -inset-2 rounded-full bg-cyan-400/20 animate-pulse-ring" />
                      <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-white shadow-glow">
                        <IconComp className="h-5 w-5" />
                      </span>
                    </div>
                  </div>

                  <div
                    className={`group glass rounded-3xl p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-glow-lg sm:w-[calc(50%-3rem)] sm:p-7 ${
                      isLeft ? "sm:mr-auto" : "sm:ml-auto"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-3 py-1 text-xs font-bold text-white shadow-glow">
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
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
