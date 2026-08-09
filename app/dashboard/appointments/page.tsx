"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Eye, MessagesSquare, Search } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/portal/page-header";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment } from "@/types/dashboard";

const STATUSES = ["all", "pending", "confirmed", "in_progress", "completed", "cancelled", "reschedule_requested"];

export default function MyAppointmentsPage() {
  const supabase = useSupabase();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      setAppointments((data ?? []) as Appointment[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase, user]);

  const filtered = appointments.filter((a) => {
    const statusOk = filter === "all" || a.status === filter;
    const q = query.toLowerCase();
    const searchOk =
      !q ||
      (a.reference_id ?? "").toLowerCase().includes(q) ||
      a.service.toLowerCase().includes(q);
    return statusOk && searchOk;
  });

  return (
    <div>
      <PageHeader
        title="My Appointments"
        subtitle="Every appointment you've booked, with full details and quick actions."
        actions={
          <Button asChild>
            <Link href="/dashboard/appointments/new">
              <CalendarPlus className="h-4 w-4" /> Book Appointment
            </Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reference or service…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-11"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                filter === s
                  ? "btn-primary-glow text-white shadow-glow"
                  : "border border-border bg-white/40 text-muted-foreground hover:text-primary dark:bg-white/5"
              }`}
            >
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass gradient-border flex flex-col items-center gap-4 rounded-3xl px-6 py-16 text-center">
          <CalendarPlus className="h-10 w-10 text-cyan-500" />
          <p className="max-w-sm text-sm text-muted-foreground">
            {appointments.length === 0
              ? "You haven't booked any appointments yet."
              : "No appointments match your filters."}
          </p>
          <Button asChild>
            <Link href="/dashboard/appointments/new">Book Appointment</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((a) => (
            <div key={a.id} className="glass gradient-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-primary">{a.reference_id}</p>
                  <p className="mt-1 truncate text-base font-semibold">{a.service}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Date</dt>
                  <dd className="font-medium">
                    {new Date(a.appointment_date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Time</dt>
                  <dd className="font-medium">{a.appointment_time}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Priority</dt>
                  <dd className="font-medium capitalize">{a.priority}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Created</dt>
                  <dd className="font-medium">
                    {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex items-center gap-3">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/appointments/${a.id}`}>
                    <Eye className="h-4 w-4" /> View Details
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/dashboard/support?appointment=${a.id}`}>
                    <MessagesSquare className="h-4 w-4" /> Contact Support
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
