"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
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
import { useLenis } from "@/hooks/use-lenis";
import { Reveal } from "@/components/effects/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Magnetic } from "@/components/effects/magnetic";
import { AvailabilityBadge } from "@/components/widgets/availability-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitContactAction } from "@/app/contact-action";
import { ClientTimeoutError, cn, withClientTimeout } from "@/lib/utils";
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
  phone: "",
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
  const { lenis } = useLenis();
  const reduceMotion = useReducedMotion();
  const startedAt = useRef(Date.now());
  const submissionId = useRef(crypto.randomUUID());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const supportHref = user ? "/dashboard/support" : "/login?next=/dashboard/support";

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
      const result = await withClientTimeout(
        submitContactAction({
          ...data,
          startedAt: startedAt.current,
          submissionId: submissionId.current,
        }),
        20_000,
        "enquiry",
      );
      if (result.ok) {
        setReferenceId(result.referenceId);
        setEmailWarning(result.emailWarning ?? null);
        setSent(true);
        reset(emptyValues);
        startedAt.current = Date.now();
        submissionId.current = crypto.randomUUID();
        return;
      }
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          setError(field as keyof ContactFormValues, { type: "server", message });
        }
      }
      setFormError(result.error);
      toast("error", t.contact.error, result.error);
    } catch (error) {
      const message =
        error instanceof ClientTimeoutError ? "The request timed out. Please try again." : t.contact.error;
      setFormError(message);
      toast("error", t.contact.error, message);
    } finally {
      setSending(false);
    }
  };

  const sendAnother = () => {
    setSent(false);
    setFormError(null);
    setReferenceId(null);
    setEmailWarning(null);
    startedAt.current = Date.now();
  };

  const scrollToForm = () => {
    if (lenis) lenis.scrollTo("#contact-form", { offset: -96, duration: 1.1 });
    else document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const paths = [
    {
      id: "support",
      icon: MessagesSquare,
      gradient: "from-indigo-500 to-cyan-400",
      title: t.contact.supportInboxTitle,
      body: t.contact.supportInboxBody,
      cta: t.contact.supportInboxCta,
      href: supportHref,
    },
    {
      id: "email",
      icon: Mail,
      gradient: "from-sky-500 to-blue-600",
      title: t.contact.emailTitle,
      body: t.contact.emailBody,
      cta: t.contact.emailCta,
      href: `mailto:${profile.email}`,
    },
    {
      id: "project",
      icon: Send,
      gradient: "from-blue-600 to-cyan-400",
      title: t.contact.projectTitle,
      body: t.contact.projectBody,
      cta: t.contact.projectCta,
      onClick: scrollToForm,
    },
    {
      id: "consultation",
      icon: CalendarDays,
      gradient: "from-cyan-500 to-sky-600",
      title: t.contact.consultationTitle,
      body: t.contact.consultationBody,
      cta: t.contact.consultationCta,
      href: "/consultation",
    },
  ];

  return (
    <section id="contact" className="section relative scroll-mt-24 overflow-hidden pb-16 xl:pb-24">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="container relative">
        <SectionHeading
          eyebrow="Contact"
          title={t.contact.title}
          description={t.contact.subtitle}
        />

        <Reveal className="mx-auto mt-6 max-w-6xl sm:mt-8">
          <div className="mb-5 flex flex-col items-center gap-3 sm:mb-6 sm:flex-row sm:justify-center">
            <AvailabilityBadge />
            <p className="max-w-md text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
              {availability.note}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {paths.map((path) => {
              const Icon = path.icon;
              const actionClass =
                "mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary";
              const cardClass =
                "group glass gradient-border hover-lift flex h-full flex-col rounded-[1.35rem] p-5 sm:p-6";

              const inner = (
                <>
                  <div
                    className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${path.gradient} text-white shadow-glow sm:h-12 sm:w-12`}
                  >
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="font-display text-base font-bold sm:text-lg">{path.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {path.body}
                  </p>
                  <span className={cn(actionClass, "mt-5")}>
                    {path.cta}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </>
              );

              if (path.onClick) {
                return (
                  <button
                    key={path.id}
                    type="button"
                    onClick={path.onClick}
                    className={cn(cardClass, "text-left")}
                  >
                    {inner}
                  </button>
                );
              }

              const isMail = path.href?.startsWith("mailto:");
              if (isMail) {
                return (
                  <a key={path.id} href={path.href} className={cardClass}>
                    {inner}
                  </a>
                );
              }

              return (
                <Link key={path.id} href={path.href ?? "/"} className={cardClass}>
                  {inner}
                </Link>
              );
            })}
          </div>

          <div className="mt-5 grid gap-5 lg:mt-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6">
            <div className="glass gradient-border scroll-mt-24 rounded-[1.5rem] p-5 sm:p-7" id="project-enquiry">
              <AnimatePresence mode="wait">
                {sent ? (
                  <motion.div
                    key="success"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    className="flex min-h-[260px] flex-col items-center justify-center px-2 text-center sm:min-h-[300px]"
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
                    {referenceId && (
                      <p className="mt-3 font-display text-sm font-semibold text-primary">
                        {t.contact.referenceLabel}: {referenceId}
                      </p>
                    )}
                    <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                      {emailWarning ? t.contact.savedEmailFailed : t.contact.successSub}
                    </p>
                    {emailWarning && (
                      <p className="mt-2 max-w-sm text-xs text-amber-600 dark:text-amber-400">{emailWarning}</p>
                    )}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      <Button asChild>
                        <Link href="/track">{t.contact.trackCta}</Link>
                      </Button>
                      <Button variant="outline" onClick={sendAnother}>
                        {t.contact.sendAnother}
                      </Button>
                    </div>
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
                      <Label htmlFor="contact-phone">
                        {t.consultation.phone}{" "}
                        <span className="font-normal text-muted-foreground">({t.contact.optional})</span>
                      </Label>
                      <Input
                        id="contact-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="+880 1XXX-XXXXXX"
                        {...register("phone")}
                        aria-invalid={!!errors.phone}
                      />
                      <FieldError id="contact-phone-error" message={errors.phone?.message} />
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

                    <div className="min-h-[3.25rem]">
                      {formError && (
                        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300" role="alert">
                          {formError}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 pb-4 pt-1 sm:flex-row sm:items-center sm:justify-between xl:pb-16">
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
                          className="group glass hover-lift flex items-center gap-3 rounded-2xl p-3.5 sm:gap-4 sm:p-4"
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
