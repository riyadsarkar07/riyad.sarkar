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
export function SocialLinks({ size = "md" }: { size?: "sm" | "md" }) {
  const boxSize = size === "sm" ? "h-10 w-10" : "h-11 w-11";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {socials.map((social) => {
        const Icon = iconMap[social.id] ?? Globe;
        return (
          <Magnetic key={social.id} strength={0.2}>
            <a
              href={social.href}
              target={social.href.startsWith("mailto") ? undefined : "_blank"}
              rel="noopener noreferrer"
              aria-label={social.label}
              className={cn(
                "glass flex items-center justify-center rounded-full text-muted-foreground transition-all duration-300 hover:scale-110 hover:text-primary hover:shadow-glow",
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
