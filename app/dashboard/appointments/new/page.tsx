"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Lock,
  Send,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSupabase } from "@/hooks/use-supabase";
import {
  APPOINTMENT_SERVICES,
  CONTACT_METHODS,
  PRIORITIES,
  TIME_SLOTS,
  TIMEZONES,
} from "@/lib/constants";
import { createAppointmentAction } from "@/app/actions";
import { PageHeader } from "@/components/portal/page-header";
import { FileInput } from "@/components/portal/file-input";
import { Field } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const PRIORITY_META: Record<string, { label: string; hint: string }> = {
  low: { label: "Low", hint: "Not urgent" },
  normal: { label: "Normal", hint: "Standard" },
  high: { label: "High", hint: "Quick attention" },
  urgent: { label: "Urgent", hint: "Immediate help" },
};

function BookingForm() {
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const supabase = useSupabase();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    service: "",
    date: "",
    time: "",
    timezone: "Asia/Dhaka (GMT+6)",
    priority: "normal",
    problemDescription: "",
    additionalDetails: "",
    preferredContact: "email",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        fullName: profile.full_name ?? f.fullName,
        email: profile.email ?? f.email,
        phone: profile.phone ?? f.phone,
        timezone: profile.timezone && profile.timezone !== "Asia/Dhaka" ? f.timezone : f.timezone,
      }));
    }
  }, [profile]);

  useEffect(() => {
    const svc = searchParams.get("service");
    if (svc && (APPOINTMENT_SERVICES as readonly string[]).includes(svc)) {
      setForm((f) => ({ ...f, service: svc }));
    }
  }, [searchParams]);

  const today = new Date().toISOString().slice(0, 10);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.fullName.trim().length < 2) e.fullName = "Enter your full name";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
    if (form.phone.trim().length < 6) e.phone = "Enter a valid phone / WhatsApp number";
    if (!form.service) e.service = "Select a service";
    if (!form.date) e.date = "Choose a date";
    if (!form.time) e.time = "Choose a time";
    if (form.problemDescription.trim().length < 10) e.problemDescription = "Describe your problem (min 10 characters)";
    return e;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submittedRef.current || submitting) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    submittedRef.current = true;
    setSubmitting(true);

    let fileMeta: { storagePath: string; fileName: string; mimeType: string; size: number } | undefined;
    try {
      if (file && user) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("appointment-files")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        fileMeta = { storagePath: path, fileName: file.name, mimeType: file.type, size: file.size };
      }

      const res = await createAppointmentAction({
        form: {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          service: form.service as (typeof APPOINTMENT_SERVICES)[number],
          date: form.date,
          time: form.time,
          timezone: form.timezone,
          priority: form.priority as "low" | "normal" | "high" | "urgent",
          problemDescription: form.problemDescription,
          additionalDetails: form.additionalDetails,
          preferredContact: form.preferredContact as "email" | "whatsapp" | "phone",
        },
        files: fileMeta ? [fileMeta] : [],
      });

      if (!res.ok) {
        throw new Error(res.error ?? "Could not book appointment");
      }
      setDone(res.referenceId ?? "RS-????");
    } catch (err) {
      submittedRef.current = false;
      setErrors({ _form: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 240, damping: 18 }} className="relative mx-auto mb-6 w-fit">
          <span className="absolute -inset-4 rounded-full bg-emerald-400/30 animate-pulse-ring" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-glow-lg">
            <CheckCircle2 className="h-10 w-10" />
          </div>
        </motion.div>
        <h2 className="font-display text-2xl font-bold">Appointment requested</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Your reference ID is{" "}
          <span className="font-bold text-primary">{done}</span>. Your preferred time is held as a
          request until the team confirms it. We&apos;ve emailed you a receipt and will review your case shortly.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/dashboard/appointments">View My Appointments</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to Overview</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Book an Appointment"
        subtitle="Tell us about your case and a preferred time. We'll confirm availability within 24 hours — slots are not held until confirmed."
      />

      <form onSubmit={onSubmit} noValidate className="glass gradient-border rounded-3xl p-6 sm:p-8">
        {errors._form && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {errors._form}
          </div>
        )}

        <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-primary">
          <Lock className="h-4 w-4" /> Your details
        </h3>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Full Name" error={errors.fullName}>
            <Input required value={form.fullName} onChange={set("fullName")} placeholder="Riyad Ahmed" />
          </Field>
          <Field label="Email" error={errors.email}>
            <Input required type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
          </Field>
          <Field label="Phone / WhatsApp" error={errors.phone}>
            <Input required type="tel" value={form.phone} onChange={set("phone")} placeholder="+880 1XXX-XXXXXX" />
          </Field>
        </div>

        <h3 className="mb-4 mt-8 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-primary">
          <CalendarDays className="h-4 w-4" /> Service & schedule
        </h3>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Service" error={errors.service}>
            <select
              value={form.service}
              onChange={set("service")}
              className="form-control"
            >
              <option value="">Select a service…</option>
              {APPOINTMENT_SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Preferred Date" error={errors.date}>
            <Input required type="date" min={today} value={form.date} onChange={set("date")} />
          </Field>
          <Field label="Preferred Time" error={errors.time}>
            <select
              value={form.time}
              onChange={set("time")}
              className="form-control"
            >
              <option value="">Select a preferred time…</option>
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Timezone" error={errors.timezone}>
            <div className="relative">
              <Globe className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={form.timezone}
                onChange={set("timezone")}
                className="form-control pl-11"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </Field>
          <Field label="Priority">
            <div className="grid grid-cols-2 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, priority: p }))}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left transition-all",
                    form.priority === p
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-white/40 hover:border-primary/40 dark:bg-white/5",
                  )}
                >
                  <span className="block text-sm font-semibold">{PRIORITY_META[p].label}</span>
                  <span className="block text-[10px] text-muted-foreground">{PRIORITY_META[p].hint}</span>
                </button>
              ))}
            </div>
          </Field>
        </div>

        <h3 className="mb-4 mt-8 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-primary">
          <Clock className="h-4 w-4" /> Case details
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Problem Description" error={errors.problemDescription}>
            <Textarea
              required
              rows={5}
              value={form.problemDescription}
              onChange={set("problemDescription")}
              placeholder="Describe what happened — the platform, the issue, and any steps you already tried."
            />
          </Field>
          <Field label="Additional Details (optional)">
            <Textarea
              rows={5}
              value={form.additionalDetails}
              onChange={set("additionalDetails")}
              placeholder="Account URLs, timestamps, screenshots, previous emails…"
            />
          </Field>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Preferred Contact Method">
            <div className="flex flex-wrap gap-2">
              {CONTACT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, preferredContact: m }))}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold capitalize transition-all",
                    form.preferredContact === m
                      ? "btn-primary-glow text-white shadow-glow"
                      : "border border-border bg-white/40 text-muted-foreground hover:text-primary dark:bg-white/5",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </Field>
          <FileInput label="Optional Attachment" onChange={setFile} error={errors.file} />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Your case details are private and only visible to you and the security team.
          </p>
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Booking…
              </>
            ) : (
              <>
                <Send className="h-5 w-5" /> Book Appointment
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewAppointmentPage() {
  return (
    <Suspense>
      <BookingForm />
    </Suspense>
  );
}
