"use client";

import { ExternalLink, FileBadge, ShieldCheck } from "lucide-react";
import { certificates } from "@/data/content";
import { RevealGroup, RevealItem } from "@/components/effects/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TiltCard } from "@/components/effects/tilt-card";
import { useState } from "react";

function CertificateCard({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const cert = certificates.find((c) => c.id === id);
  if (!cert) return null;

  return (
    <>
      <TiltCard
        maxTilt={5}
        className="glass gradient-border flex h-full flex-col rounded-[1.35rem] p-6 hover:shadow-glass-lg"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-400/20 blur-2xl opacity-40 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="mb-5 flex items-center justify-between">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-white shadow-glow transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
            <Icon name={cert.icon} className="h-6 w-6" />
          </div>
          <ShieldCheck className="h-5 w-5 text-emerald-500 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>

        <h3 className="font-display text-lg font-bold leading-snug">{cert.title}</h3>
        <p className="mt-1 text-sm font-medium text-cyan-500">{cert.issuer}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Issued {cert.date} · {cert.credentialId}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3 pt-2">
          <Button size="sm" variant="glass" onClick={() => setOpen(true)}>
            <FileBadge className="h-4 w-4" />
            View Certificate
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <a href={cert.verifyUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Verify
            </a>
          </Button>
        </div>
      </TiltCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{cert.title}</DialogTitle>
            <DialogDescription>
              {cert.issuer} · Issued {cert.date} · Credential ID: {cert.credentialId}
            </DialogDescription>
          </DialogHeader>

          {/* Certificate preview */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-slate-50 to-sky-50 p-8 text-center dark:from-slate-900 dark:to-blue-950">
            <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />
            <div className="relative">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-white shadow-glow">
                <Icon name={cert.icon} className="h-8 w-8" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-500">
                Certificate of Achievement
              </p>
              <h3 className="mt-3 font-display text-2xl font-bold">{cert.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Awarded to <span className="font-semibold text-foreground">Riyad Sarkar</span>
              </p>
              <div className="mx-auto mt-6 h-px w-40 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
              <p className="mt-4 text-xs text-muted-foreground">
                Issued by {cert.issuer} · {cert.date}
              </p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                ID: {cert.credentialId}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" asChild>
              <a href={cert.verifyUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Verify on {cert.issuer}
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Certificates — beautiful cards with preview dialog + verify links. */
export function Certificates() {
  return (
    <section id="certificates" className="section relative overflow-hidden">
      <div className="container">
        <SectionHeading
          eyebrow="Certifications"
          title="Validated Expertise"
          description="Industry-recognized certifications that back every engagement with verified, up-to-date knowledge."
        />

        <RevealGroup className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((cert) => (
            <RevealItem key={cert.id}>
              <CertificateCard id={cert.id} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
