"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  Facebook,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Phone,
  Send,
} from "lucide-react";
import { availability, profile, socials } from "@/data/content";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/lib/toast";
import { Reveal } from "@/components/effects/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Magnetic } from "@/components/effects/magnetic";
import { AvailabilityBadge } from "@/components/widgets/availability-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitContactAction } from "@/app/contact-action";
import {
  BUDGET_RANGES,
  PROJECT_TIMELINES,
  PROJECT_TYPES,
  contactFormSchema,
  type ContactFormValues,
} from "@/lib/contact-schema";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  whatsapp: Phone,
  messenger: MessageCircle,
  email: Mail,
  github: Github,
  linkedin: Linkedin,
  facebook: Facebook,
  instagram: Instagram,
  telegram: Send,
};

const styleMap: Record<string, string> = {
  whatsapp: "from-emerald-500 to-teal-500",
  messenger: "from-blue-500 to-indigo-500",
  email: "from-sky-500 to-blue-600",
  github: "from-slate-600 to-slate-800",
  linkedin: "from-blue-600 to-sky-500",
  facebook: "from-blue-600 to-indigo-600",
  instagram: "from-fuchsia-500 to-pink-500",
  telegram: "from-cyan-500 to-sky-600",
};

const emptyValues = {
  name: "",
  email: "",
  projectType: "",
  budget: "",
  timeline: "",
  message: "",
  website: "",
} as unknown as ContactFormValues;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-red-500" role="alert">
      {message}
    </p>
  );
}

