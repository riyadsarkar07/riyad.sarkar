"use client";

import { useEffect, useState } from "react";

/**
 * Scroll-spy hook: returns the id of the section currently in view.
 * Pass the array of section ids; the closest one above the viewport
 * midpoint wins.
 */
export function useScrollSpy(ids: string[], offset = 120): string {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const handler = () => {
      const scrollPosition = window.scrollY + offset;
      let current = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollPosition) {
          current = id;
        }
      }
      setActiveId(current);
    };
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, [ids, offset]);

  return activeId;
}
