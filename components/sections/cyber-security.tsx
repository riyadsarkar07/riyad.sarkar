"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Activity, Fingerprint, ShieldCheck, Building2, Radar } from "lucide-react";
import { Reveal } from "@/components/effects/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

const ShieldCanvas = dynamic(
  () => import("@/components/three/shield-3d").then((m) => m.ShieldCanvas),
  { ssr: false },
);

const defensePillars = [
  {
    icon: Fingerprint,
    title: "Digital Protection",
    text: "Lock down your accounts, passwords and exposure with modern security hygiene.",
  },
  {
    icon: ShieldCheck,
    title: "Identity Security",
    text: "Protect your digital identity across social platforms, email and the web.",
  },
  {
    icon: Building2,
    title: "Business Security",
    text: "Enterprise-grade protection for teams, brands, ad accounts and assets.",
  },
];

/** Animated cyber threat network diagram. */
function NetworkDiagram() {
  const nodes = [
    { x: 50, y: 50, label: "You", type: "core" },
    { x: 25, y: 25, label: "Email" },
    { x: 25, y: 75, label: "Social" },
    { x: 75, y: 25, label: "Banking" },
    { x: 75, y: 75, label: "Cloud" },
    { x: 50, y: 10, label: "2FA" },
    { x: 50, y: 90, label: "VPN" },
  ];

  const links = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [1, 5],
    [2, 5],
    [3, 6],
    [4, 6],
  ];

  return (
    <div className="glass gradient-border relative overflow-hidden rounded-3xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Radar className="h-5 w-5 text-cyan-500" />
        <h3 className="font-display text-lg font-bold">Threat Defense Network</h3>
      </div>
      <svg viewBox="0 0 100 100" className="w-full" role="img" aria-label="Security network diagram">
        <defs>
          <linearGradient id="netGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>

        {links.map(([from, to], index) => {
          const a = nodes[from];
          const b = nodes[to];
          return (
            <motion.line
              key={index}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="url(#netGrad)"
              strokeWidth="0.5"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 0.7 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: index * 0.08 }}
            />
          );
        })}

        {nodes.map((node, index) => {
          const isCore = node.type === "core";
          return (
            <g key={node.label}>
              {isCore && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r="8"
                  fill="rgba(14,165,233,0.15)"
                  animate={{ r: [8, 12, 8], opacity: [0.6, 0.1, 0.6] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              )}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={isCore ? 5 : 3.5}
                fill={isCore ? "#0ea5e9" : "#38bdf8"}
                stroke="#fff"
                strokeWidth="0.8"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              />
              <text
                x={node.x}
                y={node.y + (node.y > 55 ? 6 : -6)}
                textAnchor="middle"
                className="fill-muted-foreground text-[5px] font-semibold"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Cyber security section — 3D shield + network diagram + defense pillars. */
export function CyberSecurity() {
  return (
    <section id="security" className="section relative overflow-hidden">
      <div className="container">
        <SectionHeading
          eyebrow="Cyber Security"
          title="Layered Defense, Zero Compromise"
          description="A modern, layered security posture that protects your accounts, identity and business from every angle."
        />

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          {/* 3D shield */}
          <Reveal className="order-2 lg:order-1">
            <div className="relative mx-auto flex h-[320px] max-w-md items-center justify-center sm:h-[380px]">
              <div className="pointer-events-none absolute inset-0 bg-mesh-blue" />
              <div className="absolute inset-10 rounded-full border border-cyan-300/20" />
              <ShieldCanvas />
              <motion.div
                className="glass-strong absolute left-2 top-8 flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow-glow sm:left-0"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Activity className="h-4 w-4 text-cyan-500" />
                Shield Active
              </motion.div>
              <motion.div
                className="glass-strong absolute bottom-8 right-2 flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow-glow sm:right-0"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Monitored
              </motion.div>
            </div>
          </Reveal>

          {/* Right column */}
          <div className="order-1 space-y-6 lg:order-2">
            <NetworkDiagram />

            <Reveal delay={0.15}>
              <div className="grid gap-4 sm:grid-cols-3">
                {defensePillars.map((pillar) => (
                  <div
                    key={pillar.title}
                    className="group glass rounded-2xl p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-glow"
                  >
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-glow transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                      <pillar.icon className="h-5 w-5" />
                    </div>
                    <h4 className="font-display text-sm font-bold">{pillar.title}</h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {pillar.text}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
