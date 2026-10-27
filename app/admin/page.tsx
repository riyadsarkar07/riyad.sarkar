"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  Headset,
  Mail,
  MessagesSquare,
  RefreshCw,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabase } from "@/hooks/use-supabase";
import { PageHeader } from "@/components/portal/page-header";
import { StatCard } from "@/components/portal/stat-card";
import { StatusBadge } from "@/components/portal/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment, ChatSession, ConsultationBooking, EmailTicket, SupportTicket } from "@/types/dashboard";

function fmtDate(d: string) {
  return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminOverviewPage() {
  const supabase = useSupabase();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsers: 0,
    pending: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    openTickets: 0,
    emailTickets: 0,
    liveChats: 0,
    publicBookings: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [recentTickets, setRecentTickets] = useState<SupportTicket[]>([]);
  const [recentEmailTickets, setRecentEmailTickets] = useState<EmailTicket[]>([]);
  const [recentBookings, setRecentBookings] = useState<ConsultationBooking[]>([]);
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString();
        const [
          users,
          newUsers,
          pending,
          confirmed,
          inProgress,
          completed,
          openTickets,
          emailTickets,
          liveChats,
          publicBookings,
          recentAppts,
          recentTkts,
          recentEmail,
          recentPublic,
          recentChat,
        ] = await Promise.all([
          supabase.from("profiles").select("id"),
          supabase.from("profiles").select("id").gte("created_at", monthAgo),
          supabase.from("appointments").select("id").eq("status", "pending"),
          supabase.from("appointments").select("id").eq("status", "confirmed"),
          supabase.from("appointments").select("id").eq("status", "in_progress"),
          supabase.from("appointments").select("id").eq("status", "completed"),
          supabase.from("support_tickets").select("id").in("status", ["open", "pending", "in_progress"]),
          supabase.from("email_tickets").select("id").in("status", ["open", "in_progress", "awaiting_reply"]),
          supabase.from("chat_sessions").select("id").in("status", ["waiting", "active"]),
          supabase.from("consultation_bookings").select("id").in("status", ["pending", "confirmed"]),
          supabase.from("appointments").select("*").order("created_at", { ascending: false }).limit(5),
          supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(5),
          supabase.from("email_tickets").select("*").order("created_at", { ascending: false }).limit(5),
          supabase.from("consultation_bookings").select("*").order("created_at", { ascending: false }).limit(5),
          supabase.from("chat_sessions").select("*").order("updated_at", { ascending: false }).limit(5),
        ]);
        if (!active) return;
        const failed = [
          users,
          newUsers,
          pending,
          confirmed,
          inProgress,
          completed,
          openTickets,
          emailTickets,
          liveChats,
          publicBookings,
          recentAppts,
          recentTkts,
          recentEmail,
          recentPublic,
          recentChat,
        ].find((r) => r.error);
        if (failed?.error) {
          setError(failed.error.message || "Could not load dashboard data.");
          setLoading(false);
          return;
        }
        setStats({
          totalUsers: users.data?.length ?? 0,
          newUsers: newUsers.data?.length ?? 0,
          pending: pending.data?.length ?? 0,
          confirmed: confirmed.data?.length ?? 0,
          inProgress: inProgress.data?.length ?? 0,
          completed: completed.data?.length ?? 0,
          openTickets: openTickets.data?.length ?? 0,
          emailTickets: emailTickets.data?.length ?? 0,
          liveChats: liveChats.data?.length ?? 0,
          publicBookings: publicBookings.data?.length ?? 0,
        });
        setRecentAppointments((recentAppts.data ?? []) as Appointment[]);
        setRecentTickets((recentTkts.data ?? []) as SupportTicket[]);
        setRecentEmailTickets((recentEmail.data ?? []) as EmailTicket[]);
        setRecentBookings((recentPublic.data ?? []) as ConsultationBooking[]);
        setRecentChats((recentChat.data ?? []) as ChatSession[]);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load dashboard data.");
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase, reloadKey]);

  return (
    <div>
      <PageHeader
        title="Admin Overview"
        subtitle="A live snapshot of users, appointments and support activity."
        actions={
          <Link
            href="/admin/appointments"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Manage appointments <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      {error && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error} Counts are hidden until the data loads successfully.
          </p>
          <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : error ? null : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Users" value={stats.totalUsers} icon={Users} delay={0} />
          <StatCard label="New Users (30d)" value={stats.newUsers} icon={UserPlus} delay={0.04} />
          <StatCard label="Pending Appointments" value={stats.pending} icon={Clock} delay={0.08} />
          <StatCard label="Confirmed" value={stats.confirmed} icon={CalendarCheck} delay={0.12} />
          <StatCard label="In Progress" value={stats.inProgress} icon={CalendarClock} delay={0.16} />
          <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} delay={0.2} />
          <StatCard label="Support Inbox" value={stats.openTickets} icon={MessagesSquare} delay={0.24} />
          <StatCard label="Live Chat" value={stats.liveChats} icon={Headset} delay={0.26} />
          <StatCard label="Project Enquiries" value={stats.emailTickets} icon={Mail} delay={0.28} />
          <StatCard label="Public Bookings" value={stats.publicBookings} icon={CalendarClock} delay={0.32} />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass gradient-border rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-bold">
              <CalendarCheck className="h-4 w-4 text-cyan-500" /> Recent Appointments
            </h2>
            <Link href="/admin/appointments" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Unable to load appointments.</p>
          ) : recentAppointments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No appointments yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {recentAppointments.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/appointments/${a.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/40 px-4 py-3 transition-colors hover:border-primary/40 dark:bg-white/5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{a.service}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="font-medium text-primary">{a.reference_id}</span> · {a.full_name} ·{" "}
                        {fmtDate(a.appointment_date)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass gradient-border rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-base font-bold">
                <MessagesSquare className="h-4 w-4 text-cyan-500" /> Support Inbox
              </h2>
              <Link href="/admin/support" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                Open Support Inbox <ArrowRight className="h-3 w-3" />
              </Link>
          </div>
          {loading ? (
            <div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Unable to load conversations.</p>
          ) : recentTickets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No support tickets yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {recentTickets.map((t) => (
                <li key={t.id}>
                  <Link href="/admin/support" className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/40 px-4 py-3 transition-colors hover:border-primary/40 dark:bg-white/5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{t.subject}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="font-medium text-primary">{t.reference_id}</span> · {fmtDate(t.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass gradient-border rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-bold">
              <Mail className="h-4 w-4 text-cyan-500" /> Project Enquiries
            </h2>
            <Link href="/admin/tickets" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Unable to load project enquiries.</p>
          ) : recentEmailTickets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No project enquiries yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {recentEmailTickets.map((t) => (
                <li key={t.id}>
                  <Link href={`/admin/tickets/${t.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/40 px-4 py-3 transition-colors hover:border-primary/40 dark:bg-white/5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{t.issue_type}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="font-medium text-primary">{t.reference_id}</span> · {t.full_name}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass gradient-border rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-bold">
              <CalendarClock className="h-4 w-4 text-cyan-500" /> Public Consultation Bookings
            </h2>
            <Link href="/admin/appointments" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Unable to load public bookings.</p>
          ) : recentBookings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No public bookings yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {recentBookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/40 px-4 py-3 dark:bg-white/5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{b.service}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-medium text-primary">{b.reference_id}</span> · {b.full_name} · {fmtDate(b.appointment_date)}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>

      <div className="mt-6">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass gradient-border rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-bold">
              <Headset className="h-4 w-4 text-cyan-500" /> Live Chat
            </h2>
            <Link href="/admin/chat" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Open Live Chat <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Unable to load live chat.</p>
          ) : recentChats.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No live chat sessions yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {recentChats.map((s) => (
                <li key={s.id}>
                  <Link href="/admin/chat" className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/40 px-4 py-3 transition-colors hover:border-primary/40 dark:bg-white/5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{s.reference_id ?? "Session"}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {s.last_message_preview || "No messages yet"} · {fmtDate(s.updated_at)}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>
    </div>
  );
}
