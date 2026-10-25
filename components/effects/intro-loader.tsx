"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader } from "@/components/effects/loader";
import { prefersReducedMotion } from "@/lib/utils";

const BOOT_KEY = "rs-boot-shown";

/**
 * Full-screen intro loader for the public homepage only.
 * Skipped on auth, booking, admin, portal routes, and when reduced-motion is set.
 */
export function IntroLoader() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return <HomeBootLoader />;
}

function HomeBootLoader() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    try {
      if (prefersReducedMotion() || sessionStorage.getItem(BOOT_KEY)) {
        setShow(false);
      }
    } catch {
      setShow(false);
    }
  }, []);

  if (!show) return null;

  return (
    <Loader
      onComplete={() => {
        try {
          sessionStorage.setItem(BOOT_KEY, "1");
        } catch {
          /* ignore */
        }
      }}
    />
  );
}
