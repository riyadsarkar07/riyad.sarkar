"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Download,
  FileText,
  ImageIcon,
  Loader2,
  Lock,
  Mail,
  MessageSquarePlus,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSupabase } from "@/hooks/use-supabase";
import {
  adminUpdateTicketAction,
  closeTicketAction,
  createTicketAction,
  sendMessageAction,
} from "@/app/actions";
import { CATEGORY_LABELS, PRIORITIES, PRIORITY_LABELS, TICKET_CATEGORIES, TICKET_STATUSES } from "@/lib/constants";
import { StatusBadge } from "@/components/portal/status-badge";
import { FileInput } from "@/components/portal/file-input";
import { Field } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Appointment, SupportFile, SupportMessage, SupportTicket } from "@/types/dashboard";

const CATEGORY_ICON: Record<string, string> = {
  account_recovery: "🛡️",
  appointment: "📅",
  payment: "💳",
  technical_issue: "⚙️",
  security: "🔐",
  general: "💬",
  other: "📎",
};

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function SupportMessenger({
  mode,
  initialTicketId,
  initialAppointmentId,
}: {
  mode: "user" | "admin";
  initialTicketId?: string | null;
  initialAppointmentId?: string | null;
}) {
  const { user } = useAuth();
  const supabase = useSupabase();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [fileMap, setFileMap] = useState<Record<string, SupportFile>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [reply, setReply] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "general",
    priority: "normal",
    message: "",
  });
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newErr, setNewErr] = useState<string | null>(null);
  const [ticketErr, setTicketErr] = useState<string | null>(null);
  const [listErr, setListErr] = useState<string | null>(null);
  const [sendOk, setSendOk] = useState(false);
  const [appointmentRef, setAppointmentRef] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ------------------------------------------------------------------ */
  /*  Ticket list + realtime                                              */
  /* ------------------------------------------------------------------ */

  const loadTickets = useCallback(async () => {
    let q = supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (mode === "user" && user) q = q.eq("user_id", user.id);
    const { data, error } = await q;
    if (error) {
      setListErr(error.message || "Could not load tickets.");
      setLoadingList(false);
      return [] as SupportTicket[];
    }
    const list = (data ?? []) as SupportTicket[];
    setTickets(list);
    setListErr(null);
    setLoadingList(false);
    return list;
  }, [supabase, mode, user]);

  const loadUnread = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("support_messages").select("ticket_id, sender_role, read");
    const rows = (data ?? []) as SupportMessage[];
    const counts: Record<string, number> = {};
    for (const r of rows) {
      const incoming = mode === "admin" ? r.sender_role === "user" : r.sender_role === "admin";
      if (incoming && !r.read) counts[r.ticket_id] = (counts[r.ticket_id] ?? 0) + 1;
    }
    setUnread(counts);
  }, [supabase, mode, user]);

  useEffect(() => {
    let active = true;
    (async () => {
      await loadTickets();
      await loadUnread();
      if (initialTicketId) setSelectedId(initialTicketId);
      if (initialAppointmentId) {
        const { data } = await supabase
          .from("appointments")
          .select("reference_id")
          .eq("id", initialAppointmentId)
          .maybeSingle();
        if (active) setAppointmentRef((data as Appointment | null)?.reference_id ?? null);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadTickets, loadUnread, supabase, initialTicketId, initialAppointmentId]);

  useEffect(() => {
    const channel = supabase
      .channel("support-tickets-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => {
          loadTickets();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        () => {
          loadUnread();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadTickets, loadUnread]);

  /* ------------------------------------------------------------------ */
  /*  Selected conversation + realtime                                    */
  /* ------------------------------------------------------------------ */

  const loadMessages = useCallback(async (ticketId: string) => {
    setLoadingMsgs(true);
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    const list = (data ?? []) as SupportMessage[];
    setMessages(list);
    const fileIds = list.map((m) => m.attachment_file_id).filter(Boolean) as string[];
    if (fileIds.length > 0) {
      const { data: f } = await supabase.from("support_files").select("*").in("id", fileIds);
      const map: Record<string, SupportFile> = {};
      for (const row of f ?? []) map[row.id] = row as SupportFile;
      setFileMap((prev) => ({ ...prev, ...map }));
    }
    setLoadingMsgs(false);
  }, [supabase]);

  const markRead = useCallback(async (ticketId: string) => {
    const incomingRole = mode === "admin" ? "user" : "admin";
    await supabase
      .from("support_messages")
      .update({ read: true })
      .eq("ticket_id", ticketId)
      .eq("sender_role", incomingRole)
      .eq("read", false);
    loadUnread();
  }, [supabase, mode, loadUnread]);

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId);
    markRead(selectedId);

    const channel = supabase
      .channel(`ticket-${selectedId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${selectedId}` },
        async (payload) => {
          const msg = payload.new as SupportMessage;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          if (msg.attachment_file_id) {
            const { data } = await supabase
              .from("support_files")
              .select("*")
              .eq("id", msg.attachment_file_id)
              .maybeSingle();
            if (data) setFileMap((prev) => ({ ...prev, [data.id]: data as SupportFile }));
          }
          const incoming = mode === "admin" ? msg.sender_role === "user" : msg.sender_role === "admin";
          if (incoming) markRead(selectedId);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_tickets", filter: `id=eq.${selectedId}` },
        (payload) => {
          const t = payload.new as SupportTicket;
          setTickets((prev) => prev.map((x) => (x.id === t.id ? t : x)));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId, supabase, loadMessages, markRead, mode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loadingMsgs]);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  /* ------------------------------------------------------------------ */
  /*  Actions                                                            */
  /* ------------------------------------------------------------------ */

  const sendReply = async () => {
    if (!selectedId || !reply.trim() || sending) return;
    setSending(true);
    setTicketErr(null);
    let fileMeta: { storagePath: string; fileName: string; mimeType: string; size: number } | undefined;
    try {
      if (replyFile && user) {
        const ext = replyFile.name.split(".").pop()?.toLowerCase() ?? "bin";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("support-files")
          .upload(path, replyFile, { contentType: replyFile.type });
        if (error) throw new Error(error.message);
        fileMeta = { storagePath: path, fileName: replyFile.name, mimeType: replyFile.type, size: replyFile.size };
      }
      const res = await sendMessageAction({ ticketId: selectedId, message: reply.trim(), file: fileMeta });
      if (!res.ok) throw new Error(res.error ?? "Failed to send");
      setReply("");
      setReplyFile(null);
      setSendOk(true);
      window.setTimeout(() => setSendOk(false), 2500);
    } catch (err) {
      setTicketErr(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const doCloseTicket = async () => {
    if (!selectedId) return;
    const res = await closeTicketAction(selectedId);
    if (res.ok) {
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedId ? { ...t, status: "closed" as const } : t)),
      );
    } else {
      setTicketErr(res.error ?? "Could not close ticket");
    }
  };

  const adminSet = async (field: "status" | "priority", value: string) => {
    if (!selectedId) return;
    const res = await adminUpdateTicketAction(
      field === "status" ? { id: selectedId, status: value } : { id: selectedId, priority: value },
    );
    if (res.ok) {
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedId ? { ...t, [field]: value } : t)),
      );
    }
  };

  const createTicket = async () => {
    if (sending) return;
    setNewErr(null);
    if (newTicket.subject.trim().length < 3) {
      setNewErr("Subject must be at least 3 characters.");
      return;
    }
    if (newTicket.message.trim().length < 10) {
      setNewErr("Message must be at least 10 characters.");
      return;
    }
    setSending(true);
    let fileMeta: { storagePath: string; fileName: string; mimeType: string; size: number } | undefined;
    try {
      if (newFile && user) {
        const ext = newFile.name.split(".").pop()?.toLowerCase() ?? "bin";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("support-files")
          .upload(path, newFile, { contentType: newFile.type });
        if (error) throw new Error(error.message);
        fileMeta = { storagePath: path, fileName: newFile.name, mimeType: newFile.type, size: newFile.size };
      }
      const res = await createTicketAction({
        form: {
          subject: newTicket.subject,
          category: newTicket.category as (typeof TICKET_CATEGORIES)[number],
          priority: newTicket.priority as (typeof PRIORITIES)[number],
          message: newTicket.message,
          appointmentId: initialAppointmentId ?? null,
        },
        files: fileMeta ? [fileMeta] : [],
      });
      if (!res.ok) throw new Error(res.error ?? "Could not create ticket");
      setShowNew(false);
      setNewTicket({ subject: "", category: "general", priority: "normal", message: "" });
      setNewFile(null);
      await loadTickets();
      if (res.referenceId) {
        const list = await loadTickets();
        const created = list.find((t) => t.reference_id === res.referenceId);
        if (created) setSelectedId(created.id);
      }
    } catch (err) {
      setNewErr(err instanceof Error ? err.message : "Could not create ticket");
    } finally {
      setSending(false);
    }
  };

  const downloadFile = async (file: SupportFile) => {
    const { data } = await supabase.storage
      .from("support-files")
      .createSignedUrl(file.storage_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="glass gradient-border flex h-[calc(100dvh-13rem)] min-h-[480px] flex-col overflow-hidden rounded-3xl lg:flex-row">
      {/* Ticket list */}
      <aside className={cn("flex w-full flex-col border-b border-border/60 lg:w-80 lg:border-b-0 lg:border-r", selectedId ? "hidden lg:flex" : "")}>
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="font-display text-sm font-bold">Tickets</h2>
          {mode === "user" && (
            <Button size="sm" onClick={() => setShowNew(true)}>
              <MessageSquarePlus className="h-4 w-4" /> New Ticket
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="space-y-3 p-4"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
          ) : listErr ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <p className="text-sm text-red-500">{listErr}</p>
              <Button size="sm" variant="outline" onClick={() => { setLoadingList(true); loadTickets(); }}>Retry</Button>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Mail className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No tickets yet.</p>
              {mode === "user" && (
                <Button size="sm" variant="outline" onClick={() => setShowNew(true)}>Create a ticket</Button>
              )}
            </div>
          ) : (
            <ul>
              {tickets.map((t) => {
                const active = t.id === selectedId;
                const unreadCount = unread[t.id] ?? 0;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => {
                        setSelectedId(t.id);
                        if (mode === "user" && typeof window !== "undefined" && window.innerWidth < 1024) {
                          setSelectedId(t.id);
                        }
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
                        active ? "bg-gradient-to-r from-blue-600/10 to-cyan-400/10" : "hover:bg-primary/5",
                      )}
                    >
                      <span className="text-lg leading-none">{CATEGORY_ICON[t.category] ?? "💬"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{t.subject}</span>
                          {unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500 px-1.5 text-[10px] font-bold text-white">
                              {unreadCount}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {t.reference_id} · {CATEGORY_LABELS[t.category]}
                        </span>
                        <span className="mt-1 flex items-center gap-2">
                          <StatusBadge status={t.status} />
                          <span className="text-[10px] text-muted-foreground">
                            {fmtTime(t.updated_at)}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Conversation */}
      <section className={cn("flex min-w-0 flex-1 flex-col", !selectedId ? "hidden lg:flex" : "")}>
        {!selectedTicket ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-400/20 text-cyan-500">
              <Lock className="h-7 w-7" />
            </div>
            {mode === "user" ? (
              <>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Select a ticket or create a new one to start a private conversation with the support team.
                </p>
                <Button onClick={() => setShowNew(true)}>
                  <MessageSquarePlus className="h-4 w-4" /> New Ticket
                </Button>
              </>
            ) : (
              <p className="max-w-sm text-sm text-muted-foreground">
                Select a ticket to open the conversation.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-5 py-3">
              <button
                className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary lg:hidden"
                onClick={() => setSelectedId(null)}
                aria-label="Back to tickets"
              >
                <ChevronLeft className="h-4 w-4" /> Inbox
              </button>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-display text-sm font-bold">
                  <span>{CATEGORY_ICON[selectedTicket.category] ?? "💬"}</span>
                  {selectedTicket.subject}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedTicket.reference_id} · {CATEGORY_LABELS[selectedTicket.category]} ·{" "}
                  <span className="capitalize">{PRIORITY_LABELS[selectedTicket.priority]}</span> priority
                </p>
              </div>
              <StatusBadge status={selectedTicket.status} />
              {mode === "admin" && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTicket.priority}
                    onChange={(e) => adminSet("priority", e.target.value)}
                    className="h-9 rounded-lg border border-input bg-white/60 px-2 text-xs font-medium capitalize dark:bg-white/5"
                    aria-label="Priority"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                    ))}
                  </select>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => adminSet("status", e.target.value)}
                    className="h-9 rounded-lg border border-input bg-white/60 px-2 text-xs font-medium capitalize dark:bg-white/5"
                    aria-label="Status"
                  >
                    {TICKET_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
              )}
              {selectedTicket.status !== "closed" && (
                <Button size="sm" variant="outline" onClick={doCloseTicket}>
                  <CheckCircle2 className="h-4 w-4" /> Close
                </Button>
              )}
              {mode === "admin" && selectedTicket.status === "closed" && (
                <Button size="sm" variant="outline" onClick={() => adminSet("status", "open")}>
                  Reopen
                </Button>
              )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
              {initialAppointmentId && appointmentRef && (
                <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
                  <CalendarClock className="h-3.5 w-3.5" /> Regarding appointment {appointmentRef}
                </div>
              )}
              {loadingMsgs ? (
                <div className="space-y-3"><Skeleton className="h-12 w-2/3" /><Skeleton className="ml-auto h-12 w-1/2" /></div>
              ) : messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No messages yet — say hello.
                </p>
              ) : (
                messages.map((m) => {
                  const mine = mode === "admin" ? m.sender_role === "admin" : m.sender_role === "user";
                  const file = m.attachment_file_id ? fileMap[m.attachment_file_id] : null;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("flex", mine ? "justify-end" : "justify-start")}
                    >
                      <div className={cn("max-w-[85%] sm:max-w-[70%]", mine ? "text-right" : "text-left")}>
                        <div
                          className={cn(
                            "inline-block rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed",
                            mine
                              ? "rounded-br-md bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-glow"
                              : "rounded-bl-md bg-primary/5 text-foreground",
                          )}
                        >
                          {!mine && (
                            <p className={cn("mb-1 text-[10px] font-bold uppercase tracking-wide", mine ? "text-white/70" : "text-cyan-500")}>
                              {mode === "admin" ? "Client" : "Support Team"}
                            </p>
                          )}
                          <p className="whitespace-pre-line">{m.message}</p>
                          {file && (
                            <button
                              onClick={() => downloadFile(file)}
                              className={cn(
                                "mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                                mine ? "bg-white/20 text-white hover:bg-white/30" : "bg-primary/10 text-primary hover:bg-primary/20",
                              )}
                            >
                              {file.mime_type.startsWith("image/") ? (
                                <ImageIcon className="h-4 w-4" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                              <span className="max-w-[180px] truncate">{file.file_name}</span>
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <p className={cn("mt-1 text-[10px] text-muted-foreground", mine ? "text-right" : "text-left")}>
                          {fmtTime(m.created_at)}
                          {m.sender_role === "user" ? " · You" : " · Support"}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Reply box */}
            {selectedTicket.status !== "closed" ? (
              <div className="border-t border-border/60 p-4">
                {ticketErr && <p className="mb-2 text-xs text-red-500" role="alert">{ticketErr}</p>}
                {sendOk && <p className="mb-2 text-xs text-emerald-600 dark:text-emerald-400" role="status">Message sent</p>}
                <div className="flex items-end gap-2">
                  <FileInput onChange={setReplyFile} disabled={sending} />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      placeholder={mode === "user" ? "Write a reply…" : "Reply as admin…"}
                      rows={2}
                      className="flex-1 rounded-xl border border-input bg-white/60 px-4 py-3 text-sm text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none dark:bg-white/5"
                      aria-label="Reply message"
                    />
                    <Button size="sm" onClick={sendReply} disabled={sending || !reply.trim()} className="self-end">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-border/60 p-4 text-center text-sm text-muted-foreground">
                This ticket is closed.{" "}
                {mode === "admin" ? (
                  <button className="font-semibold text-primary hover:underline" onClick={() => adminSet("status", "open")}>
                    Reopen ticket
                  </button>
                ) : (
                  <button className="font-semibold text-primary hover:underline" onClick={() => setShowNew(true)}>
                    Create a new ticket
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* New ticket modal — rendered into <body> so fixed positioning stays
          viewport-relative. The parent glass surface uses backdrop-filter,
          which would otherwise become the fixed containing block and push
          the modal off-screen. */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showNew && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm"
                  onClick={() => setShowNew(false)}
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none fixed inset-0 z-[71] flex items-center justify-center p-4 sm:p-6"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 40, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                    className="glass-strong pointer-events-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl p-6 shadow-glow-lg"
                    role="dialog"
                    aria-label="New support ticket"
                  >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">
                  {appointmentRef ? "Contact Support About " : "New Support Ticket"}
                  {appointmentRef && <span className="text-primary">{appointmentRef}</span>}
                </h3>
                <button
                  onClick={() => setShowNew(false)}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {initialAppointmentId && appointmentRef && (
                <p className="mb-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-medium text-primary">
                  <CalendarClock className="h-3.5 w-3.5" /> This ticket will be linked to appointment {appointmentRef}.
                </p>
              )}
              {newErr && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{newErr}</div>
              )}
              <div className="space-y-4">
                <Field label="Subject">
                  <Input
                    required
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket((t) => ({ ...t, subject: e.target.value }))}
                    placeholder="Brief summary of your issue"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Category">
                    <select
                      value={newTicket.category}
                      onChange={(e) => setNewTicket((t) => ({ ...t, category: e.target.value }))}
                      className="flex h-12 w-full rounded-xl border border-input bg-white/60 px-4 py-2 text-sm text-foreground shadow-sm transition-all focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none dark:bg-white/5"
                    >
                      {TICKET_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Priority">
                    <select
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket((t) => ({ ...t, priority: e.target.value }))}
                      className="flex h-12 w-full rounded-xl border border-input bg-white/60 px-4 py-2 text-sm text-foreground shadow-sm transition-all focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none dark:bg-white/5"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Message">
                  <Textarea
                    required
                    rows={4}
                    value={newTicket.message}
                    onChange={(e) => setNewTicket((t) => ({ ...t, message: e.target.value }))}
                    placeholder="Describe your issue in detail…"
                  />
                </Field>
                <FileInput label="Attachment (optional)" onChange={setNewFile} />
                <Button className="w-full" onClick={createTicket} disabled={sending}>
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />} Create Ticket
                </Button>
              </div>
            </motion.div>
                  </motion.div>
          </>
        )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
