"use client";

/**
 * Animated aurora mesh. Transform-only CSS motion so blobs stay on
 * the GPU. Pauses automatically under prefers-reduced-motion.
 */
export function MeshBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-mesh-blue" />
      <div className="absolute -left-24 -top-24 h-[16rem] w-[16rem] rounded-full bg-sky-500/12 blur-3xl motion-reduce:animate-none animate-aurora sm:-left-32 sm:-top-32 sm:h-[26rem] sm:w-[26rem]" />
      <div className="absolute right-[-16%] top-[16%] h-[14rem] w-[14rem] rounded-full bg-cyan-400/10 blur-3xl motion-reduce:animate-none animate-aurora-slow sm:h-[20rem] sm:w-[20rem]" />
      <div className="bg-grid absolute inset-0 opacity-20 sm:opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_28%,transparent_75%)]" />
    </div>
  );
}
