"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Centered glass auth card with the site's premium cyber design. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="portal-canvas relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-16">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="animate-float-slow pointer-events-none absolute left-1/4 top-1/3 h-24 w-24 rounded-full border border-cyan-300/20" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
        className="saas-card relative w-full max-w-md rounded-[1.5rem] p-6 sm:p-8"
      >
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="relative">
            <span className="absolute -inset-2 rounded-full bg-cyan-400/30 animate-pulse-ring" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">{title}</h1>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-cyan-400" /> {subtitle}
            </p>
          </div>
        </div>

        {children}

        {footer && <div className="mt-6 border-t border-border/60 pt-5">{footer}</div>}
      </motion.div>
    </div>
  );
}

/** Tiny helper for label+field stacks used across auth + dashboard forms. */
export function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
