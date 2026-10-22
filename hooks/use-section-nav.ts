"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLenis } from "@/hooks/use-lenis";

function toHash(target: string): string {
  if (target.startsWith("#")) return target;
  if (target.startsWith("/#")) return target.slice(1);
  return `#${target.replace(/^#/, "")}`;
}

/**
 * Cross-page section navigation: smooth-scroll on the homepage,
 * otherwise route to `/#section` so inner pages still reach the hub.
 */
export function useSectionNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { lenis } = useLenis();

  const hrefFor = (target: string) => {
    if (target.startsWith("/") && !target.startsWith("/#")) return target;
    const hash = toHash(target);
    return pathname === "/" ? hash : `/${hash}`;
  };

  const go = (target: string, offset = -88) => {
    if (target.startsWith("/") && !target.startsWith("/#")) {
      router.push(target);
      return;
    }
    const hash = toHash(target);
    if (pathname === "/") {
      if (lenis) lenis.scrollTo(hash, { offset, duration: 1.2 });
      else document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    router.push(`/${hash}`);
  };

  return { go, hrefFor, pathname };
}
