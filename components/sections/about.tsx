"use client";

import { motion } from "framer-motion";
import { Eye, HeartHandshake, Target } from "lucide-react";
import { experience } from "@/data/content";
import { Reveal, RevealGroup, RevealItem } from "@/components/effects/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { SkillBars } from "@/components/sections/skill-bars";
import { SkillRadar } from "@/components/sections/skill-radar";

const pillars = [
  {
    icon: HeartHandshake,
    title: "Mission",
    text: "To help individuals and businesses recover what they have lost and stay ahead of digital threats — with honesty, speed and total confidentiality.",
  },
  {
    icon: Eye,
    title: "Vision",
    text: "A world where no one loses their digital life to hackers, fraud or negligence — where security is simple, premium and available to everyone.",
  },
  {
    icon: Target,
    title: "Approach",
    text: "Methodical forensic analysis, proven recovery workflows and proactive hardening — every engagement treated like the only one that matters.",
  },
];

const timelineIconColor: Record<string, string> = {
  work: "from-blue-600 to-cyan-400",
  education: "from-violet-600 to-indigo-400",
  milestone: "from-emerald-600 to-teal-400",
};

/** Professional story, mission/vision pillars, timeline and skills. */
export function About() {
  return (
    <section id="about" className="section relative overflow-hidden">
      <div className="container">
        <SectionHeading
          eyebrow="About Me"
          title="Protecting Digital Lives, One Account at a Time"
          description="For over 8 years I've helped individuals, creators and businesses recover hacked or lost accounts and build real digital resilience."
        />

        {/* Story + pillars */}
        <div className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <div className="glass gradient-border h-full rounded-3xl p-7 md:p-10">
              <h3 className="mb-4 text-2xl font-bold">The story behind the shield</h3>
              <div className="space-y-4 leading-relaxed text-muted-foreground">
                <p>
                  It started with a friend whose business page was hijacked overnight. Watching a
                  hard-earned digital presence slip away — with no clear path to get it back —
                  changed how I saw security forever.
                </p>
                <p>
                  I dove deep into account forensics, platform verification flows and threat
                  intelligence. I built documented, repeatable recovery processes that now restore
                  Facebook, Instagram, Google, YouTube and Meta Business Manager accounts with a
                  99% success rate.
                </p>
                <p>
                  Today I work as an independent cyber security specialist and digital recovery
                  expert — trusted by 100+ businesses and hundreds of individuals across 25+
                  countries. Every recovery is private, every recommendation is honest, and every
                  client leaves stronger than before.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {["Ethical", "Transparent", "Confidential", "Results-Driven"].map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <RevealGroup className="flex flex-col gap-6">
            {pillars.map((pillar) => (
              <RevealItem key={pillar.title}>
                <div className="group glass flex h-full gap-5 rounded-3xl p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-glow">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-glow transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                    <pillar.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-display text-lg font-bold">{pillar.title}</h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {pillar.text}
                    </p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        {/* Skills */}
        <div className="mt-20 grid gap-8 lg:grid-cols-2">
          <SkillBars />
          <SkillRadar />
        </div>

        {/* Career timeline */}
        <div className="mt-20">
          <Reveal>
            <h3 className="mb-10 text-center text-2xl font-bold md:text-3xl">
              Career <span className="text-gradient">Timeline</span>
            </h3>
          </Reveal>
          <div className="relative mx-auto max-w-3xl">
            <div className="absolute left-6 top-0 h-full w-px bg-gradient-to-b from-blue-500/50 via-cyan-400/40 to-transparent md:left-1/2" />

            <div className="space-y-10">
              {experience.map((item, index) => {
                const isLeft = index % 2 === 0;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    className="relative pl-16 md:pl-0"
                  >
                    {/* Center node */}
                    <span className="absolute left-6 top-3 -translate-x-1/2 md:left-1/2">
                      <span
                        className={`block h-5 w-5 rounded-full bg-gradient-to-br ${timelineIconColor[item.type] ?? "from-blue-600 to-cyan-400"} shadow-glow`}
                      />
                    </span>

                    <div
                      className={`glass rounded-2xl p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-glow-lg md:w-[calc(50%-2.5rem)] ${
                        isLeft ? "md:mr-auto" : "md:ml-auto"
                      }`}
                    >
                      <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {item.period}
                      </span>
                      <h4 className="mt-2 font-display text-lg font-bold">{item.role}</h4>
                      <p className="mt-0.5 text-sm font-medium text-cyan-500">{item.company}</p>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
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
      </div>
    </section>
  );
}
