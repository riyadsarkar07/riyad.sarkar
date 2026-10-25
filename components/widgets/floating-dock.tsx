"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Command,
  Home,
  MessagesSquare,
  Briefcase,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { useSectionNav } from "@/hooks/use-section-nav";

const dockItems = [
  { id: "home", icon: Home, label: "Home", action: "#home" },
  { id: "services", icon: Briefcase, label: "Services", action: "#services" },
];

/**
 * Floating glass dock with magnetic hover expansion.
 * Activates after scrolling past the hero.
 */
export function FloatingDock() {
  const { toast } = useToast();
  const { user } = useSession();
  const { t } = useI18n();
  const { go } = useSectionNav();
  const supportHref = user ? "/dashboard/support" : "/login?next=/dashboard/support";

  const run = (item: (typeof dockItems)[number]) => {
    if (item.action.startsWith("#")) {
      go(item.action, -72);
    } else {
      toast("info", item.label);
    }
  };

  return (
    <motion.div
      initial={{ y: 90 }}
      animate={{ y: 0 }}
      transition={{ delay: 1.6, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto fixed bottom-6 left-1/2 z-[80] hidden -translate-x-1/2 2xl:block"
      aria-label="Quick navigation dock"
    >
      <div       className="glass-strong flex items-center gap-1.5 rounded-full p-1.5 shadow-glass-lg">
        {dockItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => run(item)}
            whileHover={{ y: -8, scale: 1.12 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="group relative flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
            aria-label={item.label}
          >
            <item.icon className="icon-glow h-5 w-5" />
            <span className="pointer-events-none absolute -top-9 whitespace-nowrap rounded-lg glass-strong px-2.5 py-1 text-[11px] font-semibold opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:opacity-100">
              {item.label}
            </span>
          </motion.button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <Link href={supportHref} aria-label={t.common.supportInbox}>
          <motion.span
            whileHover={{ y: -8, scale: 1.12 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="group relative flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
          >
            <MessagesSquare className="icon-glow h-5 w-5" />
            <span className="pointer-events-none absolute -top-9 whitespace-nowrap rounded-lg glass-strong px-2.5 py-1 text-[11px] font-semibold opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:opacity-100">
              {t.common.supportInbox}
            </span>
          </motion.span>
        </Link>
        <Link href="/consultation" aria-label={t.common.bookConsultation}>
          <motion.span
            whileHover={{ y: -8, scale: 1.12 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="group relative flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
          >
            <CalendarDays className="icon-glow h-5 w-5" />
            <span className="pointer-events-none absolute -top-9 whitespace-nowrap rounded-lg glass-strong px-2.5 py-1 text-[11px] font-semibold opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:opacity-100">
              {t.common.bookConsultation}
            </span>
          </motion.span>
        </Link>
        <span className="mx-1 h-5 w-px bg-border" />
        <motion.button
          onClick={() => {
            toast("info", "Press Cmd/Ctrl + K for the command palette");
          }}
          whileHover={{ y: -8, scale: 1.12 }}
          whileTap={{ scale: 0.94 }}
          className="group relative flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
          aria-label="Command palette"
        >
          <Command className="icon-glow h-5 w-5" />
          <span className="pointer-events-none absolute -top-9 whitespace-nowrap rounded-lg glass-strong px-2.5 py-1 text-[11px] font-semibold opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:opacity-100">
            Command palette
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}
