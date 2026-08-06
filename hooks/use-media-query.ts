"use client";

import { useEffect, useState } from "react";

/** Reactive media-query hook. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** Convenience — desktop pointer (fine). */
export function useFinePointer(): boolean {
  return useMediaQuery("(pointer: fine)");
}
