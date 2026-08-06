"use client";

import {
  Facebook,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Timer,
} from "lucide-react";
import { socials, profile } from "@/data/content";
import { useI18n } from "@/lib/i18n";
import { RevealGroup, RevealItem } from "@/components/effects/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
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

const styleMap: Record<string, string> = {
  whatsapp: "from-emerald-500 to-teal-500",
  messenger: "from-blue-500 to-indigo-500",
  email: "from-sky-500 to-blue-600",
  github: "from-slate-600 to-slate-800",
  linkedin: "from-blue-600 to-sky-500",
  facebook: "from-blue-600 to-indigo-600",
  instagram: "from-fuchsia-500 to-pink-500",
  telegram: "from-cyan-500 to-sky-600",
};

/** Contact — luxury glass card with all social platforms. */
export function Contact() {
  const { t } = useI18n();

  return (
    <section id="contact" className="section relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="container relative">
        <SectionHeading
          eyebrow="Contact"
          title={t.contact.title}
          description={t.contact.subtitle}
        />

        <RevealGroup className="mx-auto mt-14 max-w-5xl">
          <div className="glass gradient-border rounded-3xl p-8 md:p-12">
            <div className="mb-10 grid gap-6 sm:grid-cols-2">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-glow">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Location
                  </p>
                  <p className="font-display text-lg font-bold">{t.contact.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-glow">
                  <Timer className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.contact.response}
                  </p>
                  <p className="font-display text-lg font-bold">{t.contact.responseValue}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {socials.map((social) => {
                const Icon = iconMap[social.id] ?? Globe;
                const gradient = styleMap[social.id] ?? "from-blue-600 to-cyan-400";
                return (
                  <RevealItem key={social.id}>
                    <Magnetic strength={0.15}>
                      <a
                        href={social.href}
                        target={social.href.startsWith("mailto") ? undefined : "_blank"}
                        rel="noopener noreferrer"
                        className="group glass flex items-center gap-4 rounded-2xl p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-glow-lg"
                      >
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-display font-bold">{social.label}</p>
                          <p className="truncate text-xs text-muted-foreground">{social.href}</p>
                        </div>
                        <Send className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-primary" />
                      </a>
                    </Magnetic>
                  </RevealItem>
                );
              })}
            </div>

            <div className="mt-10 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
              <p className="text-sm font-medium text-foreground">
                {t.hero.verified} · <span className="text-gradient font-bold">{profile.name}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {profile.role} — {t.hero.location}
              </p>
            </div>
          </div>
        </RevealGroup>
      </div>
    </section>
  );
}
