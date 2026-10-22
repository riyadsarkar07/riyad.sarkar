/**
 * Static aurora / mesh gradient. CSS blobs replace continuous
 * Framer Motion loops so the hero stays smooth while scrolling.
 */
export function MeshBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-mesh-blue" />
      <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-sky-400/22 to-blue-600/16 blur-3xl" />
      <div className="absolute right-[-10%] top-1/4 h-[22rem] w-[22rem] rounded-full bg-gradient-to-tr from-cyan-300/16 to-blue-500/12 blur-3xl" />
      <div className="absolute bottom-[-12%] left-1/3 h-[20rem] w-[20rem] rounded-full bg-gradient-to-br from-indigo-400/12 to-sky-400/12 blur-3xl" />
      <div className="bg-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
    </div>
  );
}
