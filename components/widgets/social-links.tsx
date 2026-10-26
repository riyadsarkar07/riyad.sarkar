"use client";

import {
  Facebook,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";
import { socials } from "@/data/content";
import { cn } from "@/lib/utils";
import { Magnetic } from "@/components/effects/magnetic";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  whatsapp: Phone,
  messenger: MessageCircle,
  email: Mail,
  github: Github,
  linkedin: Linkedin,
  facebook: Facebook,
  instagram: Instagram,
  telegram: Send,
};

/** Compact row of social icon buttons. */
export function SocialLinks({
  size = "md",
  compactGrid = false,
}: {
  size?: "sm" | "md";
  compactGrid?: boolean;
}) {
  const boxSize = size === "sm" ? "h-10 w-10" : "h-11 w-11";
  const items = compactGrid ? socials.filter((social) => social.id !== "messenger") : socials;

  return (
    <div className={compactGrid ? "grid w-max grid-cols-4 gap-2" : "flex flex-wrap items-center gap-2"}>
      {items.map((social) => {
        const Icon = iconMap[social.id] ?? Globe;
        return (
          <Magnetic key={social.id} strength={0.2}>
            <a
              href={social.href}
              target={social.href.startsWith("mailto") ? undefined : "_blank"}
              rel="noopener noreferrer"
              aria-label={social.label}
              className={cn(
                "glass flex items-center justify-center rounded-full text-muted-foreground transition-all duration-200 hover:scale-105 hover:text-primary hover:shadow-glass",
                boxSize,
              )}
            >
              <Icon className="h-4 w-4" />
            </a>
          </Magnetic>
        );
      })}
    </div>
  );
}
