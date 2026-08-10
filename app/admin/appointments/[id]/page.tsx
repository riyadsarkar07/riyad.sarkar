"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarClock, Download, FileText, Loader2, Save, StickyNote } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { APPOINTMENT_SERVICES, APPOINTMENT_STATUSES, PRIORITIES, TIME_SLOTS } from "@/lib/constants";
import { adminUpdateAppointmentAction } from "@/app/actions";
import { PageHeader } from "@/components/portal/page-header";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/toast";
import type { Appointment, AppointmentFile, SupportTicket } from "@/types/dashboard";

export default function AdminAppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const supabase = useSupabase();
  const { toast } = useToast();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [files, setFiles] = useState<AppointmentFile[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [appt, f, t] = await Promise.all([
        supabase.from("appointments").select("*").eq("id", id).maybeSingle(),
        supabase.from("appointment_files").select("*").eq("appointment_id", id),
        supabase.from("support_tickets").select("*").eq("appointment_id", id),
      ]);
      if (!active) return;
      if (appt.data) {
        const a = appt.data as Appointment;
        setAppointment(a);
        setStatus(a.status);
        setPriority(a.priority);
        setDate(a.appointment_date);
        setTime(a.appointment_time);
        setNotes(a.admin_notes ?? "");
      }
      setFiles((f.data ?? []) as AppointmentFile[]);
      setTickets((t.data ?? []) as SupportTicket[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase, id]);

  const save = async () => {
    setSaving(true);
    const res = await adminUpdateAppointmentAction({
      id,
      status,
      priority,
      date,
      time,
      adminNotes: notes,
    });
    setSaving(false);
    if (res.ok) {
      setAppointment((prev) => (prev ? { ...prev, status: status as Appointment["status"], priority: priority as Appointment["priority"], appointment_date: date, appointment_time: time, admin_notes: notes } : prev));
      toast("success", "Appointment updated");
    } else {
      toast("error", "Update failed", res.error);
    }
  };

  const downloadFile = async (f: AppointmentFile) => {
    const { data } = await supabase.storage.from("appointment-files").createSignedUrl(f.storage_path, 120);
    if (data) window.open(data.signedUrl, "_blank");
    else toast("error", "Could not open file");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div>
        <PageHeader title="Appointment not found" />
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/appointments" className="text-primary hover:underline">Back to appointments</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link href="/admin/appointments" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Appointments
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{appointment.full_name}</h1>
            <StatusBadge status={appointment.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-semibold text-primary">{appointment.reference_id}</span> · {appointment.email} ·{" "}
            {appointment.phone}
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-6">
          <section className="glass gradient-border rounded-2xl p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold">
              <CalendarClock className="h-4 w-4 text-cyan-500" /> Schedule & details
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-muted-foreground">Service</span>
                <select value={appointment.service} disabled className="h-12 w-full rounded-xl border border-input bg-white/40 px-4 text-sm dark:bg-white/5">
                  {APPOINTMENT_SERVICES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-muted-foreground">Date</span>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-muted-foreground">Time</span>
                <select value={time} onChange={(e) => setTime(e.target.value)} className="h-12 w-full rounded-xl border border-input bg-white/60 px-4 text-sm dark:bg-white/5">
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-muted-foreground">Status</span>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" className="h-12 w-full rounded-xl border border-input bg-white/60 px-4 text-sm capitalize dark:bg-white/5">
                    {APPOINTMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-muted-foreground">Priority</span>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority" className="h-12 w-full rounded-xl border border-input bg-white/60 px-4 text-sm capitalize dark:bg-white/5">
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Timezone: <span className="font-medium">{appointment.timezone}</span> · Preferred contact:{" "}
                <span className="font-medium capitalize">{appointment.preferred_contact}</span> · Created{" "}
                {new Date(appointment.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          </section>

          <section className="glass gradient-border rounded-2xl p-6">
            <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
              <StickyNote className="h-4 w-4 text-cyan-500" /> Problem description
            </h2>
            <p className="whitespace-pre-wrap rounded-xl bg-primary/5 p-4 text-sm leading-relaxed">{appointment.problem_description}</p>
            {appointment.additional_details && (
              <>
                <h3 className="mt-5 mb-2 text-sm font-semibold text-muted-foreground">Additional details</h3>
                <p className="whitespace-pre-wrap rounded-xl bg-primary/5 p-4 text-sm leading-relaxed">{appointment.additional_details}</p>
              </>
            )}
          </section>

          <section className="glass gradient-border rounded-2xl p-6">
            <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
              <StickyNote className="h-4 w-4 text-cyan-500" /> Admin notes
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Private notes visible only to the admin…"
              className="w-full rounded-xl border border-input bg-white/60 px-4 py-3 text-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none dark:bg-white/5"
            />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="glass gradient-border rounded-2xl p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold">
              <FileText className="h-4 w-4 text-cyan-500" /> Attachments
            </h2>
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files attached.</p>
            ) : (
              <ul className="space-y-2">
                {files.map((f) => (
                  <li key={f.id}>
                    <button onClick={() => downloadFile(f)} className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-white/40 px-3 py-2.5 text-left transition-colors hover:border-primary/40 dark:bg-white/5">
                      <Download className="h-4 w-4 shrink-0 text-cyan-500" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{f.file_name}</p>
                        <p className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="glass gradient-border rounded-2xl p-6">
            <h2 className="mb-4 font-display text-base font-bold">Linked support tickets</h2>
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No linked tickets.</p>
            ) : (
              <ul className="space-y-2">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <Link href="/admin/support" className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-white/40 px-3 py-2.5 transition-colors hover:border-primary/40 dark:bg-white/5">
                      <span className="min-w-0 truncate text-sm font-medium">
                        <span className="text-primary">{t.reference_id}</span> · {t.subject}
                      </span>
                      <StatusBadge status={t.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
