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
  RefreshCw,
  Search,
  Send,
  WifiOff,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSupabase } from "@/hooks/use-supabase";
import {
  closeChatSessionAction,
  joinChatSessionAction,
  loadLiveChatInboxAction,
  loadLiveChatMessagesAction,
  markChatReadAction,
  sendChatMessageAction,
  startChatSessionAction,
} from "@/app/actions";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatSession } from "@/types/dashboard";

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function senderLabel(m: ChatMessage, session: ChatSession | null, mode: "user" | "admin") {
  if (m.sender_role === "admin") {
    return m.sender_name || session?.assigned_admin_name || "Support";
  }
  if (mode === "user") return "You";
  return m.sender_name || "Client";
}

function mergeChatMessages(prev: ChatMessage[], next: ChatMessage[]): ChatMessage[] {
  if (next.length === 0) return prev;
  const byId = new Map<string, ChatMessage>();
  for (const m of prev) byId.set(m.id, m);
  for (const m of next) byId.set(m.id, m);
  return Array.from(byId.values()).sort((a, b) => {
    const t = +new Date(a.created_at) - +new Date(b.created_at);
    return t !== 0 ? t : a.id.localeCompare(b.id);
  });
}

export function LiveChat({
  mode,
  initialSessionId,
}: {
  mode: "user" | "admin";
  initialSessionId?: string | null;
}) {
  const { user, isLoaded } = useAuth();
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
  const selectedIdRef = useRef<string | null>(null);
  const messagesSessionRef = useRef<string | null>(null);
  const loadSeq = useRef(0);
  const lastMsgIdRef = useRef<string | null>(null);
  const bootstrapped = useRef(false);
  const joiningRef = useRef<Set<string>>(new Set());
  const sessionsRef = useRef<ChatSession[]>([]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const loadSessions = useCallback(async () => {
    const res = await loadLiveChatInboxAction();
    if (!res.ok) {
      setListErr(res.error || "Could not load live chat sessions.");
      setLoadingList(false);
      return sessionsRef.current;
    }
    const list = res.sessions ?? [];
    setSessions(list);
    setListErr(null);
    setLoadingList(false);
    if (res.profiles) setProfiles((prev) => ({ ...prev, ...res.profiles }));
    if (res.unread) setUnread(res.unread);
    if (res.agentOnline !== undefined) setAgentOnline(res.agentOnline ?? null);
    return list;
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setLoadingList(false);
      setListErr("Not signed in");
      return;
    }
    let active = true;
    (async () => {
      const list = await loadSessions();
      if (!active) return;
      if (initialSessionId) setSelectedId(initialSessionId);
      else if (mode === "user" && !bootstrapped.current) {
        const open = list.find((s) => s.status === "waiting" || s.status === "active");
        if (open) setSelectedId(open.id);
      }
      bootstrapped.current = true;
    })();
    return () => {
      active = false;
    };
  }, [isLoaded, user, loadSessions, initialSessionId, mode]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`live-chat-list-${mode}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_sessions" }, (payload) => {
        const s = payload.new as ChatSession;
        if (mode === "user" && s.user_id !== user.id) return;
        setSessions((prev) => (prev.some((x) => x.id === s.id) ? prev : [s, ...prev]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_sessions" }, (payload) => {
        const s = payload.new as ChatSession;
        if (mode === "user" && s.user_id !== user.id) return;
        setSessions((prev) => {
          const exists = prev.some((x) => x.id === s.id);
          if (!exists) return [s, ...prev];
          return prev.map((x) => (x.id === s.id ? { ...x, ...s } : x)).sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const msg = payload.new as ChatMessage;
        const incoming = mode === "admin" ? msg.sender_role === "user" : msg.sender_role === "admin";
        if (incoming && msg.session_id !== selectedIdRef.current) {
          setUnread((prev) => ({ ...prev, [msg.session_id]: (prev[msg.session_id] ?? 0) + 1 }));
        }
        setSessions((prev) =>
          prev.map((x) =>
            x.id === msg.session_id
              ? { ...x, last_message_at: msg.created_at, last_message_preview: msg.message.slice(0, 140), updated_at: msg.created_at }
              : x,
          ),
        );
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    const onVis = () => {
      if (document.visibilityState === "visible") void loadSessions();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [supabase, loadSessions, mode, user]);

  const loadMessages = useCallback(async (sessionId: string, opts?: { showLoader?: boolean }) => {
    const seq = ++loadSeq.current;
    const showLoader = opts?.showLoader === true;
    if (showLoader) setLoadingMsgs(true);
    const res = await loadLiveChatMessagesAction(sessionId);
    if (seq !== loadSeq.current || selectedIdRef.current !== sessionId) return;
    if (!res.ok) {
      setChatErr(res.error || "Could not load messages.");
      if (showLoader) setLoadingMsgs(false);
      return;
    }
    messagesSessionRef.current = sessionId;
    setChatErr(null);
    const incoming = res.messages ?? [];
    setMessages((prev) => {
      const merged = mergeChatMessages(
        prev.filter((m) => m.session_id === sessionId),
        incoming,
      );
      if (
        merged.length === prev.length &&
        merged.every(
          (m, i) =>
            m.id === prev[i]?.id &&
            m.message === prev[i]?.message &&
            m.read === prev[i]?.read &&
            m.created_at === prev[i]?.created_at,
        )
      ) {
        return prev;
      }
      return merged;
    });
    setLoadingMsgs(false);
  }, []);

  useEffect(() => {
    if (!user || connected) return;
    const ping = window.setInterval(() => {
      void loadSessions();
      const sid = selectedIdRef.current;
      if (sid) void loadMessages(sid, { showLoader: false });
    }, 20_000);
    return () => window.clearInterval(ping);
  }, [user, connected, loadSessions, loadMessages]);

  const markRead = useCallback(async (sessionId: string) => {
    await markChatReadAction(sessionId);
    setUnread((prev) => {
      if (!prev[sessionId]) return prev;
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setLoadingMsgs(false);
      setChatErr(null);
      messagesSessionRef.current = null;
      lastMsgIdRef.current = null;
      return;
    }
    const sessionId = selectedId;
    const isSwitch = messagesSessionRef.current !== sessionId;
    if (isSwitch) {
      setMessages([]);
      setChatErr(null);
      setLoadingMsgs(true);
      lastMsgIdRef.current = null;
    }
    void loadMessages(sessionId, { showLoader: isSwitch });
    void markRead(sessionId);
    const channel = supabase
      .channel(`chat-thread-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (msg.session_id !== selectedIdRef.current) return;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          const incoming = mode === "admin" ? msg.sender_role === "user" : msg.sender_role === "admin";
          if (incoming) void markRead(sessionId);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const s = payload.new as ChatSession;
          setSessions((prev) => prev.map((x) => (x.id === s.id ? { ...x, ...s } : x)));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId, supabase, loadMessages, markRead, mode]);

  useEffect(() => {
    const last = messages[messages.length - 1]?.id ?? null;
    if (!last || last === lastMsgIdRef.current) return;
    lastMsgIdRef.current = last;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const selected = useMemo(
    () => sessions.find((s) => s.id === selectedId) ?? null,
    [sessions, selectedId],
  );

  useEffect(() => {
    if (mode !== "admin" || !selectedId || !selected) return;
    if (selected.status === "closed") return;
    if (selected.assigned_admin_id && selected.welcome_sent_at) return;
    if (joiningRef.current.has(selectedId)) return;
    joiningRef.current.add(selectedId);
    void (async () => {
      const res = await joinChatSessionAction(selectedId);
      if (!res.ok) {
        joiningRef.current.delete(selectedId);
        return;
      }
      await loadMessages(selectedId, { showLoader: false });
    })();
  }, [mode, selectedId, selected, loadMessages]);

  const filtered = sessions.filter((s) => {
    const q = query.toLowerCase();
    const matchQ =
      !q ||
      (s.reference_id ?? "").toLowerCase().includes(q) ||
      (s.last_message_preview ?? "").toLowerCase().includes(q) ||
      (s.assigned_admin_name ?? "").toLowerCase().includes(q) ||
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
    if (!res.ok || !res.sessionId) {
      setStarting(false);
      setChatErr(res.error ?? "Could not start live chat. Please retry.");
      return;
    }
    const list = await loadSessions();
    const created = list.find((s) => s.id === res.sessionId) ?? list.find((s) => s.reference_id === res.referenceId);
    setFStatus("open");
    if (created) setSelectedId(created.id);
    else setSelectedId(res.sessionId);
    setChatErr(null);
    setStarting(false);
  };

  const sendReply = async () => {
    if (!selectedId || !reply.trim() || sending) return;
    setSending(true);
    setChatErr(null);
    const text = reply.trim();
    const res = await sendChatMessageAction({ sessionId: selectedId, message: text });
    setSending(false);
    if (!res.ok) {
      setChatErr(res.error ?? "Failed to send");
      return;
    }
    setReply("");
    setSendOk(true);
    window.setTimeout(() => setSendOk(false), 2500);
    await loadMessages(selectedId, { showLoader: false });
  };

  const closeSession = async () => {
    if (!selectedId) return;
    const res = await closeChatSessionAction(selectedId);
    if (res.ok) {
      setSessions((prev) => prev.map((s) => (s.id === selectedId ? { ...s, status: "closed" as const } : s)));
      if (fStatus === "open") setFStatus("closed");
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
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (sessions.length === 0) setLoadingList(true);
                void loadSessions();
              }}
              aria-label="Refresh sessions"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {mode === "user" && (
              <Button size="sm" onClick={startChat} disabled={starting}>
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                New chat
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-2 border-b border-border/60 px-3 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === "admin" ? "Search client or session ID…" : "Search session ID…"}
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
            <option value="closed">Closed sessions</option>
            <option value="all">All sessions</option>
          </select>
          {listErr && sessions.length > 0 && (
            <p className="text-xs text-red-500" role="alert">
              {listErr}{" "}
              <button className="font-semibold underline" onClick={() => void loadSessions()}>
                Retry
              </button>
            </p>
          )}
          {chatErr && !selectedId && (
            <p className="text-xs text-red-500" role="alert">
              {chatErr}
            </p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList && sessions.length === 0 ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : listErr && sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <p className="text-sm text-red-500">{listErr}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setLoadingList(true);
                  void loadSessions();
                }}
              >
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Headset className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {fStatus === "closed"
                  ? "No closed live chat sessions yet."
                  : fStatus === "open" && sessions.length > 0
                    ? "No open sessions. Closed cases are under Closed sessions."
                    : "No live chat sessions yet."}
              </p>
              {chatErr && (
                <p className="text-sm text-red-500" role="alert">
                  {chatErr}
                </p>
              )}
              {mode === "user" && fStatus !== "closed" && (
                <Button size="sm" variant="outline" onClick={startChat} disabled={starting}>
                  {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {chatErr ? "Retry live chat" : "Start a live chat"}
                </Button>
              )}
              {fStatus === "closed" && sessions.some((s) => s.status === "waiting" || s.status === "active") && (
                <Button size="sm" variant="outline" onClick={() => setFStatus("open")}>
                  View open sessions
                </Button>
              )}
              {fStatus === "open" && sessions.some((s) => s.status === "closed") && (
                <Button size="sm" variant="outline" onClick={() => setFStatus("closed")}>
                  View closed sessions
                </Button>
              )}
            </div>
          ) : (
            <ul>
              {filtered.map((s) => {
                const active = s.id === selectedId;
                const unreadCount = unread[s.id] ?? 0;
                const isNew = s.status === "waiting";
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
                          <span className="truncate text-sm font-semibold">
                            {mode === "admin" ? profiles[s.user_id] ?? "Client" : s.reference_id ?? "Pending ID"}
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            {isNew && (
                              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                New
                              </span>
                            )}
                            {unreadCount > 0 && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500 px-1.5 text-[10px] font-bold text-white">
                                {unreadCount}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] font-medium text-muted-foreground">
                          {mode === "admin" ? s.reference_id ?? "Pending ID" : s.last_message_preview || "No messages yet"}
                        </span>
                        {mode === "admin" && (
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                            {s.last_message_preview || "Waiting for first message"}
                          </span>
                        )}
                        <span className="mt-1 flex items-center gap-2">
                          <StatusBadge status={s.status} />
                          <span className="text-[10px] text-muted-foreground">
                            {s.status === "closed"
                              ? `Opened ${fmtDate(s.created_at)}`
                              : `${fmtDate(s.updated_at)} ${fmtTime(s.updated_at)}`}
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
                {chatErr && (
                  <p className="max-w-sm text-sm text-red-500" role="alert">
                    {chatErr}
                  </p>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={startChat} disabled={starting}>
                    {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                    {chatErr ? "Retry live chat" : "Start live chat"}
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
                  {mode === "admin"
                    ? profiles[selected.user_id] ?? "Client"
                    : selected.assigned_admin_name
                      ? `Connected with ${selected.assigned_admin_name}`
                      : selected.status === "waiting"
                        ? "Waiting for an agent"
                        : "Support team"}
                  <span className="inline-flex items-center gap-1">
                    {connected ? <Radio className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3" />}
                    {connected ? "Realtime connected" : "Refreshing…"}
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

            {mode === "user" && selected.assigned_admin_name && selected.status !== "closed" && (
              <div className="border-b border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                {selected.assigned_admin_name} has joined this chat.
              </div>
            )}

            {mode === "user" && agentOnline === false && selected.status !== "closed" && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-xs text-amber-700 dark:text-amber-300">
                <span>Agents are offline. Messages are saved. You can also open a support case.</span>
                <Button size="sm" variant="outline" asChild>
                  <Link href={supportHref}>Open a support case</Link>
                </Button>
              </div>
            )}

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
              {loadingMsgs && messages.length === 0 ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-2/3" />
                  <Skeleton className="ml-auto h-12 w-1/2" />
                </div>
              ) : chatErr && messages.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <p className="text-sm text-red-500">{chatErr}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void loadMessages(selected.id, { showLoader: true });
                    }}
                  >
                    Retry
                  </Button>
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
                              <p className="mb-1 text-[10px] font-semibold tracking-wide text-cyan-500">
                                {senderLabel(m, selected, mode)}
                              </p>
                            )}
                            {mine && m.sender_role === "admin" && (
                              <p className="mb-1 text-[10px] font-semibold tracking-wide text-white/80">
                                {senderLabel(m, selected, mode)}
                              </p>
                            )}
                            <p className="whitespace-pre-line">{m.message}</p>
                          </div>
                          <p className={cn("mt-1 text-[10px] text-muted-foreground", mine ? "text-right" : "text-left")}>
                            {fmtTime(m.created_at)}
                            {" · "}
                            {senderLabel(m, selected, mode)}
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
                This session is closed. History and case ID are kept.{" "}
                {mode === "user" ? (
                  <>
                    <button className="font-semibold text-primary hover:underline" onClick={startChat}>
                      Start a new chat
                    </button>
                    {" with a new case ID, or "}
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
