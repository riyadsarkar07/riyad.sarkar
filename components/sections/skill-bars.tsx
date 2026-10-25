"use client";

import { motion } from "framer-motion";
import { tools } from "@/data/content";
import { Reveal } from "@/components/effects/reveal";

/** Animated skill / tool proficiency bars. */
export function SkillBars() {
  return (
    <div className="glass gradient-border rounded-[1.35rem] p-6 sm:p-8">
      <Reveal>
        <h3 className="mb-1 text-2xl font-bold">Platform Mastery</h3>
        <p className="mb-8 text-sm text-muted-foreground">
          Hands-on expertise across the platforms and tools I work with daily.
        </p>
      </Reveal>
      <div className="space-y-5">
        {tools.map((tool, index) => (
          <div key={tool.name}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">{tool.name}</span>
              <span className="font-display font-semibold text-primary">{tool.level}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-primary/10">
              <motion.div
                className="relative h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                whileInView={{ width: `${tool.level}%` }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 1.2, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent bg-[length:200%_100%]" />
              </motion.div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
