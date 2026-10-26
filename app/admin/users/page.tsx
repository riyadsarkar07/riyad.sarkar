"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, Search, UserRound } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { PageHeader } from "@/components/portal/page-header";
import { LoadError } from "@/components/portal/load-error";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment, Profile, SupportTicket } from "@/types/dashboard";

type Row = Profile & { appointmentCount: number; ticketCount: number };

export default function AdminUsersPage() {
  const supabase = useSupabase();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [p, a, t] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("appointments").select("user_id"),
      supabase.from("support_tickets").select("user_id"),
    ]);
    const failed = [p, a, t].find((r) => r.error);
    if (failed?.error) {
      setLoadError(failed.error.message || "Could not load users.");
      setRows([]);
      setLoading(false);
      return;
    }
    const apptCounts: Record<string, number> = {};
    for (const row of a.data ?? []) apptCounts[(row as Appointment).user_id] = (apptCounts[(row as Appointment).user_id] ?? 0) + 1;
    const ticketCounts: Record<string, number> = {};
    for (const row of t.data ?? []) ticketCounts[(row as SupportTicket).user_id] = (ticketCounts[(row as SupportTicket).user_id] ?? 0) + 1;
    setRows(
      ((p.data ?? []) as Profile[]).map((profile) => ({
        ...profile,
        appointmentCount: apptCounts[profile.id] ?? 0,
        ticketCount: ticketCounts[profile.id] ?? 0,
      })),
    );
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter((r) => {
    const q = query.toLowerCase();
    return !q || r.full_name?.toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q) || r.phone?.toLowerCase().includes(q);
  });

  const totalAppointments = rows.reduce((n, r) => n + r.appointmentCount, 0);
  const totalTickets = rows.reduce((n, r) => n + r.ticketCount, 0);

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="All registered clients and their activity. Passwords are never stored here."
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, email, phone…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-11" />
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} users · {totalAppointments} appointments · {totalTickets} tickets
        </span>
      </div>

      {loadError && <LoadError message={loadError} onRetry={() => load()} />}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : loadError ? null : filtered.length === 0 ? (
        <div className="glass gradient-border rounded-2xl px-6 py-16 text-center text-sm text-muted-foreground">No users found.</div>
      ) : (
        <div className="glass gradient-border overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Timezone</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Appointments</th>
                <th className="px-4 py-3">Tickets</th>
                <th className="px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border/40 transition-colors last:border-0 hover:bg-primary/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600/20 to-cyan-400/20 text-cyan-500">
                        <UserRound className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{r.full_name ?? "—"}</p>
                        <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">{r.timezone ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 font-semibold text-primary">{r.appointmentCount}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{r.ticketCount}</td>
                  <td className="px-4 py-3">
                    {r.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        <Crown className="h-3 w-3" /> Admin
                      </span>
                    ) : (
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">User</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
