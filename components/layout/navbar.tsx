"use client";

import { useEffect, useState } from "react";
import { useLenis } from "@/hooks/use-lenis";
import { useScrollSpy } from "@/hooks/use-scroll-spy";
import { navItems, sectionIds } from "@/data/content";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

/**
 * Sticky glass navigation bar with scroll-spy highlighting,
 * theme & language toggles and a mobile menu.
 */
export function Navbar() {
  const { t } = useI18n();
  const { lenis } = useLenis();
  const [scrolled, setScrolled] = useState(false);
  const active = useScrollSpy(sectionIds);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href: string) => {
    const id = href.replace("#", "");
    if (lenis) {
      lenis.scrollTo(`#${id}`, { offset: -88, duration: 1.2 });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[100] transition-all duration-500",
        scrolled ? "glass-strong shadow-glass" : "border-b border-transparent bg-transparent",
      )}
    >
      <nav
        className="container flex h-[72px] items-center justify-between gap-4"
        aria-label="Main navigation"
      >
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            scrollTo("#home");
          }}
          className="flex items-center gap-3"
          aria-label="Go to home"
        >
          <Logo />
          <span className="hidden font-display text-lg font-bold tracking-tight sm:block">
            Riyad <span className="text-gradient">Sarkar</span>
          </span>
        </a>

        <ul className="hidden items-center gap-0.5 lg:flex">
          {navItems.map((item) => {
            const isActive = active === item.id;
            const label = t.nav[item.labelKey as keyof typeof t.nav];
            return (
              <li key={item.id}>
                <a
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(item.href);
                  }}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 shadow-glow" />
                  )}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <LanguageToggle />
          <Button size="sm" className="hidden md:inline-flex" onClick={() => scrollTo("#consultation")}>
            {t.common.bookConsultation}
          </Button>
          <MobileMenu />
        </div>
      </nav>
    </header>
  );
}
