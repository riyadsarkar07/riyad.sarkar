"use client";

export interface MousePosition {
  x: number;
  y: number;
}

/**
 * Mouse tracking disabled. Returning a static origin avoids
 * re-renders on every pointer move.
 */
export function useMousePosition(_normalized = false): MousePosition {
  return { x: 0, y: 0 };
}
