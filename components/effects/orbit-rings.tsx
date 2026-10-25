/**
 * Orbiting rings around the portrait. CSS transforms only.
 * On phones a single dashed ring keeps the face uncluttered.
 */
export function OrbitRings() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <span className="absolute inset-[7%] rounded-full border border-cyan-300/30 sm:inset-[5%] sm:border-cyan-300/22 motion-reduce:animate-none sm:animate-spin-slow" />
      <span className="absolute inset-[15%] hidden rounded-full border border-dashed border-sky-400/28 motion-reduce:animate-none animate-spin-reverse sm:block sm:inset-[11%]" />
      <span className="absolute inset-[21%] hidden rounded-full border border-cyan-300/10 sm:block" />

      <span className="absolute inset-[7%] hidden motion-reduce:animate-none animate-orbit-dot sm:block sm:inset-[5%]">
        <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-400/80" />
      </span>
      <span
        className="absolute inset-[11%] hidden motion-reduce:animate-none animate-orbit-dot sm:block"
        style={{ animationDuration: "18s", animationDirection: "reverse" }}
      >
        <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-sky-400/80" />
      </span>
      <span
        className="absolute inset-[16%] hidden motion-reduce:animate-none animate-orbit-dot lg:block"
        style={{ animationDuration: "22s" }}
      >
        <span className="absolute left-1/2 top-0 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-500/90" />
      </span>
    </div>
  );
}
