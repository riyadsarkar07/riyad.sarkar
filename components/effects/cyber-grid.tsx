/**
 * Cyber grid overlay with a slow pan and a single sweeping scan line.
 * CSS-only — no JS loops.
 */
export function CyberGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="bg-grid absolute inset-0 opacity-25 sm:opacity-40 motion-reduce:animate-none sm:animate-grid-pan [mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_70%)]" />
      <span className="absolute inset-x-[12%] top-0 hidden h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent motion-reduce:animate-none animate-scan-sweep sm:block" />
    </div>
  );
}
