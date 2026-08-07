"use client";

/**
 * Rotating 3D ring system around the profile: a counter-rotating dashed
 * ring, two orbiting glow particles and soft energy pulses. Pure CSS —
 * transform-only, GPU accelerated.
 */
export function OrbitRings() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {/* Counter-rotating dashed ring */}
      <span className="animate-spin-reverse absolute inset-[6%] rounded-full border border-dashed border-cyan-300/30" />

      {/* Orbiting glow particle — clockwise */}
      <span className="animate-orbit-dot absolute inset-[4%] rounded-full">
        <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_14px_4px_rgba(56,189,248,0.8)]" />
      </span>

      {/* Orbiting glow particle — counter-clockwise, offset */}
      <span
        className="animate-spin-reverse absolute inset-[14%] rounded-full [animation-duration:10s]"
        style={{ animationDelay: "-2.5s" }}
      >
        <span className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-blue-400 shadow-[0_0_12px_3px_rgba(37,99,235,0.8)]" />
      </span>

      {/* Energy pulses */}
      <span className="animate-pulse-soft absolute inset-[10%] rounded-full border border-cyan-300/50" />
      <span
        className="animate-pulse-soft absolute inset-[10%] rounded-full border border-sky-400/40"
        style={{ animationDelay: "1.7s" }}
      />
    </div>
  );
}
