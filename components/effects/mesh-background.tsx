"use client";

/**
 * Animated aurora mesh. Transform-only CSS motion so blobs stay on
 * the GPU. Pauses automatically under prefers-reduced-motion.
 */
export function MeshBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-mesh-blue" />
      <div className="absolute -left-24 -top-24 h-[16rem] w-[16rem] rounded-full bg-gradient-to-br from-sky-400/22 to-blue-600/14 blur-xl motion-reduce:animate-none animate-aurora sm:-left-32 sm:-top-32 sm:h-[28rem] sm:w-[28rem] sm:blur-2xl" />
      <div className="absolute right-[-18%] top-[12%] h-[14rem] w-[14rem] rounded-full bg-gradient-to-tr from-cyan-300/16 to-blue-500/10 blur-xl motion-reduce:animate-none animate-aurora-slow sm:right-[-12%] sm:top-[18%] sm:h-[22rem] sm:w-[22rem] sm:blur-2xl" />
      <div
        className="absolute bottom-[-16%] left-1/3 hidden h-[20rem] w-[20rem] rounded-full bg-gradient-to-br from-indigo-400/14 to-sky-400/12 blur-2xl motion-reduce:animate-none animate-aurora sm:block"
        style={{ animationDelay: "-7s" }}
      />
      <div className="bg-grid absolute inset-0 opacity-30 sm:opacity-45 [mask-image:radial-gradient(ellipse_at_center,black_28%,transparent_75%)]" />
    </div>
  );
}
