/**
 * Subtle ring around the portrait. Continuous orbit particles were
 * removed so the face stays the visual focus.
 */
export function OrbitRings() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <span className="absolute inset-[8%] rounded-full border border-dashed border-cyan-300/25" />
      <span className="absolute inset-[14%] rounded-full border border-cyan-300/15" />
    </div>
  );
}
