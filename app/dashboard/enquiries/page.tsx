"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/portal/page-header";
import { StatusBadge } from "@/components/portal/status-badge";
import { LoadError } from "@/components/portal/load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { EmailTicket } from "@/types/dashboard";

export default function MyEnquiriesPage() {
  const supabase = useSupabase();
  const { user, profile } = useAuth();
  const [tickets, setTickets] = useState<EmailTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    if (!user) return;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const email = profile?.email ?? user.email ?? "";
      let q = supabase.from("email_tickets").select("*").order("created_at", { ascending: false });
      q = email ? q.or(`user_id.eq.${user.id},email.eq.${email}`) : q.eq("user_id", user.id);
      const { data, error } = await q;
      if (!active) return;
      if (error) {
        setLoadError(error.message || "Could not load project enquiries.");
        setTickets([]);
      } else {
        setTickets((data ?? []) as EmailTicket[]);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase, user, profile, reloadKey]);

  return (
    <div>
      <PageHeader
        title="Project Enquiries"
        subtitle="Website and security project requests you submitted from the contact form. Live Support Inbox conversations are separate."
        actions={
          <Button asChild variant="outline">
            <Link href="/track">Track with enquiry number</Link>
          </Button>
        }
      />

      {loadError && (
        <LoadError message={loadError} onRetry={() => setReloadKey((k) => k + 1)} />
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : loadError ? null : tickets.length === 0 ? (
        <div className="glass gradient-border flex flex-col items-center gap-4 rounded-3xl px-6 py-16 text-center">
          <Mail className="h-10 w-10 text-cyan-500" />
          <p className="max-w-sm text-sm text-muted-foreground">You have not submitted a project enquiry yet.</p>
          <Button asChild>
            <Link href="/#contact">Start a project enquiry</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tickets.map((t) => (
            <div key={t.id} className="glass gradient-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-sm font-bold text-primary">{t.reference_id}</p>
                  <p className="mt-1 font-semibold">{t.issue_type}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{t.message}</p>
              <p className="mt-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
