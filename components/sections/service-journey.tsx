import Link from "next/link";
import { ArrowRight, ClipboardCheck, LifeBuoy, ShieldCheck } from "lucide-react";

/** A clear service path without promises of guaranteed recovery. */
const steps = [
  {
    number: "01",
    icon: ClipboardCheck,
    title: "Understand the issue",
    description: "Tell us what happened and what outcome you need. Start with a secure consultation.",
  },
  {
    number: "02",
    icon: ShieldCheck,
    title: "Review the options",
    description: "Explore practical next steps, requirements and a responsible recovery or security plan.",
  },
  {
    number: "03",
    icon: LifeBuoy,
    title: "Stay informed",
    description: "Follow your request through your account, support inbox or live conversation.",
  },
];

export function ServiceJourney() {
  return (
    <section id="process" className="relative border-y border-border/60 bg-muted/40 py-16 sm:py-20 lg:py-24" aria-labelledby="process-title">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">How it works</p>
            <h2 id="process-title" className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              A clearer path from concern to action.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Straightforward steps, visible progress and access to support when you need it.
            </p>
          </div>
          <Link href="/consultation" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary">
            Start a consultation <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <ol className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
          {steps.map((step) => (
            <li key={step.number} className="group rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-md sm:p-7">
              <div className="flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-mono text-sm font-semibold text-muted-foreground/60">{step.number}</span>
              </div>
              <h3 className="mt-8 font-display text-lg font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
