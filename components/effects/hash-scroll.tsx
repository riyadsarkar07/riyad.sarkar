"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLenis } from "@/hooks/use-lenis";

/** Honours homepage hashes and sends leftover #consultation traffic to the dedicated page. */
export function HashScroll() {
  const { lenis } = useLenis();
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    if (hash === "#consultation") {
      router.replace("/consultation");
      return;
    }
    const timer = window.setTimeout(() => {
      if (lenis) lenis.scrollTo(hash, { offset: -88, duration: 1.1 });
      else document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [lenis, router]);

  return null;
}
