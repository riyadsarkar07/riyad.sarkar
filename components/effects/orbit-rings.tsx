/**
 * Orbiting rings around the portrait. CSS transforms only — no
 * particle JS — so the face stays sharp and the GPU stays idle.
 */
export function OrbitRings() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <span className="absolute inset-[6%] rounded-full border border-cyan-300/20 motion-reduce:animate-none animate-spin-slow" />
      <span className="absolute inset-[12%] rounded-full border border-dashed border-cyan-300/30 motion-reduce:animate-none animate-spin-reverse" />
      <span className="absolute inset-[18%] rounded-full border border-cyan-300/15" />

      <span className="absolute inset-[6%] motion-reduce:animate-none animate-orbit-dot">
        <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-400 shadow-glow" />
      </span>
      <span
        className="absolute inset-[12%] motion-reduce:animate-none animate-orbit-dot"
        style={{ animationDuration: "16s", animationDirection: "reverse" }}
      >
        <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-sky-500 shadow-glow" />
      </span>
    </div>
  );
}
