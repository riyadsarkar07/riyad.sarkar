"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  MessagesSquare,
  UserPlus,
  Users,
} from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { PageHeader } from "@/components/portal/page-header";
import { StatCard } from "@/components/portal/stat-card";
import { StatusBadge } from "@/components/portal/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment, SupportTicket } from "@/types/dashboard";

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
  });
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [recentTickets, setRecentTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString();
      const [
        users,
        newUsers,
        pending,
        confirmed,
        inProgress,
        completed,
        openTickets,
        recentAppts,
        recentTkts,
      ] = await Promise.all([
        supabase.from("profiles").select("id"),
        supabase.from("profiles").select("id").gte("created_at", monthAgo),
        supabase.from("appointments").select("id").eq("status", "pending"),
        supabase.from("appointments").select("id").eq("status", "confirmed"),
        supabase.from("appointments").select("id").eq("status", "in_progress"),
        supabase.from("appointments").select("id").eq("status", "completed"),
        supabase.from("support_tickets").select("id").in("status", ["open", "pending", "in_progress"]),
        supabase.from("appointments").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      if (!active) return;
      setStats({
        totalUsers: users.data?.length ?? 0,
        newUsers: newUsers.data?.length ?? 0,
        pending: pending.data?.length ?? 0,
        confirmed: confirmed.data?.length ?? 0,
        inProgress: inProgress.data?.length ?? 0,
        completed: completed.data?.length ?? 0,
        openTickets: openTickets.data?.length ?? 0,
      });
      setRecentAppointments((recentAppts.data ?? []) as Appointment[]);
      setRecentTickets((recentTkts.data ?? []) as SupportTicket[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

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

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Users" value={stats.totalUsers} icon={Users} delay={0} />
          <StatCard label="New Users (30d)" value={stats.newUsers} icon={UserPlus} delay={0.04} />
          <StatCard label="Pending Appointments" value={stats.pending} icon={Clock} delay={0.08} />
          <StatCard label="Confirmed" value={stats.confirmed} icon={CalendarCheck} delay={0.12} />
          <StatCard label="In Progress" value={stats.inProgress} icon={CalendarClock} delay={0.16} />
          <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} delay={0.2} />
          <StatCard label="Open Support Tickets" value={stats.openTickets} icon={MessagesSquare} delay={0.24} />
          <StatCard label="Total Appointments" value={stats.pending + stats.confirmed + stats.inProgress + stats.completed} icon={CalendarClock} delay={0.28} />
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
              <MessagesSquare className="h-4 w-4 text-cyan-500" /> Recent Support Tickets
            </h2>
            <Link href="/admin/support" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Open inbox <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
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

      {loading && <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-cyan-500" />}
    </div>
  );
}
