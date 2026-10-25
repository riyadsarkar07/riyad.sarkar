"use client";

/**
 * Animated cyber grid with a perspective floor, pan, and scan sweep.
 */
export function CyberGrid({ className }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`} aria-hidden>
      <div className="bg-grid absolute inset-0 opacity-25 motion-reduce:animate-none sm:opacity-40 sm:animate-grid-pan [mask-image:radial-gradient(ellipse_at_center,black_18%,transparent_72%)]" />
      <div className="perspective-grid absolute inset-x-[-10%] bottom-[-18%] h-[48%] opacity-28 motion-reduce:opacity-12" />
      <span className="absolute inset-x-[18%] top-0 hidden h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent motion-reduce:animate-none animate-scan-sweep sm:block" />
    </div>
  );
}
