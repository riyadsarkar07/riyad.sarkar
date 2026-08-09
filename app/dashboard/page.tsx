"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSupabase } from "@/hooks/use-supabase";
import { StatCard } from "@/components/portal/stat-card";
import { StatusBadge } from "@/components/portal/status-badge";
import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment, Notification, SupportTicket } from "@/types/dashboard";

function formatDate(d: string) {
  return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardOverviewPage() {
  const { profile } = useAuth();
  const supabase = useSupabase();
  const [stats, setStats] = useState({
    upcoming: 0,
    pending: 0,
    openTickets: 0,
    completed: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [recentTickets, setRecentTickets] = useState<SupportTicket[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [up, ap, pending, tickets, completed, notifs] = await Promise.all([
        supabase
          .from("appointments")
          .select("id")
          .in("status", ["pending", "confirmed", "in_progress", "reschedule_requested"])
          .gte("appointment_date", today),
        supabase
          .from("appointments")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("appointments").select("id").eq("status", "pending"),
        supabase
          .from("support_tickets")
          .select("id")
          .in("status", ["open", "pending", "in_progress"]),
        supabase
          .from("appointments")
          .select("id")
          .eq("status", "completed"),
        supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      if (!active) return;
      setStats({
        upcoming: up.data?.length ?? 0,
        pending: pending.data?.length ?? 0,
        openTickets: tickets.data?.length ?? 0,
        completed: completed.data?.length ?? 0,
      });
      setRecentAppointments((ap.data ?? []) as Appointment[]);
      setNotifications((notifs.data ?? []) as Notification[]);

      const recent = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (!active) return;
      setRecentTickets((recent.data ?? []) as SupportTicket[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Manage your appointments, support tickets and profile from one place."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/dashboard/support">
                <MessagesSquare className="h-4 w-4" /> Open Support
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/appointments/new">
                <CalendarPlus className="h-4 w-4" /> Book Appointment
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Upcoming Appointments" value={stats.upcoming} icon={CalendarClock} delay={0} />
        <StatCard label="Pending" value={stats.pending} icon={Clock} delay={0.05} />
        <StatCard label="Open Support Tickets" value={stats.openTickets} icon={MessagesSquare} delay={0.1} />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} delay={0.15} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent appointments */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass gradient-border rounded-2xl p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-bold">
              <CalendarDays className="h-4 w-4 text-cyan-500" /> Recent Appointments
            </h2>
            <Link href="/dashboard/appointments" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : recentAppointments.length === 0 ? (
            <EmptyState
              icon={<CalendarPlus className="h-5 w-5" />}
              text="No appointments yet — book your first one."
              href="/dashboard/appointments/new"
              cta="Book Appointment"
            />
          ) : (
            <ul className="space-y-2.5">
              {recentAppointments.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/dashboard/appointments/${a.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/40 px-4 py-3 transition-colors hover:border-primary/40 dark:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{a.service}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="font-medium text-primary">{a.reference_id}</span> ·{" "}
                        {formatDate(a.appointment_date)} at {a.appointment_time}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        {/* Recent tickets */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass gradient-border rounded-2xl p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-bold">
              <MessagesSquare className="h-4 w-4 text-cyan-500" /> Recent Support Tickets
            </h2>
            <Link href="/dashboard/support" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : recentTickets.length === 0 ? (
            <EmptyState
              icon={<MessagesSquare className="h-5 w-5" />}
              text="No support tickets yet — we're here if you need us."
              href="/dashboard/support"
              cta="Open Support"
            />
          ) : (
            <ul className="space-y-2.5">
              {recentTickets.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/dashboard/support/${t.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/40 px-4 py-3 transition-colors hover:border-primary/40 dark:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{t.subject}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="font-medium text-primary">{t.reference_id}</span> ·{" "}
                        {formatDate(t.created_at)}
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

      {/* Notifications */}
      {!loading && notifications.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass gradient-border mt-6 rounded-2xl p-5"
        >
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold">
            <Bell className="h-4 w-4 text-cyan-500" /> Recent Activity
          </h2>
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li key={n.id} className="flex items-start gap-3 rounded-xl bg-primary/5 px-4 py-2.5">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                </div>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                  {formatDate(n.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </motion.section>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  text,
  href,
  cta,
}: {
  icon: React.ReactNode;
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-4 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{text}</p>
      <Button variant="outline" size="sm" asChild>
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}