export function Contact() {
  const { t } = useI18n();
  const { user } = useSession();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const startedAt = useRef(Date.now());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: emptyValues,
    mode: "onBlur",
  });

  const onSubmit = async (data: ContactFormValues) => {
    if (sending) return;
    setSending(true);
    setFormError(null);
    try {
      const result = await submitContactAction({
        ...data,
        startedAt: startedAt.current,
      });
      if (result.ok) {
        setSent(true);
        reset(emptyValues);
        startedAt.current = Date.now();
        return;
      }
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          setError(field as keyof ContactFormValues, { type: "server", message });
        }
      }
      setFormError(result.error);
      toast("error", t.contact.error, result.error);
    } catch {
      setFormError(t.contact.error);
      toast("error", t.contact.error);
    } finally {
      setSending(false);
    }
  };

  const sendAnother = () => {
    setSent(false);
    setFormError(null);
    startedAt.current = Date.now();
  };

  return (
    <section id="contact" className="section relative scroll-mt-20 overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="container relative">
        <SectionHeading
          eyebrow="Contact"
          title={t.contact.title}
          description={t.contact.subtitle}
        />

        <Reveal className="mx-auto mt-8 max-w-6xl sm:mt-12 md:mt-14">
          <div className="mb-6 flex flex-col items-center gap-3 sm:mb-8 sm:flex-row sm:justify-center">
            <AvailabilityBadge />
            <p className="max-w-md text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
              {availability.note}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
            <div className="glass gradient-border rounded-3xl p-5 sm:p-8 md:p-10">
              <AnimatePresence mode="wait">
                {sent ? (
                  <motion.div
                    key="success"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    className="flex min-h-[320px] flex-col items-center justify-center px-2 text-center sm:min-h-[380px]"
                  >
                    <div className="relative mb-6">
                      {!reduceMotion && (
                        <span className="absolute -inset-4 rounded-full bg-emerald-400/30 animate-pulse-ring" />
                      )}
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-glow-lg sm:h-20 sm:w-20">
                        <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10" />
                      </div>
                    </div>
                    <h3 className="font-display text-xl font-bold sm:text-2xl">{t.contact.success}</h3>
                    <p className="mt-3 max-w-sm text-sm text-muted-foreground">{t.contact.successSub}</p>
                    <Button variant="outline" className="mt-6" onClick={sendAnother}>
                      {t.contact.sendAnother}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit(onSubmit)}
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    id="contact-form"
                    className="space-y-4 sm:space-y-5"
                    noValidate
                  >
                    <div>
                      <p className="font-display text-lg font-bold sm:text-xl">{t.contact.formTitle}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{t.contact.formSubtitle}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                      <div>
                        <Label htmlFor="contact-name">{t.contact.fullName}</Label>
                        <Input
                          id="contact-name"
                          autoComplete="name"
                          placeholder={t.contact.fullNamePlaceholder}
                          {...register("name")}
                          aria-invalid={!!errors.name}
                          aria-describedby={errors.name ? "contact-name-error" : undefined}
                        />
                        <FieldError id="contact-name-error" message={errors.name?.message} />
                      </div>
                      <div>
                        <Label htmlFor="contact-email">{t.contact.email}</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          placeholder={t.contact.emailPlaceholder}
                          {...register("email")}
                          aria-invalid={!!errors.email}
                          aria-describedby={errors.email ? "contact-email-error" : undefined}
                        />
                        <FieldError id="contact-email-error" message={errors.email?.message} />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="contact-project-type">{t.contact.projectType}</Label>
                      <select
                        id="contact-project-type"
                        className="form-control"
                        {...register("projectType")}
                        aria-invalid={!!errors.projectType}
                        aria-describedby={errors.projectType ? "contact-project-type-error" : undefined}
                      >
                        <option value="" disabled>
                          {t.contact.projectTypePlaceholder}
                        </option>
                        {PROJECT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <FieldError id="contact-project-type-error" message={errors.projectType?.message} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                      <div>
                        <Label htmlFor="contact-budget">
                          {t.contact.budget}{" "}
                          <span className="font-normal text-muted-foreground">({t.contact.optional})</span>
                        </Label>
                        <select id="contact-budget" className="form-control" {...register("budget")}>
                          <option value="">{t.contact.budgetPlaceholder}</option>
                          {BUDGET_RANGES.map((range) => (
                            <option key={range} value={range}>
                              {range}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="contact-timeline">
                          {t.contact.timeline}{" "}
                          <span className="font-normal text-muted-foreground">({t.contact.optional})</span>
                        </Label>
                        <select id="contact-timeline" className="form-control" {...register("timeline")}>
                          <option value="">{t.contact.timelinePlaceholder}</option>
                          {PROJECT_TIMELINES.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="contact-message">{t.contact.message}</Label>
                      <Textarea
                        id="contact-message"
                        rows={5}
                        placeholder={t.contact.messagePlaceholder}
                        {...register("message")}
                        aria-invalid={!!errors.message}
                        aria-describedby={errors.message ? "contact-message-error" : undefined}
                      />
                      <FieldError id="contact-message-error" message={errors.message?.message} />
                    </div>

                    <div className="hidden" aria-hidden>
                      <label htmlFor="contact-website">Website</label>
                      <input
                        id="contact-website"
                        tabIndex={-1}
                        autoComplete="off"
                        {...register("website")}
                      />
                    </div>

                    {formError && (
                      <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300" role="alert">
                        {formError}
                      </p>
                    )}

                    <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground sm:max-w-sm">
                        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500" />
                        {t.contact.privacy}
                      </p>
                      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={sending}>
                        {sending ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            {t.contact.submitting}
                          </>
                        ) : (
                          <>
                            <Send className="h-5 w-5" />
                            {t.contact.submit}
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-5">
              <div className="glass gradient-border rounded-3xl p-5 sm:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-glow sm:h-12 sm:w-12">
                    <MapPin className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Location
                    </p>
                    <p className="font-display text-base font-bold sm:text-lg">{t.contact.location}</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground">{t.contact.channels}</p>
                <div className="mt-3 grid gap-3">
                  {socials.map((social) => {
                    const Icon = iconMap[social.id] ?? Globe;
                    const gradient = styleMap[social.id] ?? "from-blue-600 to-cyan-400";
                    return (
                      <Magnetic key={social.id} strength={0.12}>
                        <a
                          href={social.href}
                          target={social.href.startsWith("mailto") ? undefined : "_blank"}
                          rel="noopener noreferrer"
                          className="group glass flex items-center gap-3 rounded-2xl p-3.5 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-glow sm:gap-4 sm:p-4"
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg transition-transform duration-500 group-hover:scale-110 sm:h-11 sm:w-11`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-display text-sm font-bold sm:text-base">{social.label}</p>
                            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{social.href}</p>
                          </div>
                          <Send className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-primary" />
                        </a>
                      </Magnetic>
                    );
                  })}
                </div>
              </div>

              <div className="glass gradient-border rounded-3xl p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-glow">
                    <MessagesSquare className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-base font-bold">{t.contact.supportInboxTitle}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t.contact.supportInboxBody}</p>
                    <Button asChild size="sm" variant="outline" className="mt-4">
                      <Link href={user ? "/dashboard/support" : "/login?next=/dashboard/support"}>
                        <MessagesSquare className="h-4 w-4" />
                        {t.contact.supportInboxCta}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 text-center sm:p-6">
                <p className="text-sm font-medium text-foreground">
                  {t.hero.verified} · <span className="text-gradient font-bold">{profile.name}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {profile.role} — {t.hero.location}
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
