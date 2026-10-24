"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, LayoutDashboard, Menu, MessagesSquare, UserRound, X } from "lucide-react";
import { navItems } from "@/data/content";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useSectionNav } from "@/hooks/use-section-nav";
import { Button } from "@/components/ui/button";

/** Slide-in glass drawer for small screens. */
export function MobileMenu() {
  const { t } = useI18n();
  const { user } = useSession();
  const { go, hrefFor } = useSectionNav();
  const [open, setOpen] = useState(false);

  const closeAndGo = (target: string) => {
    setOpen(false);
    window.setTimeout(() => go(target), 150);
  };

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 sm:h-11 sm:w-11"
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
              className="glass-strong fixed right-0 top-0 z-[106] flex h-full w-[min(100vw,320px)] flex-col overflow-y-auto p-5 pt-16 shadow-glow-lg sm:p-6 sm:pt-20"
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
                        href={hrefFor(item.href)}
                        onClick={(e) => {
                          e.preventDefault();
                          closeAndGo(item.href);
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
                <Button asChild className="w-full" onClick={() => setOpen(false)}>
                  <Link href="/consultation">
                    <CalendarDays className="h-4 w-4" /> {t.common.bookConsultation}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  <Link href={user ? "/dashboard/support" : "/login?next=/dashboard/support"}>
                    <MessagesSquare className="h-4 w-4" /> {t.common.supportInbox}
                  </Link>
                </Button>
                {user ? (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full"
                    onClick={() => setOpen(false)}
                  >
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-4 w-4" /> {t.common.dashboard}
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
                      <UserRound className="h-4 w-4" /> {t.common.login}
                    </Link>
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
