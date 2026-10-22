import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
}

/**
 * Magnetic hover removed. Renders children without mouse tracking so
 * clickable controls keep the native pointer and stay accessible.
 */
export function Magnetic({ children, className }: MagneticButtonProps) {
  return <div className={cn("inline-block", className)}>{children}</div>;
}
