"use client";

/**
 * Animated aurora mesh. Transform-only CSS motion so blobs stay on
 * the GPU. Pauses automatically under prefers-reduced-motion.
 */
export function MeshBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-mesh-blue" />
      <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-sky-400/24 to-blue-600/16 blur-2xl motion-reduce:animate-none animate-aurora" />
      <div className="absolute right-[-12%] top-[18%] h-[22rem] w-[22rem] rounded-full bg-gradient-to-tr from-cyan-300/18 to-blue-500/12 blur-2xl motion-reduce:animate-none animate-aurora-slow" />
      <div
        className="absolute bottom-[-14%] left-1/3 h-[20rem] w-[20rem] rounded-full bg-gradient-to-br from-indigo-400/14 to-sky-400/12 blur-2xl motion-reduce:animate-none animate-aurora"
        style={{ animationDelay: "-7s" }}
      />
      <div className="bg-grid absolute inset-0 opacity-45 [mask-image:radial-gradient(ellipse_at_center,black_28%,transparent_75%)]" />
    </div>
  );
}
