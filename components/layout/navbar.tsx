"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useScrollSpy } from "@/hooks/use-scroll-spy";
import { navItems, sectionIds } from "@/data/content";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useSectionNav } from "@/hooks/use-section-nav";
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
  const { user, loading: sessionLoading } = useSession();
  const { go, hrefFor, pathname } = useSectionNav();
  const onHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [overHero, setOverHero] = useState(onHome);
  const active = useScrollSpy(sectionIds);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      if (!onHome) {
        setOverHero(false);
        return;
      }
      const hero = document.getElementById("home");
      const threshold = hero ? Math.max(hero.offsetHeight - 96, 160) : window.innerHeight * 0.72;
      setOverHero(y < threshold);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onHome]);

  const overDarkHero = onHome && overHero;
  const onHeroControl = overDarkHero
    ? "text-slate-100 hover:bg-white/10 hover:text-white"
    : undefined;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[100] transition-all duration-500",
        scrolled && !overDarkHero
          ? "glass-strong border-b border-sky-200/50 shadow-glass dark:border-white/10"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <nav
        className={cn(
          "container flex items-center justify-between gap-1.5 transition-[height] duration-500 sm:gap-3",
          scrolled ? "h-14 sm:h-16" : "h-16 sm:h-[72px]",
        )}
        aria-label="Main navigation"
      >
        <Link
          href="/"
          onClick={(e) => {
            if (onHome) {
              e.preventDefault();
              go("#home");
            }
          }}
          className="flex min-w-0 shrink items-center gap-2 sm:gap-3"
          aria-label="Go to home"
        >
          <Logo className="h-8 w-8 sm:h-10 sm:w-10" />
          <span
            className={cn(
              "truncate font-display text-[0.95rem] font-bold tracking-tight sm:text-lg",
              overDarkHero && "text-white",
            )}
          >
            Riyad <span className="text-gradient">Sarkar</span>
          </span>
        </Link>

        <ul className="hidden items-center lg:flex">
          {navItems.map((item) => {
            const isActive = onHome && active === item.id;
            const label = t.nav[item.labelKey as keyof typeof t.nav];
            const compactHidden = ["certificates", "gallery", "faq"].includes(item.id);
            return (
              <li key={item.id} className={compactHidden ? "hidden 2xl:block" : undefined}>
                <a
                  href={hrefFor(item.href)}
                  onClick={(e) => {
                    e.preventDefault();
                    go(item.href);
                  }}
                  className={cn(
                    "relative rounded-full px-2.5 py-2 text-[13px] font-medium transition-colors duration-200 xl:px-3.5",
                    isActive
                      ? "text-primary"
                      : overDarkHero
                        ? "text-slate-200 hover:bg-white/10 hover:text-white"
                        : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
                  )}
                >
                  {label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="nav-link-underline"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <ThemeToggle className={onHeroControl} />
          <LanguageToggle className={onHeroControl} />
          {sessionLoading ? (
            <div className="hidden h-9 w-16 animate-pulse rounded-full bg-primary/10 md:block" />
          ) : user ? (
            <>
              <Button asChild size="sm" variant="ghost" className={cn("hidden md:inline-flex", onHeroControl)}>
                <Link href="/dashboard/support">{t.common.supportInbox}</Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className={cn(
                  "hidden md:inline-flex",
                  overDarkHero && "border-white/25 text-slate-100 hover:border-cyan-300/50 hover:text-white",
                )}
              >
                <Link href="/dashboard">{t.common.dashboard}</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost" className={cn("hidden md:inline-flex", onHeroControl)}>
                <Link href="/login?next=/dashboard/support">{t.common.supportInbox}</Link>
              </Button>
              <Button asChild size="sm" variant="ghost" className={cn("hidden md:inline-flex", onHeroControl)}>
                <Link href="/login">{t.common.login}</Link>
              </Button>
            </>
          )}
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/consultation">{t.common.bookConsultation}</Link>
          </Button>
          <MobileMenu triggerClassName={onHeroControl} />
        </div>
      </nav>
    </header>
  );
}
