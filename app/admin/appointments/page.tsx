"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Eye, Search } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { APPOINTMENT_STATUSES, PRIORITIES } from "@/lib/constants";
import { adminUpdateAppointmentAction } from "@/app/actions";
import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/toast";
import type { Appointment } from "@/types/dashboard";

type SortKey = "created_at" | "appointment_date" | "full_name" | "priority";

export default function AdminAppointmentsPage() {
  const supabase = useSupabase();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fService, setFService] = useState("all");
  const [fPriority, setFPriority] = useState("all");
  const [fDate, setFDate] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .order(sortKey, { ascending: sortDir === "asc" });
    setAppointments((data ?? []) as Appointment[]);
    setLoading(false);
  }, [supabase, sortKey, sortDir]);

  useEffect(() => {
    load();
  }, [load]);

  const services = Array.from(new Set(appointments.map((a) => a.service)));

  const changeStatus = async (id: string, status: string) => {
    const res = await adminUpdateAppointmentAction({ id, status });
    if (res.ok) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: status as Appointment["status"] } : a)));
      toast("success", "Status updated");
    } else {
      toast("error", "Update failed", res.error);
    }
  };

  const changePriority = async (id: string, priority: string) => {
    const res = await adminUpdateAppointmentAction({ id, priority });
    if (res.ok) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, priority: priority as Appointment["priority"] } : a)));
      toast("success", "Priority updated");
    } else {
      toast("error", "Update failed", res.error);
    }
  };

  const filtered = appointments.filter((a) => {
    const q = query.toLowerCase();
    const matchQ =
      !q ||
      (a.reference_id ?? "").toLowerCase().includes(q) ||
      a.full_name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.service.toLowerCase().includes(q);
    const matchStatus = fStatus === "all" || a.status === fStatus;
    const matchService = fService === "all" || a.service === fService;
    const matchPriority = fPriority === "all" || a.priority === fPriority;
    const matchDate = !fDate || a.appointment_date === fDate;
    return matchQ && matchStatus && matchService && matchPriority && matchDate;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="View, filter, sort and manage every client appointment."
      />

      <div className="glass gradient-border mb-6 rounded-2xl p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search name, email, reference, service…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-11" />
          </div>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-12 rounded-xl border border-input bg-white/60 px-3 text-sm dark:bg-white/5" aria-label="Filter status">
            <option value="all">All statuses</option>
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
          <select value={fService} onChange={(e) => setFService(e.target.value)} className="h-12 rounded-xl border border-input bg-white/60 px-3 text-sm dark:bg-white/5" aria-label="Filter service">
            <option value="all">All services</option>
            {services.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={fPriority} onChange={(e) => setFPriority(e.target.value)} className="h-12 rounded-xl border border-input bg-white/60 px-3 text-sm dark:bg-white/5" aria-label="Filter priority">
            <option value="all">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className="h-10 w-44 text-sm" aria-label="Filter date" />
          <span className="text-xs text-muted-foreground">{filtered.length} appointments</span>
          {(query || fStatus !== "all" || fService !== "all" || fPriority !== "all" || fDate) && (
            <button
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => {
                setQuery(""); setFStatus("all"); setFService("all"); setFPriority("all"); setFDate("");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass gradient-border rounded-2xl px-6 py-16 text-center text-sm text-muted-foreground">
          No appointments match your filters.
        </div>
      ) : (
        <div className="glass gradient-border overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort("full_name")} className="inline-flex items-center gap-1 hover:text-primary">
                    Client <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort("appointment_date")} className="inline-flex items-center gap-1 hover:text-primary">
                    Date <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-border/40 transition-colors last:border-0 hover:bg-primary/5">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{a.full_name}</p>
                    <p className="text-xs text-muted-foreground">{a.email}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-primary">{a.reference_id}</td>
                  <td className="px-4 py-3">{a.service}</td>
                  <td className="px-4 py-3">
                    {new Date(a.appointment_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    <p className="text-xs text-muted-foreground">{a.appointment_time}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={a.priority}
                      onChange={(e) => changePriority(a.id, e.target.value)}
                      className="h-8 rounded-md border border-input bg-transparent px-1.5 text-xs capitalize dark:bg-white/5"
                      aria-label="Priority"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={a.status}
                      onChange={(e) => changeStatus(a.id, e.target.value)}
                      className="h-8 rounded-md border border-input bg-transparent px-1.5 text-xs capitalize dark:bg-white/5"
                      aria-label="Status"
                    >
                      {APPOINTMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace("_", " ")}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/appointments/${a.id}`}>
                        <Eye className="h-3.5 w-3.5" /> Open
                      </Link>
                    </Button>
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
