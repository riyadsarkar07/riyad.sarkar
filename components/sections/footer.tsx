"use client";

import { ArrowUp, Globe, Heart, ShieldCheck } from "lucide-react";
import { navItems, profile, services, socials } from "@/data/content";
import { useI18n } from "@/lib/i18n";
import { useLenis } from "@/hooks/use-lenis";
import { Logo } from "@/components/ui/logo";
import { SocialLinks } from "@/components/widgets/social-links";

/** Premium footer with quick links, services and back-to-top. */
export function Footer() {
  const { t } = useI18n();
  const { lenis } = useLenis();

  const scrollTo = (href: string) => {
    const id = href.replace("#", "");
    if (lenis) lenis.scrollTo(`#${id}`, { offset: -72, duration: 1.2 });
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-border/60 bg-gradient-to-b from-transparent to-sky-50/60 dark:to-slate-950/60">
      <div className="bg-mesh-blue pointer-events-none absolute inset-0" />
      <div className="container relative pb-10 pt-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                scrollTo("#home");
              }}
              className="flex items-center gap-3"
            >
              <Logo />
              <span className="font-display text-xl font-bold">
                Riyad <span className="text-gradient">Sarkar</span>
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t.footer.tagline}
            </p>
            <div className="mt-5">
              <SocialLinks size="sm" />
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t.footer.quickLinks}
            </h4>
            <ul className="space-y-2.5">
              {navItems.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <a
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo(item.href);
                    }}
                    className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <span className="h-px w-0 bg-primary transition-all duration-300 group-hover:w-3" />
                    {t.nav[item.labelKey as keyof typeof t.nav]}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t.footer.services}
            </h4>
            <ul className="space-y-2.5">
              {services.slice(0, 6).map((service) => (
                <li key={service.id}>
                  <a
                    href="#services"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo("#services");
                    }}
                    className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <span className="h-px w-0 bg-primary transition-all duration-300 group-hover:w-3" />
                    {service.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact info */}
          <div>
            <h4 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t.contact.title}
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-cyan-500" />
                {profile.location}
              </li>
              <li>
                <a
                  href={`mailto:${profile.email}`}
                  className="transition-colors hover:text-primary"
                >
                  {profile.email}
                </a>
              </li>
              <li>
                <a
                  href={socials[0].href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-primary"
                >
                  {profile.whatsapp}
                </a>
              </li>
            </ul>
            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
              All consultations handled with strict confidentiality.
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-5 border-t border-border/60 pt-7 sm:flex-row">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            © {year} {profile.name}. {t.footer.rights}
          </p>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                scrollTo("#home");
              }}
              className="transition-colors hover:text-primary"
            >
              {t.footer.privacy}
            </a>
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                scrollTo("#home");
              }}
              className="transition-colors hover:text-primary"
            >
              {t.footer.terms}
            </a>
            <span className="flex items-center gap-1.5">
              {t.footer.madeWith} <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
            </span>
          </div>
        </div>
      </div>

      {/* Back to top */}
      <button
        onClick={() => {
          if (lenis) lenis.scrollTo(0, { duration: 1.4 });
          else window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className="group fixed bottom-6 left-6 z-[90] flex h-11 w-11 items-center justify-center rounded-full glass text-muted-foreground shadow-glow-lg transition-all duration-300 hover:text-primary hover:scale-110"
        aria-label={t.common.backToTop}
      >
        <ArrowUp className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-1" />
      </button>
    </footer>
  );
}
