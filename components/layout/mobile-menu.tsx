"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, Menu, UserRound, X } from "lucide-react";
import { navItems } from "@/data/content";
import { useI18n } from "@/lib/i18n";
import { useLenis } from "@/hooks/use-lenis";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";

/** Slide-in glass drawer for small screens. */
export function MobileMenu() {
  const { t } = useI18n();
  const { lenis } = useLenis();
  const { user } = useSession();
  const [open, setOpen] = useState(false);

  const scrollTo = (href: string) => {
    const id = href.replace("#", "");
    setOpen(false);
    window.setTimeout(() => {
      if (lenis) lenis.scrollTo(`#${id}`, { offset: -88, duration: 1.2 });
      else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[105] bg-slate-950/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="glass-strong fixed right-0 top-0 z-[106] flex h-full w-full max-w-[320px] flex-col overflow-y-auto p-6 pt-20 shadow-glow-lg"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <nav aria-label="Mobile navigation">
                <ul className="flex flex-col gap-1">
                  {navItems.map((item, index) => (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                    >
                      <a
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault();
                          scrollTo(item.href);
                        }}
                        className="group flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        {t.nav[item.labelKey as keyof typeof t.nav]}
                        <span className="h-1.5 w-1.5 rounded-full bg-cyber-400 opacity-0 transition-opacity group-hover:opacity-100" />
                      </a>
                    </motion.li>
                  ))}
                </ul>
              </nav>

              <div className="mt-auto space-y-3">
                <Button
                  asChild
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  <Link href={user ? "/dashboard/appointments/new" : "/login"}>
                    Book Appointment
                  </Link>
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  {user ? (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full"
                      onClick={() => setOpen(false)}
                    >
                      <Link href="/dashboard">
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full"
                      onClick={() => setOpen(false)}
                    >
                      <Link href="/login">
                        <UserRound className="h-4 w-4" /> Login
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => scrollTo("#consultation")}>
                    {t.common.bookConsultation}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
