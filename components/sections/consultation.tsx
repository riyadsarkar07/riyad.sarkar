"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Send,
  ShieldCheck,
} from "lucide-react";
import { services, consultationTimes } from "@/data/content";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { Reveal } from "@/components/effects/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitConsultationAction } from "@/app/consultation-action";
import { ClientTimeoutError, cn, withClientTimeout } from "@/lib/utils";

const serviceOptions = ["General Security Consultation", ...services.map((s) => s.title)];

function nextDays(count: number): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function firstWeekday(dates: Date[]): Date {
  return dates.find((date) => date.getDay() !== 0 && date.getDay() !== 6) ?? dates[0];
}

interface ConsultationProps {
  variant?: "page" | "section";
}

/** Book a consultation — premium calendar picker + animated form. */
export function Consultation({ variant = "section" }: ConsultationProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [dates] = useState(() => nextDays(14));
  const [selectedDate, setSelectedDate] = useState<Date>(() => firstWeekday(dates));
  const [selectedTime, setSelectedTime] = useState<string>(consultationTimes[0]);
  const [sending, setSending] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [sent, setSent] = useState(false);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const startedAt = useRef(Date.now());
  const submissionId = useRef(crypto.randomUUID());

  type FormValues = {
    name: string;
    email: string;
    phone: string;
    service: string;
    message: string;
  };

  const lastPayload = useRef<FormValues | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t.consultation.required),
        email: z.string().email(),
        phone: z.string().min(6, t.consultation.required),
        service: z.string().min(1, t.consultation.required),
        message: z.string().min(10, t.consultation.required),
      }),
    [t.consultation.required],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { service: "", name: "", email: "", phone: "", message: "" },
  });

  const toIsoDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const onSubmit = async (data: FormValues) => {
    if (sending) return;
    setSending(true);
    setFormError(null);
    try {
      const result = await withClientTimeout(
        submitConsultationAction({
          ...data,
          date: toIsoDate(selectedDate),
          time: selectedTime,
          startedAt: startedAt.current,
          submissionId: submissionId.current,
          website: "",
        }),
        30_000,
        "consultation",
      );
      if (result.ok) {
        lastPayload.current = data;
        setReferenceId(result.referenceId);
        setEmailWarning(result.emailWarning ?? null);
        setSent(true);
        reset();
        if (!result.emailWarning) {
          startedAt.current = Date.now();
          submissionId.current = crypto.randomUUID();
          lastPayload.current = null;
        }
        return;
      }
      setFormError(result.error);
      toast("error", t.consultation.error, result.error);
    } catch (error) {
      const message =
        error instanceof ClientTimeoutError
          ? "The request timed out. Please try again."
          : t.consultation.error;
      setFormError(message);
      toast("error", t.consultation.error, message);
    } finally {
      setSending(false);
    }
  };

  const retryNotification = async () => {
    const data = lastPayload.current;
    if (!data || retrying || sending) return;
    setRetrying(true);
    try {
      const result = await withClientTimeout(
        submitConsultationAction({
          ...data,
          date: toIsoDate(selectedDate),
          time: selectedTime,
          startedAt: Date.now() - 5000,
          submissionId: submissionId.current,
          website: "",
        }),
        30_000,
        "consultation-retry",
      );
      if (result.ok) {
        setReferenceId(result.referenceId);
        setEmailWarning(result.emailWarning ?? null);
        if (!result.emailWarning) {
          submissionId.current = crypto.randomUUID();
          lastPayload.current = null;
        }
        return;
      }
      toast("error", t.consultation.error, result.error);
    } catch (error) {
      const message =
        error instanceof ClientTimeoutError
          ? "The request timed out. Please try again."
          : t.consultation.error;
      toast("error", t.consultation.error, message);
    } finally {
      setRetrying(false);
    }
  };

  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const isPage = variant === "page";

  return (
    <section
      id="consultation"
      className={cn(
        "section relative overflow-hidden",
        isPage && "min-h-screen pb-16 pt-24 sm:pt-28 xl:pb-24",
      )}
    >
      <div className="bg-mesh-blue pointer-events-none absolute inset-0" />
      <div className="container relative">
        <SectionHeading
          eyebrow="Consultation"
          title={t.consultation.title}
          description={t.consultation.pageIntro}
        />

        <Reveal className="mx-auto mt-4 max-w-5xl sm:mt-6">
          <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground sm:mb-5 sm:px-5">
            <p className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />
              <span>{t.consultation.privateNote}</span>
            </p>
          </div>

          <div className="glass gradient-border overflow-hidden rounded-[1.5rem]">
            <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
              <div className="border-b border-border bg-white/40 p-5 backdrop-blur-sm dark:bg-white/[0.03] sm:p-7 lg:border-b-0 lg:border-r">
                <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
                  <CalendarDays className="h-5 w-5 text-cyan-500" />
                  {t.consultation.selectDate}
                </h3>
                <p className="mb-5 text-xs text-muted-foreground sm:mb-6">
                  {t.consultation.selectDateHint}
                </p>

                <div className="mb-2 grid grid-cols-7 gap-1 text-[11px] font-semibold text-muted-foreground">
                  {dayNames.map((day) => (
                    <span key={day} className="text-center">
                      {day}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {dates.map((date) => {
                    const active = date.toDateString() === selectedDate.toDateString();
                    const weekend = date.getDay() === 0 || date.getDay() === 6;
                    return (
                      <button
                        key={date.toISOString()}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        disabled={weekend}
                        className={cn(
                          "flex h-10 flex-col items-center justify-center rounded-xl text-sm font-medium transition-all duration-300 sm:h-11",
                          active
                            ? "btn-primary-glow text-white shadow-glow scale-105"
                            : weekend
                              ? "cursor-not-allowed text-muted-foreground/30"
                              : "text-foreground hover:bg-primary/10",
                        )}
                        aria-pressed={active}
                      >
                        {date.getDate()}
                        <span
                          className={cn(
                            "text-[9px]",
                            active ? "text-white/80" : "text-muted-foreground",
                          )}
                        >
                          {date.toLocaleDateString("en-US", { month: "short" })}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarOff className="h-3.5 w-3.5" /> {t.consultation.weekendUnavailable}
                  </span>
                </div>

                <h3 className="mb-3 mt-7 flex items-center gap-2 font-display text-lg font-bold sm:mt-8">
                  <Clock className="h-5 w-5 text-cyan-500" />
                  {t.consultation.selectTime}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {consultationTimes.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      className={cn(
                        "min-h-10 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-300",
                        selectedTime === time
                          ? "btn-primary-glow text-white shadow-glow"
                          : "border border-border bg-white/50 text-muted-foreground hover:text-primary dark:bg-white/5",
                      )}
                      aria-pressed={selectedTime === time}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative p-5 sm:p-7">
                <AnimatePresence mode="wait">
                  {sent ? (
                    <motion.div
                      key="success"
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0 }}
                      className="flex h-full min-h-[280px] flex-col items-center justify-center text-center sm:min-h-[320px]"
                    >
                      <div className="relative mb-6">
                        {!reduceMotion && (
                          <span className="absolute -inset-4 rounded-full bg-emerald-400/30 animate-pulse-ring" />
                        )}
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-glow-lg sm:h-20 sm:w-20">
                          <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10" />
                        </div>
                      </div>
                      <h3 className="font-display text-2xl font-bold">{t.consultation.success}</h3>
                      {referenceId && (
                        <p className="mt-3 font-display text-sm font-semibold text-primary">
                          {t.consultation.referenceLabel}: {referenceId}
                        </p>
                      )}
                      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                        {emailWarning ? t.consultation.savedEmailFailed : t.consultation.successSub}
                      </p>
                      {emailWarning && (
                        <>
                          <p className="mt-2 max-w-sm text-xs text-amber-600 dark:text-amber-400">{emailWarning}</p>
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-5"
                            onClick={retryNotification}
                            disabled={retrying}
                          >
                            {retrying ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t.consultation.retryingNotify}
                              </>
                            ) : (
                              t.consultation.retryNotify
                            )}
                          </Button>
                        </>
                      )}
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      onSubmit={handleSubmit(onSubmit)}
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0 }}
                      className="space-y-4 sm:space-y-5"
                      noValidate
                    >
                      <div>
                        <p className="font-display text-lg font-bold sm:text-xl">
                          {t.consultation.formTitle}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t.consultation.formSubtitle}
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                        <div>
                          <Label htmlFor="consultation-name">{t.consultation.fullName}</Label>
                          <Input
                            id="consultation-name"
                            autoComplete="name"
                            placeholder="John Doe"
                            {...register("name")}
                            aria-invalid={!!errors.name}
                          />
                          {errors.name && (
                            <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="consultation-email">{t.consultation.email}</Label>
                          <Input
                            id="consultation-email"
                            type="email"
                            autoComplete="email"
                            placeholder="john@example.com"
                            {...register("email")}
                            aria-invalid={!!errors.email}
                          />
                          {errors.email && (
                            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                        <div>
                          <Label htmlFor="consultation-phone">{t.consultation.phone}</Label>
                          <Input
                            id="consultation-phone"
                            type="tel"
                            autoComplete="tel"
                            placeholder="+880 1XXX-XXXXXX"
                            {...register("phone")}
                            aria-invalid={!!errors.phone}
                          />
                          {errors.phone && (
                            <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="consultation-service">{t.consultation.service}</Label>
                          <select
                            id="consultation-service"
                            {...register("service")}
                            className="form-control"
                            aria-invalid={!!errors.service}
                          >
                            <option value="">{t.consultation.servicePlaceholder}</option>
                            {serviceOptions.map((service) => (
                              <option key={service} value={service}>
                                {service}
                              </option>
                            ))}
                          </select>
                          {errors.service && (
                            <p className="mt-1 text-xs text-red-500">{errors.service.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="consultation-message">{t.consultation.message}</Label>
                        <Textarea
                          id="consultation-message"
                          placeholder={t.consultation.messagePlaceholder}
                          rows={4}
                          {...register("message")}
                          aria-invalid={!!errors.message}
                        />
                        {errors.message && (
                          <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
                        )}
                      </div>

                      <div className="min-h-[3.25rem]">
                        {formError && (
                          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300" role="alert">
                            {formError}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 pb-4 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between xl:pb-16">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-primary">
                            {selectedDate.toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>{" "}
                          {t.consultation.at}{" "}
                          <span className="font-semibold text-primary">{selectedTime}</span>
                        </p>
                        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={sending}>
                          {sending ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              {t.consultation.submitting}
                            </>
                          ) : (
                            <>
                              <Send className="h-5 w-5" />
                              {t.consultation.submit}
                            </>
                          )}
                        </Button>
                      </div>

                      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500" />
                        {t.consultation.confidential}
                      </p>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t.consultation.preferOther}{" "}
            <Link href="/#contact" className="font-semibold text-primary hover:underline">
              {t.common.contactMe}
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
