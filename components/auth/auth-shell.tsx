"use client";

import { ArrowLeft, ArrowRight, LockKeyhole, MessagesSquare, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Shared product-grade authentication surface; no marketing animation or background noise. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="portal-canvas relative flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid w-full max-w-[1000px] overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-[0_25px_75px_rgba(15,35,63,0.10)] lg:min-h-[610px] lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#071827] p-9 text-white lg:flex xl:p-12">
          <div className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold text-white/90 hover:text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                <ShieldCheck className="h-5 w-5 text-sky-300" />
              </span>
              Riyad Sarkar
            </Link>
            <p className="mt-20 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">Your secure workspace</p>
            <h2 className="mt-4 max-w-xs font-display text-4xl font-semibold leading-[1.12] tracking-tight text-white">
              Support that stays clear.
            </h2>
            <p className="mt-5 max-w-xs text-sm leading-7 text-slate-300">
              Keep track of your support conversations, appointments and account details in one organised place.
            </p>
          </div>
          <div className="relative space-y-3 border-t border-white/15 pt-6">
            <p className="flex items-center gap-3 text-sm text-slate-200">
              <MessagesSquare className="h-[18px] w-[18px] text-sky-300" />
              Conversation and case history
            </p>
            <p className="flex items-center gap-3 text-sm text-slate-200">
              <LockKeyhole className="h-[18px] w-[18px] text-sky-300" />
              Account-based access
            </p>
          </div>
        </aside>

        <main className="flex min-w-0 flex-col justify-center px-5 py-8 sm:px-10 sm:py-12 lg:px-14">
          <Link
            href="/"
            className="mb-9 inline-flex w-fit min-h-9 items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to website
          </Link>

          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          </div>

          {children}
          {footer && <div className="mt-7 border-t border-border/70 pt-5">{footer}</div>}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-5 text-xs text-muted-foreground">
            <span>Riyad Sarkar · Client Portal</span>
            <Link href="/contact" className="inline-flex items-center gap-1 font-medium hover:text-primary">
              Need help? <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}

/** Field wrapper: use an explicit htmlFor and matching child id where practical. */
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
      <p className="text-sm font-medium text-foreground">{label}</p>
      {children}
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
