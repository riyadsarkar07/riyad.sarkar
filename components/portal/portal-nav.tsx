"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export interface PortalNavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

interface PortalNavProps {
  items: PortalNavItem[];
  title: string;
  subtitle: string;
}

function pathAndHash(href: string): { path: string; hash: string } {
  const [path, hash = ""] = href.split("#");
  return { path, hash };
}

function routeIsActive(item: PortalNavItem, pathname: string, hash: string, items: PortalNavItem[]) {
  const { path, hash: itemHash } = pathAndHash(item.href);

  if (itemHash) {
    return pathname === path && hash === `#${itemHash}`;
  }

  if (item.end) {
    return pathname === path && !hash;
  }

  const moreSpecific = items.some((other) => {
    if (other.href === item.href) return false;
    const otherPath = pathAndHash(other.href).path;
    return otherPath !== path && otherPath.startsWith(`${path}/`) && (pathname === otherPath || pathname.startsWith(`${otherPath}/`));
  });
  if (moreSpecific) return false;

  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
  if (path === "/dashboard/account" && hash === "#change-password") return false;
  return true;
}

export function PortalNav({ items, title, subtitle }: PortalNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  const isActive = (item: PortalNavItem) => routeIsActive(item, pathname, hash, items);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <Logo />
        <div>
          <p className="font-display text-sm font-bold leading-tight">{title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Portal navigation">
        {items.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-gradient-to-r from-blue-600/15 to-cyan-400/15 text-primary shadow-inner"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
              )}
            >
              <item.icon className={cn("h-4.5 w-4.5", active ? "text-cyan-500" : "text-muted-foreground group-hover:text-primary")} />
              {item.label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-glow" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/60 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-primary/5 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 text-sm font-bold text-white">
            {(profile?.full_name ?? "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile?.full_name ?? "Account"}</p>
            <p className="truncate text-[11px] text-muted-foreground">{profile?.email ?? ""}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-border/70 bg-background/80 shadow-[8px_0_28px_rgba(8,74,140,0.05)] backdrop-blur-xl lg:block">
        {sidebar}
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2.5">
          <Logo />
          <p className="font-display text-sm font-bold">{title}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="glass-strong fixed inset-y-0 left-0 z-[61] w-72 max-w-[85vw] shadow-glass-lg lg:hidden"
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export function PortalTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-glow">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <div>
        <p className="font-display text-sm font-bold leading-tight">{title}</p>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
