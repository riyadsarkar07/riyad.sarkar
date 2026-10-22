"use client";

import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { services } from "@/data/content";
import { useI18n } from "@/lib/i18n";
import { useTilt } from "@/hooks/use-tilt";
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

function ServiceCard({ id }: { id: string }) {
  const { t } = useI18n();
  const { ref, transform } = useTilt(8);
  const [open, setOpen] = useState(false);
  const service = services.find((s) => s.id === id);
  if (!service) return null;

  return (
    <>
      <div ref={ref} style={{ transform }} className="transition-transform duration-200 will-change-transform">
        <div className="group glass gradient-border relative flex h-full flex-col overflow-hidden rounded-3xl p-7 transition-all duration-500 hover:-translate-y-1 hover:shadow-glow-lg">
          <div className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${service.gradient} blur-2xl transition-opacity duration-500 opacity-40 group-hover:opacity-90`} />

          <div className="mb-5 flex items-center justify-between">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-white shadow-glow transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
              <Icon name={service.icon} className="h-7 w-7" />
            </div>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground/40 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-primary" />
          </div>

          <h3 className="font-display text-lg font-bold leading-snug">{service.title}</h3>
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
            className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-cyan-500"
          >
            {t.common.learnMore}
            <span className="h-px w-0 bg-current transition-all duration-300 group-hover:w-6" />
          </button>
        </div>
      </div>

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
              What's included
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
            <Badge variant="gradient">{service.title}</Badge>
            <Button size="sm" onClick={() => setOpen(false)}>
              {t.common.contactMe}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Services grid — premium glass cards with 3D tilt. */
export function Services() {
  return (
    <section id="services" className="section relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="container relative">
        <SectionHeading
          eyebrow="Services"
          title="Premium Security & Recovery Services"
          description="From urgent account recovery to long-term business protection — every service is handled personally with proven, documented methods."
        />

        <RevealGroup className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <RevealItem key={service.id}>
              <ServiceCard id={service.id} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
