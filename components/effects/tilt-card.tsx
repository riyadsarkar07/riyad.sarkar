"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTilt } from "@/hooks/use-tilt";
import { Spotlight } from "@/components/effects/spotlight";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  spotlight?: boolean;
}

/**
 * 3D tilt card with optional interactive spotlight overlay.
 */
export function TiltCard({
  children,
  className,
  maxTilt = 7,
  spotlight = true,
}: TiltCardProps) {
  const { ref, onPointerMove, onPointerLeave } = useTilt(maxTilt);

  const card = (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={cn("tilt-card group relative overflow-hidden", className)}
      style={{ transition: "transform 0.18s ease-out, box-shadow 0.5s ease" }}
    >
      {children}
    </div>
  );

  if (!spotlight) return card;

  return (
    <Spotlight className="h-full rounded-[1.35rem]" size={360}>
      {card}
    </Spotlight>
  );
}
