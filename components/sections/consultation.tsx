"use client";

import { useEffect, useState } from "react";
import emailjs from "@emailjs/browser";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
} from "lucide-react";
import { services, consultationTimes } from "@/data/content";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { useLenis } from "@/hooks/use-lenis";
import { Reveal } from "@/components/effects/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ConsultationInputs } from "@/types";
import { cn } from "@/lib/utils";

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

/** Book a consultation — premium calendar picker + animated form. */
export function Consultation() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { lenis } = useLenis();
  const [dates] = useState(() => nextDays(14));
  const [selectedDate, setSelectedDate] = useState<Date>(dates[0]);
  const [selectedTime, setSelectedTime] = useState<string>(consultationTimes[0]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const schema = z.object({
    name: z.string().min(2, t.consultation.required),
    email: z.string().email(),
    phone: z.string().min(6, t.consultation.required),
    service: z.string().min(1, t.consultation.required),
    message: z.string().min(10, t.consultation.required),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConsultationInputs>({
    resolver: zodResolver(schema),
    defaultValues: { service: "" },
  });

  useEffect(() => {
    emailjs.init({
      publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ?? "",
    });
  }, []);

  const onSubmit = async (data: ConsultationInputs) => {
    setSending(true);
    try {
      const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;

      if (!serviceId || !templateId || !process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY) {
        toast("error", t.consultation.error);
        return;
      }

      await emailjs.send(
        serviceId,
        templateId,
        {
          from_name: data.name,
          from_email: data.email,
          phone: data.phone,
          service: data.service,
          date: selectedDate.toDateString(),
          time: selectedTime,
          message: data.message,
          to_name: "Riyad Sarkar",
        },
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY,
      );

      setSent(true);
      reset();
      window.setTimeout(() => setSent(false), 4000);
    } catch {
      toast("error", t.consultation.error);
    } finally {
      setSending(false);
    }
  };

  const scrollToContact = () => {
    if (lenis) lenis.scrollTo("#contact", { offset: -72, duration: 1.2 });
    else document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <section id="consultation" className="section relative overflow-hidden">
      <div className="bg-mesh-blue pointer-events-none absolute inset-0" />
      <div className="container relative">
        <SectionHeading
          eyebrow="Consultation"
          title={t.consultation.title}
          description={t.consultation.subtitle}
        />

        <Reveal className="mx-auto mt-14 max-w-5xl">
          <div className="glass gradient-border overflow-hidden rounded-3xl">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              {/* Calendar side */}
              <div className="border-b border-border bg-white/40 p-7 backdrop-blur-sm dark:bg-white/[0.03] lg:border-b-0 lg:border-r">
                <h3 className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
                  <CalendarDays className="h-5 w-5 text-cyan-500" />
                  Select a date
                </h3>
                <p className="mb-6 text-xs text-muted-foreground">
                  Pick an available day for your private session.
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
                        onClick={() => setSelectedDate(date)}
                        disabled={weekend}
                        className={cn(
                          "flex h-11 flex-col items-center justify-center rounded-xl text-sm font-medium transition-all duration-300",
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

                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarOff className="h-3.5 w-3.5" /> Weekend unavailable
                  </span>
                </div>

                <h3 className="mb-3 mt-8 flex items-center gap-2 font-display text-lg font-bold">
                  <Clock className="h-5 w-5 text-cyan-500" />
                  Select a time
                </h3>
                <div className="flex flex-wrap gap-2">
                  {consultationTimes.map((time) => (
                    <button
                      key={time}
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

              {/* Form side */}
              <div className="relative p-7">
                <AnimatePresence mode="wait">
                  {sent ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex h-full min-h-[380px] flex-col items-center justify-center text-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18 }}
                        className="relative mb-6"
                      >
                        <span className="absolute -inset-4 rounded-full bg-emerald-400/30 animate-pulse-ring" />
                        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-glow-lg">
                          <CheckCircle2 className="h-10 w-10" />
                        </div>
                      </motion.div>
                      <h3 className="font-display text-2xl font-bold">{t.consultation.success}</h3>
                      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                        {t.consultation.successSub}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      onSubmit={handleSubmit(onSubmit)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-5"
                      noValidate
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="name">{t.consultation.fullName}</Label>
                          <Input
                            id="name"
                            placeholder="John Doe"
                            {...register("name")}
                            aria-invalid={!!errors.name}
                          />
                          {errors.name && (
                            <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="email">{t.consultation.email}</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="john@example.com"
                            {...register("email")}
                            aria-invalid={!!errors.email}
                          />
                          {errors.email && (
                            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="phone">{t.consultation.phone}</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+880 1XXX-XXXXXX"
                            {...register("phone")}
                            aria-invalid={!!errors.phone}
                          />
                          {errors.phone && (
                            <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="service">{t.consultation.service}</Label>
                          <select
                            id="service"
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
                        <Label htmlFor="message">{t.consultation.message}</Label>
                        <Textarea
                          id="message"
                          placeholder={t.consultation.messagePlaceholder}
                          rows={4}
                          {...register("message")}
                          aria-invalid={!!errors.message}
                        />
                        {errors.message && (
                          <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-primary">
                            {selectedDate.toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>{" "}
                          at <span className="font-semibold text-primary">{selectedTime}</span>
                        </p>
                        <Button type="submit" size="lg" disabled={sending}>
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
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Prefer messaging directly?{" "}
            <button
              onClick={scrollToContact}
              className="font-semibold text-primary hover:underline"
            >
              {t.common.contactMe}
            </button>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
