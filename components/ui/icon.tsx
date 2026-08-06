"use client";

import {
  Activity,
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  Cloud,
  Copyright,
  Facebook,
  Fingerprint,
  Github,
  Globe,
  Instagram,
  Lock,
  Mail,
  Megaphone,
  Monitor,
  Network,
  ScanLine,
  Scale,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Star,
  Terminal,
  UserX,
  Youtube,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  activity: Activity,
  award: Award,
  badgeCheck: BadgeCheck,
  briefcase: Briefcase,
  building2: Building2,
  cloud: Cloud,
  cloudflare: Cloud,
  copyright: Copyright,
  facebook: Facebook,
  fingerprint: Fingerprint,
  github: Github,
  globe: Globe,
  instagram: Instagram,
  lock: Lock,
  mail: Mail,
  megaphone: Megaphone,
  network: Network,
  scanLine: ScanLine,
  scale: Scale,
  server: Server,
  shield: Shield,
  shieldAlert: ShieldAlert,
  shieldCheck: ShieldCheck,
  siren: Siren,
  star: Star,
  userX: UserX,
  youtube: Youtube,
  /* tools */
  meta: Facebook,
  google: Globe,
  microsoft: Monitor,
  aws: Cloud,
  linux: Terminal,
  windows: Monitor,
  workspace: Briefcase,
};

/** Resolves a string icon key to a Lucide icon component. */
export function getIcon(name: string): LucideIcon {
  return iconMap[name] ?? ShieldCheck;
}

export function Icon({ name, className }: { name: string; className?: string }) {
  const IconComponent = getIcon(name);
  return <IconComponent className={className} />;
}

export type { LucideIcon };
