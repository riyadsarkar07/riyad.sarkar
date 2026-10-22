/**
 * Static cyber grid overlay. Animated streaks and panning were
 * removed to cut GPU work on the first screen.
 */
export function CyberGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_70%)]" />
    </div>
  );
}
