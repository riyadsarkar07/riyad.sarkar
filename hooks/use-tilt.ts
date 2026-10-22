"use client";

import { useRef } from "react";

/**
 * 3D tilt disabled. Returning a static transform avoids mousemove
 * re-renders on every service and certificate card.
 */
export function useTilt(_maxTilt = 10) {
  const ref = useRef<HTMLDivElement>(null);
  return {
    ref,
    transform: "none",
  };
}
