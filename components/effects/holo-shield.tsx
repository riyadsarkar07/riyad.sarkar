"use client";

/**
 * Holographic cyber shield — a lightweight SVG with gradient strokes,
 * pulsing glow and a slow counter-rotating dashed orbit ring. Pure CSS,
 * no WebGL. Mounted behind the profile image.
 */
export function HoloShield({ className }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center ${className ?? ""}`}
      aria-hidden
    >
      {/* Counter-rotating dashed orbit */}
      <span className="animate-spin-reverse absolute h-[118%] w-[118%] rounded-full border border-dashed border-cyan-300/25" />

      {/* Floating shield */}
      <div className="animate-float-slow relative h-[58%] w-[58%]">
        <svg
          viewBox="0 0 120 132"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
          style={{ filter: "drop-shadow(0 0 18px rgba(56,189,248,0.45))" }}
        >
          <defs>
            <linearGradient id="holo-stroke" x1="0" y1="0" x2="120" y2="132" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38bdf8" />
              <stop offset="0.5" stopColor="#2563eb" />
              <stop offset="1" stopColor="#0ea5e9" />
            </linearGradient>
            <linearGradient id="holo-fill" x1="60" y1="6" x2="60" y2="126" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38bdf8" stopOpacity="0.22" />
              <stop offset="0.5" stopColor="#2563eb" stopOpacity="0.1" />
              <stop offset="1" stopColor="#0ea5e9" stopOpacity="0.22" />
            </linearGradient>
          </defs>
          <path
            d="M60 6 L106 24 V64 C106 96 88 116 60 126 C32 116 14 96 14 64 V24 Z"
            stroke="url(#holo-stroke)"
            strokeWidth="2"
            strokeLinejoin="round"
            fill="url(#holo-fill)"
            opacity="0.9"
          />
          <path
            d="M60 34 V88 M38 56 H82"
            stroke="url(#holo-stroke)"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.7"
          />
          {/* Cross pulse */}
          <circle cx="60" cy="72" r="20" stroke="#38bdf8" strokeOpacity="0.4" strokeWidth="1.2">
            <animate
              attributeName="r"
              values="14;26;14"
              dur="3.4s"
              repeatCount="indefinite"
            />
            <animate attributeName="stroke-opacity" values="0.5;0;0.5" dur="3.4s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>
    </div>
  );
}
