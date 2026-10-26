"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { EMAIL_TICKET_STATUSES } from "@/lib/constants";
import { adminReplyEmailTicketAction, adminUpdateEmailTicketAction } from "@/app/ticket-actions";
import { PageHeader } from "@/components/portal/page-header";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/lib/toast";
import type { EmailTicket, EmailTicketReply } from "@/types/dashboard";
import { cn } from "@/lib/utils";

export default function AdminEmailTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const supabase = useSupabase();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<EmailTicket | null>(null);
  const [replies, setReplies] = useState<EmailTicketReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [t, r] = await Promise.all([
        supabase.from("email_tickets").select("*").eq("id", id).maybeSingle(),
        supabase.from("email_ticket_replies").select("*").eq("ticket_id", id).order("created_at", { ascending: true }),
      ]);
      if (!active) return;
      if (t.data) {
        const row = t.data as EmailTicket;
        setTicket(row);
        setStatus(row.status);
      }
      setReplies((r.data ?? []) as EmailTicketReply[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase, id]);

  const saveStatus = async () => {
    setSaving(true);
    const res = await adminUpdateEmailTicketAction({ id, status });
    setSaving(false);
    if (res.ok) {
      setTicket((prev) => (prev ? { ...prev, status } : prev));
      toast("success", "Status updated");
    } else {
      toast("error", "Update failed", res.error);
    }
  };

  const sendReply = async () => {
    if (message.trim().length < 2) return;
    setSaving(true);
    const res = await adminReplyEmailTicketAction({ id, message });
    setSaving(false);
    if (res.ok) {
      setReplies((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          ticket_id: id,
          sender_role: "admin",
          sender_id: null,
          message,
          created_at: new Date().toISOString(),
        },
      ]);
      setMessage("");
      setStatus("awaiting_reply");
      setTicket((prev) => (prev ? { ...prev, status: "awaiting_reply" } : prev));
      toast("success", "Reply sent");
    } else {
      toast("error", "Reply failed", res.error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!ticket) {
    return <p className="text-sm text-muted-foreground">Ticket not found.</p>;
  }

  return (
    <div>
      <Link href="/admin/tickets" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Project Enquiries
      </Link>
      <PageHeader
        title={ticket.reference_id ?? "Ticket"}
        subtitle={`${ticket.full_name} · ${ticket.email}`}
        actions={<StatusBadge status={ticket.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="glass gradient-border rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{ticket.issue_type}</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{ticket.message}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Phone</dt>
              <dd>{ticket.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Budget</dt>
              <dd>{ticket.budget || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Timeline</dt>
              <dd>{ticket.timeline || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Submitted</dt>
              <dd>{new Date(ticket.created_at).toLocaleString()}</dd>
            </div>
          </dl>
        </section>

        <section className="glass gradient-border rounded-2xl p-5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-white/60 px-3 text-sm dark:bg-white/5">
            {EMAIL_TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <Button className="mt-3 w-full" onClick={saveStatus} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save status
          </Button>
        </section>
      </div>

      <section className="glass gradient-border mt-6 rounded-2xl p-5">
        <h2 className="font-display text-base font-bold">Replies</h2>
        <div className="mt-4 space-y-3">
          {replies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No replies yet.</p>
          ) : (
            replies.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm",
                  item.sender_role === "admin"
                    ? "border border-cyan-400/20 bg-cyan-500/5"
                    : "border border-border bg-white/40 dark:bg-white/5",
                )}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.sender_role === "admin" ? "Admin" : "User"} · {new Date(item.created_at).toLocaleString()}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{item.message}</p>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 space-y-3">
          <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write a reply…" />
          <Button onClick={sendReply} disabled={saving || message.trim().length < 2}>
            <Send className="h-4 w-4" /> Send reply
          </Button>
        </div>
      </section>
    </div>
  );
}
