"use client";

import { usePathname } from "next/navigation";

const PORTAL_PREFIXES = [
  "/dashboard",
  "/admin",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth",
];

function isPortalPath(pathname: string): boolean {
  return PORTAL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Hides the portfolio marketing chrome (navbar, footer, AI assistant,
 * dock, etc.) on the authenticated portal routes so they don't overlap
 * the sidebar layouts.
 */
export function PortfolioChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isPortalPath(pathname)) return null;
  return <>{children}</>;
}
