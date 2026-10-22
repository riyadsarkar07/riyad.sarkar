/**
 * Orbiting rings around the portrait. CSS transforms only.
 * On phones a single dashed ring keeps the face uncluttered.
 */
export function OrbitRings() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <span className="absolute inset-[8%] rounded-full border border-cyan-300/25 sm:inset-[6%] sm:border-cyan-300/20 motion-reduce:animate-none sm:animate-spin-slow" />
      <span className="absolute inset-[16%] hidden rounded-full border border-dashed border-cyan-300/30 motion-reduce:animate-none animate-spin-reverse sm:block sm:inset-[12%]" />
      <span className="absolute inset-[18%] hidden rounded-full border border-cyan-300/15 sm:block" />

      <span className="absolute inset-[8%] hidden motion-reduce:animate-none animate-orbit-dot sm:block sm:inset-[6%]">
        <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-400 shadow-glow" />
      </span>
      <span
        className="absolute inset-[12%] hidden motion-reduce:animate-none animate-orbit-dot sm:block"
        style={{ animationDuration: "16s", animationDirection: "reverse" }}
      >
        <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-sky-500 shadow-glow" />
      </span>
    </div>
  );
}
