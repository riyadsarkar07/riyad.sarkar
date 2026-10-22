import { type ReactNode } from "react";

/**
 * Scroll parallax disabled. Nested mouse + scroll transforms were
 * rotating the portrait and adding extra compositing work.
 */
export function Parallax({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  offset?: number;
}) {
  return <div className={className}>{children}</div>;
}
