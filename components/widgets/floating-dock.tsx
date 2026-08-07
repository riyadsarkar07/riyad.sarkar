"use client";

import { motion } from "framer-motion";
import {
  Command,
  Home,
  MessageCircle,
  Star,
  Briefcase,
} from "lucide-react";
import { useLenis } from "@/hooks/use-lenis";
import { useToast } from "@/lib/toast";

const dockItems = [
  { id: "home", icon: Home, label: "Home", action: "#home" },
  { id: "services", icon: Briefcase, label: "Services", action: "#services" },
  { id: "achievements", icon: Star, label: "Achievements", action: "#achievements" },
  { id: "consultation", icon: MessageCircle, label: "Consultation", action: "#consultation" },
];

/**
 * Floating glass dock with magnetic hover expansion.
 * Activates after scrolling past the hero.
 */
export function FloatingDock() {
  const { lenis } = useLenis();
  const { toast } = useToast();

  const run = (item: (typeof dockItems)[number]) => {
    if (item.action.startsWith("#")) {
      const id = item.action.slice(1);
      if (lenis) lenis.scrollTo(`#${id}`, { offset: -72, duration: 1.1 });
      else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      toast("info", item.label);
    }
  };

  return (
    <motion.div
      initial={{ y: 90 }}
      animate={{ y: 0 }}
      transition={{ delay: 1.6, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-6 left-1/2 z-[92] hidden -translate-x-1/2 md:block"
      aria-label="Quick navigation dock"
    >
      <div className="glass-strong flex items-center gap-1.5 rounded-full p-1.5 shadow-glow-lg transition-shadow duration-300 hover:shadow-glow">
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
