"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, Search, Send } from "lucide-react";
import { lookupEmailTicketAction, replyEmailTicketAction, type TrackedTicket } from "@/app/ticket-actions";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClientTimeoutError, cn, withClientTimeout } from "@/lib/utils";

export default function TrackEnquiryPage() {
  const [email, setEmail] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TrackedTicket | null>(null);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);

  const onLookup = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await withClientTimeout(
        lookupEmailTicketAction({ email, referenceId }),
        20_000,
        "ticket lookup",
      );
      if (!result.ok) {
        setTicket(null);
        setError(result.error);
        return;
      }
      setTicket(result.ticket);
    } catch (error) {
      setTicket(null);
      setError(error instanceof ClientTimeoutError ? "The lookup timed out. Please try again." : "Unable to look up this ticket right now.");
    } finally {
      setLoading(false);
    }
  };

  const onReply = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!ticket || replying) return;
    setReplying(true);
    setError(null);
    try {
      const result = await withClientTimeout(
        replyEmailTicketAction({ email, referenceId: ticket.reference_id, message: reply }),
        20_000,
        "ticket reply",
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              status: prev.status === "resolved" ? prev.status : "in_progress",
              replies: [...prev.replies, result.reply],
            }
          : prev,
      );
      setReply("");
    } catch (error) {
      setError(error instanceof ClientTimeoutError ? "The reply timed out. Please try again." : "Unable to send that reply right now.");
    } finally {
      setReplying(false);
    }
  };

  return (
    <main className="section relative min-h-screen pb-16 pt-24 sm:pt-28 xl:pb-24">
      <div className="bg-mesh-blue pointer-events-none absolute inset-0" />
      <div className="container relative max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyber-500">Project Enquiry</p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Track My Enquiry</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Enter the email you used and your enquiry number. This is for project enquiries only — Support Inbox cases, live chat, and consultation bookings are tracked separately.
        </p>

        <form onSubmit={onLookup} className="glass gradient-border mt-6 space-y-4 rounded-[1.5rem] p-5 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="track-email">Email address</Label>
              <Input
                id="track-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="track-ref">Enquiry number</Label>
              <Input
                id="track-ref"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="ENQ-YYYY-NNNN"
                required
              />
            </div>
          </div>
          {error && !ticket && (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Look up enquiry
          </Button>
        </form>

        {ticket && (
          <div className="glass gradient-border mt-6 rounded-[1.5rem] p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-sm font-bold text-primary">{ticket.reference_id}</p>
                <h2 className="mt-1 font-display text-xl font-bold">{ticket.issue_type}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Submitted {new Date(ticket.created_at).toLocaleString()}
                </p>
              </div>
              <StatusBadge status={ticket.status} />
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{ticket.message}</p>

            <div className="mt-6 space-y-3">
              <h3 className="font-display text-sm font-bold">Replies</h3>
              {ticket.replies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No replies yet.</p>
              ) : (
                ticket.replies.map((item) => (
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
                      {item.sender_role === "admin" ? "Support" : "You"} · {new Date(item.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{item.message}</p>
                  </div>
                ))
              )}
            </div>

            {ticket.status !== "resolved" && (
              <form onSubmit={onReply} className="mt-6 space-y-3">
                <Label htmlFor="track-reply">Add a reply</Label>
                <Textarea id="track-reply" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} required />
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-300" role="alert">
                    {error}
                  </p>
                )}
                <Button type="submit" disabled={replying || reply.trim().length < 2}>
                  {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send reply
                </Button>
              </form>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Need a live conversation instead?{" "}
          <Link href="/#contact" className="font-semibold text-primary hover:underline">
            Open contact options
          </Link>
          {" · "}
          <Mail className="inline h-3.5 w-3.5" /> email tickets only
        </p>
      </div>
    </main>
  );
}
