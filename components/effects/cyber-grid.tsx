"use client";

/**
 * Animated cyber grid with a perspective floor, pan, and scan sweep.
 */
export function CyberGrid({ className }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`} aria-hidden>
      <div className="bg-grid absolute inset-0 opacity-30 motion-reduce:animate-none sm:opacity-50 sm:animate-grid-pan [mask-image:radial-gradient(ellipse_at_center,black_18%,transparent_72%)]" />
      <div className="perspective-grid absolute inset-x-[-10%] bottom-[-18%] h-[52%] opacity-40 motion-reduce:opacity-20" />
      <span className="absolute inset-x-[10%] top-0 hidden h-px bg-gradient-to-r from-transparent via-cyan-400/55 to-transparent motion-reduce:animate-none animate-scan-sweep sm:block" />
      <span className="absolute left-[18%] top-0 hidden h-full w-px bg-gradient-to-b from-transparent via-sky-400/20 to-transparent motion-reduce:animate-none animate-grid-pulse sm:block" />
      <span className="absolute right-[22%] top-0 hidden h-full w-px bg-gradient-to-b from-transparent via-cyan-400/18 to-transparent motion-reduce:animate-none animate-grid-pulse sm:block" style={{ animationDelay: "-1.6s" }} />
    </div>
  );
}
