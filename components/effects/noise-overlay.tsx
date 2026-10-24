/** Fixed film-grain noise overlay for a premium textured finish. */
export function NoiseOverlay() {
  return (
    <div
      className="noise-overlay pointer-events-none fixed inset-0 z-[60] opacity-[0.025] dark:opacity-[0.04]"
      aria-hidden
    />
  );
}
