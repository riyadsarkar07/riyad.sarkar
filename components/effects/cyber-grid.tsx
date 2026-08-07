"use client";

/**
 * Animated cyber grid with drifting light streaks. Pure CSS — GPU
 * accelerated, pointer-events none, lightweight.
 */
export function CyberGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Animated grid */}
      <div className="bg-grid animate-grid-pan absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_70%)]" />

      {/* Light streaks */}
      <span className="light-streak animate-light-streak left-[-20%] top-[22%] w-64" />
      <span className="light-streak animate-light-streak left-[-20%] top-[58%] w-72 [animation-delay:3.2s]" />
      <span className="light-streak animate-light-streak left-[-20%] top-[82%] w-56 [animation-delay:6.1s]" />
    </div>
  );
}
