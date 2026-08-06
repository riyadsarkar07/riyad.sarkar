"use client";

import { motion } from "framer-motion";

/**
 * Animated aurora / mesh gradient background with floating blobs,
 * a grid overlay and light rays. Used behind the hero and sections.
 */
export function MeshBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-mesh-blue" />

      {/* Aurora blobs */}
      <motion.div
        className="absolute -left-32 -top-32 h-[34rem] w-[34rem] rounded-full bg-gradient-to-br from-sky-400/25 to-blue-600/20 blur-3xl"
        animate={{ x: [0, 60, -20, 0], y: [0, 40, -30, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-10%] top-1/4 h-[28rem] w-[28rem] rounded-full bg-gradient-to-tr from-cyan-300/20 to-blue-500/15 blur-3xl"
        animate={{ x: [0, -50, 30, 0], y: [0, 30, -40, 0], scale: [1, 1.1, 1.2, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-15%] left-1/3 h-[26rem] w-[26rem] rounded-full bg-gradient-to-br from-indigo-400/15 to-sky-400/15 blur-3xl"
        animate={{ x: [0, 40, -40, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Light rays */}
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-20"
        style={{
          background:
            "conic-gradient(from 0deg at 50% -10%, transparent 0deg, rgba(56,189,248,0.18) 12deg, transparent 30deg, transparent 180deg, rgba(56,189,248,0.14) 200deg, transparent 240deg, rgba(37,99,235,0.12) 300deg, transparent 340deg)",
        }}
      />

      {/* Grid */}
      <div className="bg-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
    </div>
  );
}
