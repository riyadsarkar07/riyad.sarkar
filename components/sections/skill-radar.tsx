"use client";

import { motion } from "framer-motion";
import { radarSkills } from "@/data/content";
import { Reveal } from "@/components/effects/reveal";

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = 110;
const LEVELS = 4;

function polar(index: number, total: number, radius: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

function polygonPath(values: number[], total: number) {
  return values
    .map((value, index) => {
      const { x, y } = polar(index, total, (RADIUS * value) / 100);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ") + " Z";
}

/** Interactive SVG radar chart of core security skills. */
export function SkillRadar() {
  const total = radarSkills.length;

  const gridPaths = Array.from({ length: LEVELS }, (_, i) => {
    const values = radarSkills.map(() => ((i + 1) / LEVELS) * 100);
    return polygonPath(values, total);
  });

  const valuePath = polygonPath(
    radarSkills.map((s) => s.value),
    total,
  );

  const labels = radarSkills.map((skill, index) => {
    const { x, y } = polar(index, total, RADIUS + 34);
    return { ...skill, x, y };
  });

  return (
    <div className="glass gradient-border rounded-[1.35rem] p-6 sm:p-8">
      <Reveal>
        <h3 className="mb-1 text-2xl font-bold">Skill Radar</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Core capabilities across the security spectrum.
        </p>
      </Reveal>

      <div className="flex items-center justify-center">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-auto w-full max-w-[360px] overflow-visible"
          role="img"
          aria-label="Security skills radar chart"
        >
          {gridPaths.map((path, i) => (
            <path key={i} d={path} fill="none" stroke="rgba(14,165,233,0.15)" strokeWidth="1" />
          ))}

          {/* Axis lines */}
          {radarSkills.map((_, index) => {
            const { x, y } = polar(index, total, RADIUS);
            return (
              <line
                key={index}
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                stroke="rgba(14,165,233,0.12)"
                strokeWidth="1"
              />
            );
          })}

          {/* Data polygon */}
          <motion.path
            d={valuePath}
            fill="rgba(14,165,233,0.22)"
            stroke="url(#radarGradient)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          />
          <defs>
            <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {/* Dots */}
          {radarSkills.map((skill, index) => {
            const { x, y } = polar(index, total, (RADIUS * skill.value) / 100);
            return (
              <motion.circle
                key={skill.label}
                cx={x}
                cy={y}
                r="4"
                fill="#38bdf8"
                stroke="#fff"
                strokeWidth="1.5"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + index * 0.05 }}
              />
            );
          })}

          {/* Labels */}
          {labels.map((label) => (
            <text
              key={label.label}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-[11px] font-semibold"
            >
              {label.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
