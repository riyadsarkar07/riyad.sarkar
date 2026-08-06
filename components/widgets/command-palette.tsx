"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Command, FileText, Home, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { services, navItems, blogPosts } from "@/data/content";
import { useI18n } from "@/lib/i18n";
import { useLenis } from "@/hooks/use-lenis";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

/** Cmd/Ctrl+K command palette with search across sections, services and posts. */
export function CommandPalette() {
  const { t } = useI18n();
  const router = useRouter();
  const { lenis } = useLenis();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const scrollTo = (href: string) => {
    const id = href.replace("#", "");
    setOpen(false);
    window.setTimeout(() => {
      if (lenis) lenis.scrollTo(`#${id}`, { offset: -72, duration: 1.1 });
      else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 120);
  };

  const items = useMemo<CommandItem[]>(() => {
    const sections: CommandItem[] = navItems.map((item) => ({
      id: `sec-${item.id}`,
      label: t.nav[item.labelKey as keyof typeof t.nav],
      hint: "Section",
      icon: Home,
      action: () => scrollTo(item.href),
    }));

    const serviceItems: CommandItem[] = services.map((service) => ({
      id: `svc-${service.id}`,
      label: service.title,
      hint: "Service",
      icon: FileText,
      action: () => scrollTo("#services"),
    }));

    const postItems: CommandItem[] = blogPosts.map((post) => ({
      id: `post-${post.slug}`,
      label: post.title,
      hint: "Article",
      icon: FileText,
      action: () => {
        setOpen(false);
        router.push(`/blog/${post.slug}`);
      },
    }));

    return [...sections, ...serviceItems, ...postItems];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 10);
    return items
      .filter((item) => item.label.toLowerCase().includes(q))
      .slice(0, 10);
  }, [items, query]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setSelected(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const execute = (item: CommandItem) => item.action();

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[140] bg-slate-950/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="glass-strong fixed left-1/2 top-[16vh] z-[150] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-3xl shadow-glow-lg"
              initial={{ opacity: 0, y: -20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              role="dialog"
              aria-label={t.common.search}
            >
              <div className="flex items-center gap-3 border-b border-border/60 px-5">
                <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSelected((s) => (s + 1) % Math.max(filtered.length, 1));
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSelected((s) =>
                        s - 1 < 0 ? Math.max(filtered.length - 1, 0) : s - 1,
                      );
                    }
                    if (e.key === "Enter" && filtered[selected]) {
                      execute(filtered[selected]);
                    }
                  }}
                  placeholder={t.common.searchPlaceholder}
                  className="h-14 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  aria-label={t.common.searchPlaceholder}
                />
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-border p-1 text-muted-foreground"
                  aria-label={t.common.close}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="max-h-[46vh] overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    {t.common.noResults}
                  </p>
                ) : (
                  filtered.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => execute(item)}
                      onMouseEnter={() => setSelected(index)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors",
                        index === selected ? "bg-primary/10 text-primary" : "text-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {item.hint}
                      </span>
                      {index === selected && <ArrowRight className="h-3.5 w-3.5" />}
                    </button>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between border-t border-border/60 bg-background/40 px-5 py-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border px-1.5 py-0.5">↑↓</kbd> navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border px-1.5 py-0.5">↵</kbd> select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5">
                    <Command className="h-2.5 w-2.5" /> K
                  </kbd>{" "}
                  anytime
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
