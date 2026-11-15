"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown } from "lucide-react";
import { serviceCategories, services } from "@/data/content";
import { useI18n } from "@/lib/i18n";
import { RevealGroup, RevealItem } from "@/components/effects/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const FEATURED_LIMIT = 6;

function ServiceCard({ id }: { id: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const service = services.find((s) => s.id === id);
  if (!service) return null;

  return (
    <>
      <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-primary/25 hover:shadow-md sm:p-6 md:p-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" aria-hidden="true" />

          <div className="mb-5 flex items-center justify-between">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-sky-500/15 bg-sky-500/10 text-sky-700 dark:text-sky-300">
              <Icon name={service.icon} className="h-7 w-7" />
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground/50 transition-colors group-hover:text-primary" />
          </div>

          <h3 className="font-display text-lg font-semibold leading-snug tracking-tight">{service.title}</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
            {service.description}
          </p>

          <ul className="mt-4 mb-5 flex flex-wrap gap-1.5">
            {service.features.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-1 rounded-full bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary"
              >
                <Check className="h-3 w-3" />
                {feature}
              </li>
            ))}
          </ul>

          <button
            onClick={() => setOpen(true)}
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg px-1 text-sm font-semibold text-sky-700 transition-colors hover:text-sky-600 focus-visible:outline-offset-2 dark:text-sky-300"
          >
            {t.common.learnMore}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>
      </article>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-white shadow-glow">
              <Icon name={service.icon} className="h-7 w-7" />
            </div>
            <DialogTitle>{service.title}</DialogTitle>
            <DialogDescription>{service.description}</DialogDescription>
          </DialogHeader>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              What&apos;s included
            </h4>
            <ul className="space-y-2.5">
              {service.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
            <Badge variant="gradient">{service.category}</Badge>
            <Button size="sm" asChild>
              <Link href="/consultation" onClick={() => setOpen(false)}>
                {t.common.bookConsultation}
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Services grid — featured cards by category, with a view-all interaction. */
export function Services() {
  const [filter, setFilter] = useState<string>("Featured");
  const [showAll, setShowAll] = useState(false);

  const featured = useMemo(() => {
    const marked = services.filter((s) => s.featured);
    return marked.length >= FEATURED_LIMIT ? marked.slice(0, FEATURED_LIMIT) : services.slice(0, FEATURED_LIMIT);
  }, []);

  const visible = useMemo(() => {
    if (filter === "Featured" && !showAll) return featured;
    if (filter === "Featured") return services;
    return services.filter((s) => s.category === filter);
  }, [filter, showAll, featured]);

  const filters = ["Featured", ...serviceCategories];

  return (
    <section id="services" className="section relative overflow-hidden">
      
      <div className="container relative">
        <SectionHeading
          eyebrow="Services"
          title="Premium Security & Recovery Services"
          description="From urgent account recovery to long-term business protection — every service is handled personally with proven, documented methods."
        />

        <div className="mt-8 flex flex-wrap justify-center gap-2" role="group" aria-label="Filter services by category">
          {filters.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={filter === cat}
              onClick={() => {
                setFilter(cat);
                if (cat !== "Featured") setShowAll(true);
              }}
              className={cn(
                "min-h-10 rounded-lg border px-4 py-2 text-sm font-medium transition-colors duration-150",
                filter === cat
                  ? "border-sky-700 bg-sky-700 text-white shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <RevealGroup className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 md:mt-12 lg:grid-cols-3">
          {visible.map((service) => (
            <RevealItem key={service.id}>
              <ServiceCard id={service.id} />
            </RevealItem>
          ))}
        </RevealGroup>

        {filter === "Featured" && !showAll && services.length > featured.length && (
          <div className="mt-8 flex justify-center">
            <Button
              variant="outline"
              onClick={() => setShowAll(true)}
              aria-expanded={showAll}
            >
              View all {services.length} services
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
