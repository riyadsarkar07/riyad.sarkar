"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Search } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { EMAIL_TICKET_STATUSES } from "@/lib/constants";
import { adminUpdateEmailTicketAction } from "@/app/ticket-actions";
import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/toast";
import type { EmailTicket } from "@/types/dashboard";

export default function AdminEmailTicketsPage() {
  const supabase = useSupabase();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<EmailTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [fStatus, setFStatus] = useState("all");

  const load = useCallback(async () => {
    const { data } = await supabase.from("email_tickets").select("*").order("created_at", { ascending: false });
    setTickets((data ?? []) as EmailTicket[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (id: string, status: string) => {
    const res = await adminUpdateEmailTicketAction({ id, status });
    if (res.ok) {
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      toast("success", "Status updated");
    } else {
      toast("error", "Update failed", res.error);
    }
  };

  const filtered = tickets.filter((t) => {
    const q = query.toLowerCase();
    const matchQ =
      !q ||
      (t.reference_id ?? "").toLowerCase().includes(q) ||
      t.full_name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.issue_type.toLowerCase().includes(q);
    return matchQ && (fStatus === "all" || t.status === fStatus);
  });

  return (
    <div>
      <PageHeader
        title="Email Support Tickets"
        subtitle="Project enquiries submitted by email. Separate from live conversations and appointments."
      />

      <div className="glass gradient-border mb-6 rounded-2xl p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search name, email, reference…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-11" />
          </div>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-12 rounded-xl border border-input bg-white/60 px-3 text-sm dark:bg-white/5" aria-label="Filter status">
            <option value="all">All statuses</option>
            {EMAIL_TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{filtered.length} tickets</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass gradient-border rounded-2xl px-6 py-16 text-center text-sm text-muted-foreground">
          No email support tickets yet.
        </div>
      ) : (
        <div className="glass gradient-border overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Issue</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-border/40 last:border-0 hover:bg-primary/5">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{t.full_name}</p>
                    <p className="text-xs text-muted-foreground">{t.email}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-primary">{t.reference_id}</td>
                  <td className="px-4 py-3">{t.issue_type}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={t.status}
                      onChange={(e) => changeStatus(t.id, e.target.value)}
                      className="h-8 rounded-md border border-input bg-transparent px-1.5 text-xs capitalize dark:bg-white/5"
                      aria-label="Status"
                    >
                      {EMAIL_TICKET_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/tickets/${t.id}`}>
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
