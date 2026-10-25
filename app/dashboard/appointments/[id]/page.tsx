"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarSync,
  Download,
  FileText,
  ImageIcon,
  Loader2,
  MessagesSquare,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSupabase } from "@/hooks/use-supabase";
import {
  requestCancellationAction,
  requestRescheduleAction,
} from "@/app/actions";
import { PageHeader } from "@/components/portal/page-header";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TIME_SLOTS } from "@/lib/constants";
import type { Appointment, AppointmentFile } from "@/types/dashboard";

function fmt(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function AppointmentDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = useSupabase();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [files, setFiles] = useState<AppointmentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reschedule, setReschedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [busy, setBusy] = useState<"reschedule" | "cancel" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();
      if (!active) return;
      if (error || !data || data.user_id !== user.id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setAppointment(data as Appointment);
      const { data: f } = await supabase
        .from("appointment_files")
        .select("*")
        .eq("appointment_id", params.id);
      if (active) setFiles((f ?? []) as AppointmentFile[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase, params.id, user]);

  const downloadFile = async (file: AppointmentFile) => {
    const { data } = await supabase.storage
      .from("appointment-files")
      .createSignedUrl(file.storage_path, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const doReschedule = async () => {
    if (!appointment || !newDate || !newTime) return;
    setBusy("reschedule");
    const res = await requestRescheduleAction(appointment.id, newDate, newTime);
    setBusy(null);
    if (res.ok) {
      setMsg("Reschedule requested — the team will confirm the new slot.");
      setReschedule(false);
      setAppointment({ ...appointment, appointment_date: newDate, appointment_time: newTime, status: "reschedule_requested" });
    } else {
      setMsg(res.error ?? "Could not request reschedule");
    }
  };

  const doCancel = async () => {
    if (!appointment) return;
    setBusy("cancel");
    const res = await requestCancellationAction(appointment.id);
    setBusy(null);
    if (res.ok) {
      setMsg("Appointment cancellation requested.");
      setAppointment({ ...appointment, status: "cancelled" });
    } else {
      setMsg(res.error ?? "Could not request cancellation");
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64" /></div>;
  }

  if (notFound || !appointment) {
    return (
      <div className="glass gradient-border flex flex-col items-center gap-4 rounded-3xl px-6 py-16 text-center">
        <X className="h-10 w-10 text-red-500" />
        <p className="text-sm text-muted-foreground">Appointment not found or you don't have access to it.</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/appointments")}>Back to appointments</Button>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push("/dashboard/appointments")}>
        <ArrowLeft className="h-4 w-4" /> Back to My Appointments
      </Button>

      <PageHeader
        title={appointment.reference_id ?? "Appointment"}
        subtitle={`${appointment.service} · booked ${fmt(appointment.created_at)}`}
        actions={<StatusBadge status={appointment.status} />}
      />

      {msg && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
          {msg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass gradient-border rounded-2xl p-6">
          <h2 className="mb-4 font-display text-base font-bold">Full Details</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {[
              ["Client", appointment.full_name],
              ["Email", appointment.email],
              ["Phone / WhatsApp", appointment.phone],
              ["Service", appointment.service],
              ["Date", fmt(appointment.appointment_date + "T00:00:00")],
              ["Time", `${appointment.appointment_time} · ${appointment.timezone}`],
              ["Priority", appointment.priority],
              ["Preferred Contact", appointment.preferred_contact],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 font-medium">{v}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Problem Description</dt>
              <dd className="mt-0.5 whitespace-pre-line text-sm leading-relaxed">{appointment.problem_description}</dd>
            </div>
            {appointment.additional_details && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Additional Details</dt>
                <dd className="mt-0.5 whitespace-pre-line text-sm leading-relaxed">{appointment.additional_details}</dd>
              </div>
            )}
          </dl>

          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold">Attachments ({files.length})</h3>
              <ul className="space-y-2">
                {files.map((f) => (
                  <li key={f.id}>
                    <button
                      onClick={() => downloadFile(f)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-white/40 px-4 py-3 text-left transition-colors hover:border-primary/40 dark:bg-white/5"
                    >
                      {f.mime_type.startsWith("image/") ? (
                        <ImageIcon className="h-5 w-5 shrink-0 text-cyan-500" />
                      ) : (
                        <FileText className="h-5 w-5 shrink-0 text-cyan-500" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.file_name}</span>
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-5">
          <div className="glass gradient-border rounded-2xl p-6">
            <h2 className="mb-3 font-display text-base font-bold">Appointment Actions</h2>
            {reschedule ? (
              <div className="space-y-3">
                <Input type="date" min={today} value={newDate} onChange={(e) => setNewDate(e.target.value)} aria-label="New date" />
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="flex h-12 w-full rounded-xl border border-input bg-white/60 px-4 py-2 text-sm text-foreground shadow-sm transition-all focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none dark:bg-white/5"
                  aria-label="New time"
                >
                  <option value="">Select a preferred time…</option>
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button size="sm" onClick={doReschedule} disabled={busy === "reschedule" || !newDate || !newTime}>
                    {busy === "reschedule" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirm
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setReschedule(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={appointment.status === "cancelled" || appointment.status === "completed"}
                  onClick={() => setReschedule(true)}
                >
                  <CalendarSync className="h-4 w-4" /> Request Reschedule
                </Button>
                <Button
                  variant="outline"
                  className="mt-3 w-full hover:border-red-500/40 hover:text-red-500"
                  disabled={appointment.status === "cancelled" || appointment.status === "completed"}
                  onClick={doCancel}
                >
                  {busy === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Request Cancellation
                </Button>
                <Button variant="ghost" className="mt-3 w-full" asChild>
                  <Link href={`/dashboard/support?appointment=${appointment.id}`}>
                    <MessagesSquare className="h-4 w-4" /> Contact Support About This Appointment
                  </Link>
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function AppointmentDetailPage() {
  return (
    <Suspense>
      <AppointmentDetail />
    </Suspense>
  );
}
