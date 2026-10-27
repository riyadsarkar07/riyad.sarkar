"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  Headset,
  Loader2,
  MessageCircle,
  Radio,
  Search,
  Send,
  WifiOff,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSupabase } from "@/hooks/use-supabase";
import {
  closeChatSessionAction,
  sendChatMessageAction,
  startChatSessionAction,
} from "@/app/actions";
import { CHAT_SESSION_STATUSES } from "@/lib/constants";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatSession, Profile } from "@/types/dashboard";

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function LiveChat({
  mode,
  initialSessionId,
}: {
  mode: "user" | "admin";
  initialSessionId?: string | null;
}) {
  const { user } = useAuth();
  const supabase = useSupabase();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);
  const [chatErr, setChatErr] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [sendOk, setSendOk] = useState(false);
  const [query, setQuery] = useState("");
  const [fStatus, setFStatus] = useState("open");
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadPresence = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_online_count");
    if (error) {
      setAgentOnline(null);
      return;
    }
    setAgentOnline(typeof data === "number" ? data > 0 : Number(data) > 0);
  }, [supabase]);

  const loadSessions = useCallback(async () => {
    let q = supabase.from("chat_sessions").select("*").order("updated_at", { ascending: false });
    if (mode === "user" && user) q = q.eq("user_id", user.id);
    const { data, error } = await q;
    if (error) {
      setListErr(error.message || "Could not load live chat sessions.");
      setLoadingList(false);
      return [] as ChatSession[];
    }
    const list = (data ?? []) as ChatSession[];
    setSessions(list);
    setListErr(null);
    setLoadingList(false);
    if (mode === "admin") {
      const ids = Array.from(new Set(list.map((s) => s.user_id)));
      if (ids.length > 0) {
        const { data: rows } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
        const map: Record<string, string> = {};
        for (const row of rows ?? []) {
          const p = row as Profile;
          map[p.id] = p.full_name || p.email || "Client";
        }
        setProfiles(map);
      }
    }
    return list;
  }, [supabase, mode, user]);

  const loadUnread = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("chat_messages").select("session_id, sender_role, read");
    const rows = (data ?? []) as ChatMessage[];
    const counts: Record<string, number> = {};
    for (const r of rows) {
      const incoming = mode === "admin" ? r.sender_role === "user" : r.sender_role === "admin";
      if (incoming && !r.read) counts[r.session_id] = (counts[r.session_id] ?? 0) + 1;
    }
    setUnread(counts);
  }, [supabase, mode, user]);

  useEffect(() => {
    (async () => {
      const list = await loadSessions();
      await loadUnread();
      await loadPresence();
      if (initialSessionId) setSelectedId(initialSessionId);
      else if (mode === "user") {
        const open = list.find((s) => s.status === "waiting" || s.status === "active");
        if (open) setSelectedId(open.id);
      }
    })();
  }, [loadSessions, loadUnread, loadPresence, initialSessionId, mode]);

  useEffect(() => {
    const channel = supabase
      .channel("live-chat-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_sessions" }, () => {
        loadSessions();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
        loadUnread();
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });
    const ping = window.setInterval(loadPresence, 30_000);
    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(ping);
    };
  }, [supabase, loadSessions, loadUnread, loadPresence]);

  const loadMessages = useCallback(
    async (sessionId: string) => {
      setLoadingMsgs(true);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (error) {
        setChatErr(error.message || "Could not load messages.");
        setMessages([]);
      } else {
        setChatErr(null);
        setMessages((data ?? []) as ChatMessage[]);
      }
      setLoadingMsgs(false);
    },
    [supabase],
  );

  const markRead = useCallback(
    async (sessionId: string) => {
      const incomingRole = mode === "admin" ? "user" : "admin";
      await supabase
        .from("chat_messages")
        .update({ read: true })
        .eq("session_id", sessionId)
        .eq("sender_role", incomingRole)
        .eq("read", false);
      loadUnread();
    },
    [supabase, mode, loadUnread],
  );

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId);
    markRead(selectedId);
    const channel = supabase
      .channel(`chat-${selectedId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${selectedId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          const incoming = mode === "admin" ? msg.sender_role === "user" : msg.sender_role === "admin";
          if (incoming) markRead(selectedId);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_sessions", filter: `id=eq.${selectedId}` },
        (payload) => {
          const s = payload.new as ChatSession;
          setSessions((prev) => prev.map((x) => (x.id === s.id ? s : x)));
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

  const selected = useMemo(
    () => sessions.find((s) => s.id === selectedId) ?? null,
    [sessions, selectedId],
  );

  const filtered = sessions.filter((s) => {
    const q = query.toLowerCase();
    const matchQ =
      !q ||
      (s.reference_id ?? "").toLowerCase().includes(q) ||
      (s.last_message_preview ?? "").toLowerCase().includes(q) ||
      (profiles[s.user_id] ?? "").toLowerCase().includes(q);
    if (!matchQ) return false;
    if (fStatus === "all") return true;
    if (fStatus === "open") return s.status === "waiting" || s.status === "active";
    return s.status === fStatus;
  });

  const startChat = async () => {
    if (starting) return;
    setStarting(true);
    setChatErr(null);
    const res = await startChatSessionAction();
    setStarting(false);
    if (!res.ok || !res.sessionId) {
      setChatErr(res.error ?? "Could not start live chat.");
      return;
    }
    const list = await loadSessions();
    const created = list.find((s) => s.id === res.sessionId) ?? list.find((s) => s.reference_id === res.referenceId);
    if (created) setSelectedId(created.id);
  };

  const sendReply = async () => {
    if (!selectedId || !reply.trim() || sending) return;
    setSending(true);
    setChatErr(null);
    const res = await sendChatMessageAction({ sessionId: selectedId, message: reply.trim() });
    setSending(false);
    if (!res.ok) {
      setChatErr(res.error ?? "Failed to send");
      return;
    }
    setReply("");
    setSendOk(true);
    window.setTimeout(() => setSendOk(false), 2500);
  };

  const closeSession = async () => {
    if (!selectedId) return;
    const res = await closeChatSessionAction(selectedId);
    if (res.ok) {
      setSessions((prev) => prev.map((s) => (s.id === selectedId ? { ...s, status: "closed" as const } : s)));
    } else {
      setChatErr(res.error ?? "Could not close session");
    }
  };

  const supportHref = mode === "admin" ? "/admin/support" : "/dashboard/support";
  const presenceLabel =
    agentOnline === null ? "Checking agent status" : agentOnline ? "Agents online" : "Agents offline";

  return (
    <div className="glass gradient-border flex h-[calc(100dvh-13rem)] min-h-[480px] flex-col overflow-hidden rounded-3xl lg:flex-row">
      <aside className={cn("flex w-full flex-col border-b border-border/60 lg:w-80 lg:border-b-0 lg:border-r", selectedId ? "hidden lg:flex" : "")}>
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div>
            <h2 className="font-display text-sm font-bold">Live sessions</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", agentOnline ? "bg-emerald-500" : "bg-slate-400")} />
              {presenceLabel}
            </p>
          </div>
          {mode === "user" && (
            <Button size="sm" onClick={startChat} disabled={starting}>
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              New chat
            </Button>
          )}
        </div>
        <div className="space-y-2 border-b border-border/60 px-3 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search session ID…"
              className="h-9 pl-9 text-xs"
            />
          </div>
          <select
            value={fStatus}
            onChange={(e) => setFStatus(e.target.value)}
            className="h-9 w-full rounded-xl border border-input bg-white/60 px-3 text-xs dark:bg-white/5"
            aria-label="Filter sessions"
          >
            <option value="open">Open sessions</option>
            <option value="all">All sessions</option>
            {CHAT_SESSION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : listErr ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <p className="text-sm text-red-500">{listErr}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setLoadingList(true);
                  loadSessions();
                }}
              >
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Headset className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No live chat sessions yet.</p>
              {mode === "user" && (
                <Button size="sm" variant="outline" onClick={startChat} disabled={starting}>
                  Start a live chat
                </Button>
              )}
            </div>
          ) : (
            <ul>
              {filtered.map((s) => {
                const active = s.id === selectedId;
                const unreadCount = unread[s.id] ?? 0;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelectedId(s.id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
                        active ? "bg-gradient-to-r from-blue-600/10 to-cyan-400/10" : "hover:bg-primary/5",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{s.reference_id ?? "Pending ID"}</span>
                          {unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500 px-1.5 text-[10px] font-bold text-white">
                              {unreadCount}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {mode === "admin" ? profiles[s.user_id] ?? "Client" : s.last_message_preview || "No messages yet"}
                        </span>
                        <span className="mt-1 flex items-center gap-2">
                          <StatusBadge status={s.status} />
                          <span className="text-[10px] text-muted-foreground">
                            {fmtDate(s.updated_at)} {fmtTime(s.updated_at)}
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

      <section className={cn("flex min-w-0 flex-1 flex-col", !selectedId ? "hidden lg:flex" : "")}>
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-400/20 text-cyan-500">
              <Headset className="h-7 w-7" />
            </div>
            {mode === "user" ? (
              <>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Start a live session for realtime help. Support cases stay in Support Inbox and are never mixed with chat.
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn("h-2 w-2 rounded-full", agentOnline ? "bg-emerald-500" : "bg-slate-400")} />
                  {presenceLabel}
                </div>
                {agentOnline === false && (
                  <p className="max-w-sm text-xs text-amber-600 dark:text-amber-400">
                    Agents are offline right now. You can still start a session, or open a support case instead.
                  </p>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={startChat} disabled={starting}>
                    {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                    Start live chat
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={supportHref}>Open a support case</Link>
                  </Button>
                </div>
              </>
            ) : (
              <p className="max-w-sm text-sm text-muted-foreground">Select a live session to join the conversation.</p>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-5 py-3">
              <button
                className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary lg:hidden"
                onClick={() => setSelectedId(null)}
                aria-label="Back to sessions"
              >
                <ChevronLeft className="h-4 w-4" /> Sessions
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold">{selected.reference_id ?? "Session"}</p>
                <p className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  {mode === "admin" ? profiles[selected.user_id] ?? "Client" : "Support team"}
                  <span className="inline-flex items-center gap-1">
                    {connected ? <Radio className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3" />}
                    {connected ? "Realtime connected" : "Reconnecting"}
                  </span>
                </p>
              </div>
              <StatusBadge status={selected.status} />
              {selected.status !== "closed" && (
                <Button size="sm" variant="outline" onClick={closeSession}>
                  End session
                </Button>
              )}
            </div>

            {mode === "user" && agentOnline === false && selected.status !== "closed" && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-xs text-amber-700 dark:text-amber-300">
                <span>Agents are offline. Messages are saved. You can also open a support case.</span>
                <Button size="sm" variant="outline" asChild>
                  <Link href={supportHref}>Open a support case</Link>
                </Button>
              </div>
            )}

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
              {loadingMsgs ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-2/3" />
                  <Skeleton className="ml-auto h-12 w-1/2" />
                </div>
              ) : messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Say hello.</p>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((m) => {
                    const mine = mode === "admin" ? m.sender_role === "admin" : m.sender_role === "user";
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
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-cyan-500">
                                {mode === "admin" ? "Client" : "Support Team"}
                              </p>
                            )}
                            <p className="whitespace-pre-line">{m.message}</p>
                          </div>
                          <p className={cn("mt-1 text-[10px] text-muted-foreground", mine ? "text-right" : "text-left")}>
                            {fmtTime(m.created_at)}
                            {m.sender_role === "user" ? " · You" : " · Support"}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {selected.status !== "closed" ? (
              <div className="border-t border-border/60 p-4">
                {chatErr && (
                  <p className="mb-2 text-xs text-red-500" role="alert">
                    {chatErr}
                  </p>
                )}
                {sendOk && (
                  <p className="mb-2 text-xs text-emerald-600 dark:text-emerald-400" role="status">
                    Message sent
                  </p>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                    placeholder={mode === "user" ? "Message the support team…" : "Reply as agent…"}
                    rows={2}
                    className="flex-1 rounded-xl border border-input bg-white/60 px-4 py-3 text-sm text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none dark:bg-white/5"
                    aria-label="Live chat message"
                  />
                  <Button size="sm" onClick={sendReply} disabled={sending || !reply.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-t border-border/60 p-4 text-center text-sm text-muted-foreground">
                This live session is closed.{" "}
                {mode === "user" ? (
                  <>
                    <button className="font-semibold text-primary hover:underline" onClick={startChat}>
                      Start a new chat
                    </button>
                    {" or "}
                    <Link href={supportHref} className="font-semibold text-primary hover:underline">
                      open a support case
                    </Link>
                    .
                  </>
                ) : (
                  "The client can start a new session if they still need help."
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
