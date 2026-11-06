"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Headset,
  History,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Radio,
  RefreshCw,
  Search,
  Send,
  StickyNote,
  User,
  WifiOff,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSupabase } from "@/hooks/use-supabase";
import {
  closeChatSessionAction,
  escalateChatSessionAction,
  addChatInternalNoteAction,
  joinChatSessionAction,
  loadChatAgentEventsAction,
  loadLiveChatInboxAction,
  loadLiveChatMessagesAction,
  markChatReadAction,
  sendChatMessageAction,
  startChatSessionAction,
  updateChatPriorityAction,
} from "@/app/actions";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PRIORITIES, PRIORITY_LABELS } from "@/lib/constants";
import type { ChatAgentEvent, ChatCustomer, ChatMessage, ChatSession } from "@/types/dashboard";

type Mode = "user" | "admin";
type FilterValue = "open" | "waiting" | "active" | "closed" | "all";

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDuration(from: string, to = Date.now()) {
  const seconds = Math.max(0, Math.floor((to - new Date(from).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function senderLabel(m: ChatMessage, session: ChatSession | null, mode: Mode) {
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

function priorityStyle(priority: string | undefined) {
  switch (priority) {
    case "urgent":
      return "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400";
    case "high":
      return "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "low":
      return "border-slate-400/30 bg-slate-400/10 text-slate-500";
    default:
      return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400";
  }
}

export function LiveChat({
  mode,
  initialSessionId,
}: {
  mode: Mode;
  initialSessionId?: string | null;
}) {
  const { user, isLoaded } = useAuth();
  const supabase = useSupabase();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [customers, setCustomers] = useState<Record<string, ChatCustomer>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThreads, setLoadingThreads] = useState<Record<string, boolean>>({});
  const [listErr, setListErr] = useState<string | null>(null);
  const [chatErr, setChatErr] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [sendOk, setSendOk] = useState(false);
  const [query, setQuery] = useState("");
  const [fStatus, setFStatus] = useState<FilterValue>(mode === "admin" ? "waiting" : "open");
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const [agentEvents, setAgentEvents] = useState<ChatAgentEvent[]>([]);
  const [eventsUnavailable, setEventsUnavailable] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [escalationOpen, setEscalationOpen] = useState(false);
  const [escalationReason, setEscalationReason] = useState("");
  const [escalating, setEscalating] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  const sessionsRef = useRef<ChatSession[]>([]);
  const loadSeq = useRef(0);
  const lastMsgIdRef = useRef<string | null>(null);
  const bootstrapped = useRef(false);
  const refreshing = useRef(false);
  const reloadTimer = useRef<number | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const applySessions = useCallback((list: ChatSession[]) => {
    setSessions((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]));
      return list
        .map((s) => ({ ...byId.get(s.id), ...s }))
        .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
    });
  }, []);

  const loadSessions = useCallback(
    async (opts?: { initial?: boolean }) => {
      const res = await loadLiveChatInboxAction(mode);
      if (!res.ok) {
        if (opts?.initial) {
          setListErr(res.error || "Could not load live chat sessions.");
          setLoadingList(false);
        } else {
          setListErr(res.error || "Could not refresh live chat sessions.");
        }
        return sessionsRef.current;
      }
      const list = res.sessions ?? [];
      applySessions(list);
      setListErr(null);
      setLoadingList(false);
      if (res.profiles) {
        setCustomers((prev) => {
          const next = { ...prev };
          for (const [id, name] of Object.entries(res.profiles ?? {})) {
            next[id] = next[id]
              ? { ...next[id], name }
              : { id, name, email: null, phone: null };
          }
          for (const [id, customer] of Object.entries(res.customers ?? {})) {
            next[id] = customer;
          }
          return next;
        });
      }
      if (res.unread) setUnread(res.unread);
      if (res.agentOnline !== undefined) setAgentOnline(res.agentOnline ?? null);
      return list;
    },
    [applySessions, mode],
  );

  const loadThread = useCallback(
    async (sessionId: string, opts?: { showLoader?: boolean }) => {
      const seq = ++loadSeq.current;
      if (opts?.showLoader) {
        setLoadingThreads((prev) => ({ ...prev, [sessionId]: true }));
      }
      const res = await loadLiveChatMessagesAction(sessionId);
      if (seq !== loadSeq.current) return;
      setLoadingThreads((prev) => ({ ...prev, [sessionId]: false }));
      if (!res.ok) {
        if (selectedIdRef.current === sessionId) {
          setChatErr(res.error || "Could not load messages.");
        }
        return;
      }
      const incoming = res.messages ?? [];
      setThreads((prev) => {
        const merged = mergeChatMessages(prev[sessionId] ?? [], incoming);
        return { ...prev, [sessionId]: merged };
      });
      if (selectedIdRef.current === sessionId) setChatErr(null);
    },
    [],
  );

  const loadAgentEvents = useCallback(async (sessionId: string) => {
    if (mode !== "admin") return;
    const res = await loadChatAgentEventsAction(sessionId);
    if (!res.ok) return;
    setAgentEvents(res.events ?? []);
    setEventsUnavailable(!!res.unavailable);
  }, [mode]);

  const markRead = useCallback(async (sessionId: string) => {
    await markChatReadAction(sessionId);
    setUnread((prev) => {
      if (!prev[sessionId]) return prev;
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
  }, []);

  const scheduleSilentReload = useCallback(() => {
    if (reloadTimer.current) return;
    reloadTimer.current = window.setTimeout(() => {
      reloadTimer.current = null;
      if (refreshing.current) return;
      refreshing.current = true;
      void loadSessions().finally(() => {
        refreshing.current = false;
      });
    }, 400);
  }, [loadSessions]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setLoadingList(false);
      setListErr("Not signed in");
      return;
    }
    let active = true;
    (async () => {
      const list = await loadSessions({ initial: true });
      if (!active) return;
      if (initialSessionId) {
        setFStatus("all");
        setSelectedId(initialSessionId);
      } else if (mode === "user" && !bootstrapped.current) {
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
      .channel(`live-chat-list-${mode}-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_sessions" }, (payload) => {
        const s = payload.new as ChatSession;
        if (mode === "user" && s.user_id !== user.id) return;
        scheduleSilentReload();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_sessions" }, (payload) => {
        const s = payload.new as ChatSession;
        if (mode === "user" && s.user_id !== user.id) return;
        setSessions((prev) => {
          const exists = prev.some((x) => x.id === s.id);
          if (!exists) {
            scheduleSilentReload();
            return prev;
          }
          return prev
            .map((x) =>
              x.id === s.id
                ? {
                    ...x,
                    ...s,
                    priority: s.priority ?? x.priority,
                    assigned_admin_id: s.assigned_admin_id ?? x.assigned_admin_id,
                    assigned_admin_name: s.assigned_admin_name ?? x.assigned_admin_name,
                    welcome_sent_at: s.welcome_sent_at ?? x.welcome_sent_at,
                    joined_at: s.joined_at ?? x.joined_at,
                    resolved_at: s.resolved_at ?? x.resolved_at,
                  }
                : x,
            )
            .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const msg = payload.new as ChatMessage;
        const known = sessionsRef.current.some((x) => x.id === msg.session_id);
        if (!known) {
          scheduleSilentReload();
          return;
        }
        const incoming = mode === "admin" ? msg.sender_role === "user" : msg.sender_role === "admin";
        if (incoming && msg.session_id !== selectedIdRef.current) {
          setUnread((prev) => ({ ...prev, [msg.session_id]: (prev[msg.session_id] ?? 0) + 1 }));
        }
        if (msg.session_id === selectedIdRef.current) {
          setThreads((prev) => {
            const current = prev[msg.session_id] ?? [];
            if (current.some((m) => m.id === msg.id)) return prev;
            return { ...prev, [msg.session_id]: [...current, msg] };
          });
          if (incoming) void markRead(msg.session_id);
        }
        setSessions((prev) =>
          prev.map((x) =>
            x.id === msg.session_id
              ? {
                  ...x,
                  last_message_at: msg.created_at,
                  last_message_preview: msg.message.slice(0, 140),
                  updated_at: msg.created_at,
                }
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
      if (reloadTimer.current) {
        window.clearTimeout(reloadTimer.current);
        reloadTimer.current = null;
      }
    };
  }, [supabase, loadSessions, scheduleSilentReload, markRead, mode, user]);

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible" || refreshing.current) return;
      refreshing.current = true;
      const sid = selectedIdRef.current;
      Promise.all([
        loadSessions(),
        sid ? loadThread(sid) : Promise.resolve(),
      ]).finally(() => {
        refreshing.current = false;
      });
    }, mode === "admin" ? 12_000 : 25_000);
    return () => window.clearInterval(interval);
  }, [user, mode, loadSessions, loadThread]);

  useEffect(() => {
    if (!selectedId) {
      setChatErr(null);
      lastMsgIdRef.current = null;
      setAgentEvents([]);
      return;
    }
    const sessionId = selectedId;
    const hasCache = (threads[sessionId] ?? []).length > 0;
    if (!hasCache) setLoadingThreads((prev) => ({ ...prev, [sessionId]: true }));
    setChatErr(null);
    void loadThread(sessionId, { showLoader: !hasCache });
    void markRead(sessionId);
    if (mode === "admin") void loadAgentEvents(sessionId);

    const channel = supabase
      .channel(`chat-thread-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (msg.session_id !== selectedIdRef.current) return;
          setThreads((prev) => {
            const current = prev[msg.session_id] ?? [];
            if (current.some((m) => m.id === msg.id)) return prev;
            return { ...prev, [msg.session_id]: [...current, msg] };
          });
          const incoming = mode === "admin" ? msg.sender_role === "user" : msg.sender_role === "admin";
          if (incoming) void markRead(sessionId);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const s = payload.new as ChatSession;
          setSessions((prev) =>
            prev.map((x) =>
              x.id === s.id
                ? {
                    ...x,
                    ...s,
                    priority: s.priority ?? x.priority,
                    assigned_admin_id: s.assigned_admin_id ?? x.assigned_admin_id,
                    assigned_admin_name: s.assigned_admin_name ?? x.assigned_admin_name,
                    welcome_sent_at: s.welcome_sent_at ?? x.welcome_sent_at,
                    joined_at: s.joined_at ?? x.joined_at,
                    resolved_at: s.resolved_at ?? x.resolved_at,
                  }
                : x,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, supabase, loadThread, markRead, mode, loadAgentEvents]);

  useEffect(() => {
    if (!selectedId) return;
    const list = threads[selectedId] ?? [];
    const last = list[list.length - 1]?.id ?? null;
    if (!last || last === lastMsgIdRef.current) return;
    lastMsgIdRef.current = last;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [threads, selectedId]);

  const selected = useMemo(
    () => sessions.find((s) => s.id === selectedId) ?? null,
    [sessions, selectedId],
  );

  const messages = useMemo(
    () => (selectedId ? threads[selectedId] ?? [] : []),
    [threads, selectedId],
  );

  const customer = selected ? customers[selected.user_id] : undefined;

  const previousCases = useMemo(() => {
    if (mode !== "admin" || !selected) return [];
    return sessions.filter((s) => s.user_id === selected.user_id && s.id !== selected.id);
  }, [mode, sessions, selected]);

  const counts = useMemo(() => {
    const waiting = sessions.filter((s) => s.status === "waiting").length;
    const active = sessions.filter((s) => s.status === "active").length;
    const closed = sessions.filter((s) => s.status === "closed").length;
    return { waiting, active, closed, all: sessions.length };
  }, [sessions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = sessions.filter((s) => {
      const matchQ =
        !q ||
        (s.reference_id ?? "").toLowerCase().includes(q) ||
        (s.last_message_preview ?? "").toLowerCase().includes(q) ||
        (s.assigned_admin_name ?? "").toLowerCase().includes(q) ||
        (customers[s.user_id]?.name ?? "").toLowerCase().includes(q) ||
        (customers[s.user_id]?.email ?? "").toLowerCase().includes(q);
      if (!matchQ) return false;
      if (fStatus === "all") return true;
      if (fStatus === "open") return s.status === "waiting" || s.status === "active";
      return s.status === fStatus;
    });
    if (mode === "admin") {
      const rank = (s: ChatSession) => (s.status === "waiting" ? 0 : s.status === "active" ? 1 : 2);
      return [...list].sort((a, b) => {
        const r = rank(a) - rank(b);
        if (r !== 0) return r;
        return +new Date(b.updated_at) - +new Date(a.updated_at);
      });
    }
    return list;
  }, [sessions, query, fStatus, customers, mode]);

  const joinSession = async () => {
    if (mode !== "admin" || !selectedId || joining) return;
    setJoining(true);
    setChatErr(null);
    setActionMsg(null);
    const res = await joinChatSessionAction(selectedId);
    if (!res.ok) {
      setJoining(false);
      setChatErr(res.error ?? "Could not join this session. Please retry.");
      return;
    }
    setSessions((prev) =>
      prev.map((s) =>
        s.id === selectedId
          ? {
              ...s,
              status: (res.status as ChatSession["status"]) ?? "active",
              assigned_admin_name: res.adminName ?? s.assigned_admin_name,
              assigned_admin_id: res.assignedAdminId ?? user?.id ?? s.assigned_admin_id,
              welcome_sent_at: res.welcome ? new Date().toISOString() : s.welcome_sent_at,
              joined_at: s.joined_at ?? new Date().toISOString(),
            }
          : s,
      ),
    );
    setActionMsg(res.welcome ? "Joined. The welcome message was delivered." : "Joined this session.");
    await loadThread(selectedId);
    void loadSessions();
    setJoining(false);
  };

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
    const created = list.find((s) => s.id === res.sessionId);
    setFStatus("open");
    setSelectedId(created?.id ?? res.sessionId);
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
    await loadThread(selectedId);
  };

  const closeSession = async () => {
    if (!selectedId) return;
    const res = await closeChatSessionAction(selectedId);
    if (res.ok) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === selectedId ? { ...s, status: "closed" as const, resolved_at: new Date().toISOString() } : s,
        ),
      );
      setActionMsg("Case resolved. History and case ID are preserved.");
      if (fStatus === "open" || fStatus === "waiting" || fStatus === "active") {
        setFStatus("closed");
      }
    } else {
      setChatErr(res.error ?? "Could not close session");
    }
  };

  const saveNote = async () => {
    if (!selectedId || savingNote) return;
    const body = noteBody.trim();
    if (body.length < 2) return;
    setSavingNote(true);
    setChatErr(null);
    const res = await addChatInternalNoteAction({ sessionId: selectedId, body });
    setSavingNote(false);
    if (!res.ok) {
      setChatErr(res.error ?? "Could not save the internal note.");
      return;
    }
    setNoteBody("");
    setActionMsg("Internal note saved. Clients cannot see it.");
    void loadAgentEvents(selectedId);
  };

  const submitEscalation = async () => {
    if (!selectedId || escalating) return;
    const reason = escalationReason.trim();
    if (reason.length < 3) {
      setChatErr("Record a reason before escalating.");
      return;
    }
    setEscalating(true);
    setChatErr(null);
    const res = await escalateChatSessionAction({ sessionId: selectedId, reason });
    setEscalating(false);
    if (!res.ok) {
      setChatErr(res.error ?? "Could not record the escalation.");
      return;
    }
    setEscalationReason("");
    setEscalationOpen(false);
    setActionMsg("Escalation recorded with your reason.");
    void loadAgentEvents(selectedId);
  };

  const changePriority = async (priority: ChatSession["priority"]) => {
    if (!selectedId || !priority) return;
    const previous = sessions;
    setSessions((prev) => prev.map((s) => (s.id === selectedId ? { ...s, priority } : s)));
    const res = await updateChatPriorityAction({ sessionId: selectedId, priority });
    if (!res.ok) {
      setSessions(previous);
      setChatErr(res.error ?? "Could not update priority.");
    }
  };

  const supportHref = mode === "admin" ? "/admin/support" : "/dashboard/support";
  const presenceLabel =
    agentOnline === null ? "Checking agent status" : agentOnline ? "Agents online" : "Agents offline";
  const showThreadLoader = selectedId ? loadingThreads[selectedId] && messages.length === 0 : false;

  const filterTabs: { value: FilterValue; label: string; count: number }[] =
    mode === "admin"
      ? [
          { value: "waiting", label: "Waiting", count: counts.waiting },
          { value: "active", label: "Active", count: counts.active },
          { value: "closed", label: "Closed", count: counts.closed },
          { value: "all", label: "All", count: counts.all },
        ]
      : [
          { value: "open", label: "Open", count: counts.waiting + counts.active },
          { value: "closed", label: "Closed", count: counts.closed },
          { value: "all", label: "All", count: counts.all },
        ];

  return (
    <div className="glass gradient-border flex h-[calc(100dvh-13rem)] min-h-[520px] flex-col overflow-hidden rounded-3xl lg:flex-row">
      <aside
        className={cn(
          "flex w-full flex-col border-b border-border/60 lg:w-[21rem] lg:shrink-0 lg:border-b-0 lg:border-r",
          selectedId ? "hidden lg:flex" : "",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-display text-sm font-bold">
              {mode === "admin" ? "Support queue" : "Your sessions"}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", agentOnline ? "bg-emerald-500" : "bg-slate-400")} />
              {presenceLabel}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => void loadSessions()} aria-label="Refresh sessions">
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
              placeholder={mode === "admin" ? "Search client, email, case ID…" : "Search case ID…"}
              className="h-9 pl-9 text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Session filters">
            {filterTabs.map((tab) => {
              const activeTab = fStatus === tab.value;
              const alert = tab.value === "waiting" && tab.count > 0;
              return (
                <button
                  key={tab.value}
                  role="tab"
                  aria-selected={activeTab}
                  onClick={() => setFStatus(tab.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    activeTab
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:bg-primary/5",
                  )}
                >
                  {alert && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                  {tab.label}
                  <span className={cn("tabular-nums", activeTab ? "text-primary/80" : "text-muted-foreground/70")}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
          {listErr && sessions.length > 0 && (
            <p className="text-xs text-red-500" role="alert">
              {listErr}{" "}
              <button className="font-semibold underline" onClick={() => void loadSessions()}>
                Retry
              </button>
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList && sessions.length === 0 ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-16" />
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
                  void loadSessions({ initial: true });
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
                  : fStatus === "waiting"
                    ? "The waiting queue is empty. New client sessions appear here automatically."
                    : fStatus === "active"
                      ? "No active conversations right now."
                      : fStatus === "open" && sessions.length > 0
                        ? "No open sessions. Closed cases are under Closed."
                        : "No live chat sessions yet."}
              </p>
              {mode === "user" && fStatus !== "closed" && (
                <Button size="sm" variant="outline" onClick={startChat} disabled={starting}>
                  {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {chatErr ? "Retry live chat" : "Start a live chat"}
                </Button>
              )}
              {mode === "admin" && fStatus === "waiting" && sessions.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setFStatus("all")}>
                  View all sessions
                </Button>
              )}
            </div>
          ) : (
            <ul>
              {filtered.map((s) => {
                const active = s.id === selectedId;
                const unreadCount = unread[s.id] ?? 0;
                const who = customers[s.user_id];
                const waitFrom = s.status === "waiting" ? s.created_at : s.joined_at ?? s.created_at;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelectedId(s.id)}
                      className={cn(
                        "flex w-full items-start gap-3 border-l-2 px-4 py-3.5 text-left transition-colors",
                        active
                          ? "border-primary bg-gradient-to-r from-blue-600/10 to-cyan-400/10"
                          : "border-transparent hover:bg-primary/5",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">
                            {mode === "admin" ? who?.name ?? "Client" : s.reference_id ?? "Pending ID"}
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            {s.status === "waiting" && (
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
                        {mode === "admin" && (
                          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-cyan-600 dark:text-cyan-400">
                            <span className="font-mono tracking-wide">{s.reference_id ?? "Pending ID"}</span>
                          </span>
                        )}
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {s.last_message_preview || "No messages yet"}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-2">
                          <StatusBadge status={s.status} />
                          {mode === "admin" && s.priority && s.priority !== "normal" && (
                            <span
                              className={cn(
                                "rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                                priorityStyle(s.priority),
                              )}
                            >
                              {PRIORITY_LABELS[s.priority] ?? s.priority}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {s.status === "closed"
                              ? fmtDate(s.created_at)
                              : s.status === "waiting"
                                ? `Waiting ${fmtDuration(waitFrom, now)}`
                                : `Open ${fmtDuration(waitFrom, now)}`}
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

      <section className={cn("flex min-w-0 flex-1 flex-col border-b border-border/60 lg:border-b-0", !selectedId ? "hidden lg:flex" : "")}>
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-400/20 text-cyan-500">
              <Headset className="h-7 w-7" />
            </div>
            {mode === "user" ? (
              <>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Start a live session for realtime help. Each case keeps a permanent reference ID, and closed cases
                  stay in your history. Support cases live in Support Inbox.
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn("h-2 w-2 rounded-full", agentOnline ? "bg-emerald-500" : "bg-slate-400")} />
                  {presenceLabel}
                </div>
                {agentOnline === false && (
                  <p className="max-w-sm text-xs text-amber-600 dark:text-amber-400">
                    Agents are offline right now. You can still start a session and your messages are saved.
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
              <div className="max-w-md space-y-2">
                <p className="font-display text-sm font-bold">Select a conversation to begin</p>
                <p className="text-sm text-muted-foreground">
                  New client sessions arrive in the Waiting queue automatically. Opening the list does not join a
                  case — use Join session to take it.
                </p>
                {counts.waiting > 0 && (
                  <p className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {counts.waiting} waiting for an agent
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
              <button
                className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary lg:hidden"
                onClick={() => setSelectedId(null)}
                aria-label="Back to sessions"
              >
                <ChevronLeft className="h-4 w-4" /> Sessions
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-bold">
                  {mode === "admin"
                    ? customer?.name ?? "Client"
                    : selected.reference_id ?? "Session"}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
                  {mode === "admin" && (
                    <>
                      <span className="inline-flex items-center gap-1 font-mono text-cyan-600 dark:text-cyan-400">
                        Case {selected.reference_id ?? "pending"}
                      </span>
                      <span>
                        {selected.status === "closed"
                          ? `Resolved ${fmtDate(selected.resolved_at ?? selected.updated_at)}`
                          : `${selected.status === "waiting" ? "Waiting" : "Open"} ${fmtDuration(
                              selected.status === "waiting" ? selected.created_at : selected.joined_at ?? selected.created_at,
                              now,
                            )}`}
                      </span>
                      {selected.assigned_admin_name && <span>Agent: {selected.assigned_admin_name}</span>}
                    </>
                  )}
                  {mode === "user" && (
                    <span>
                      {selected.assigned_admin_name
                        ? `Connected with ${selected.assigned_admin_name}`
                        : selected.status === "waiting"
                          ? "Waiting for an agent"
                          : selected.status === "closed"
                            ? `Closed ${fmtDate(selected.resolved_at ?? selected.updated_at)}`
                            : "Support team"}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    {connected ? <Radio className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3" />}
                    {connected ? "Realtime" : "Auto-refresh"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={selected.status} />
                {mode === "admin" && selected.status !== "closed" && !selected.assigned_admin_id && (
                  <Button size="sm" onClick={joinSession} disabled={joining}>
                    {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
                    Join session
                  </Button>
                )}
                {mode === "admin" && selected.status !== "closed" && selected.assigned_admin_id && (
                  <Button size="sm" variant="outline" onClick={closeSession}>
                    <CheckCircle2 className="h-4 w-4" /> Resolve
                  </Button>
                )}
                {mode === "user" && selected.status !== "closed" && (
                  <Button size="sm" variant="outline" onClick={closeSession}>
                    End session
                  </Button>
                )}
              </div>
            </div>

            {selected.assigned_admin_name && selected.status !== "closed" && (
              <div className="border-b border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 sm:px-5">
                {mode === "admin"
                  ? `You are handling this case as ${selected.assigned_admin_name}. The client can see your name and the welcome message.`
                  : `${selected.assigned_admin_name} has joined this chat.`}
              </div>
            )}
            {actionMsg && (
              <div className="border-b border-border/60 bg-primary/5 px-4 py-2 text-xs font-medium text-primary sm:px-5">
                {actionMsg}
              </div>
            )}
            {mode === "user" && agentOnline === false && selected.status !== "closed" && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300 sm:px-5">
                <span>Agents are offline. Messages are saved. You can also open a support case.</span>
                <Button size="sm" variant="outline" asChild>
                  <Link href={supportHref}>Open a support case</Link>
                </Button>
              </div>
            )}

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              {showThreadLoader ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-2/3" />
                  <Skeleton className="ml-auto h-12 w-1/2" />
                  <Skeleton className="h-12 w-3/5" />
                </div>
              ) : chatErr && messages.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <p className="text-sm text-red-500">{chatErr}</p>
                  <Button size="sm" variant="outline" onClick={() => void loadThread(selected.id, { showLoader: true })}>
                    Retry
                  </Button>
                </div>
              ) : messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {mode === "admin" ? "No messages yet. Join and greet the client." : "No messages yet. Say hello."}
                </p>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((m) => {
                    const mine = mode === "admin" ? m.sender_role === "admin" : m.sender_role === "user";
                    const isWelcome = m.kind === "welcome";
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
                              isWelcome && "ring-1 ring-cyan-400/40",
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

            {chatErr && messages.length > 0 && (
              <p className="px-4 pt-2 text-xs text-red-500 sm:px-5" role="alert">
                {chatErr}
              </p>
            )}

            <div className="border-t border-border/60 p-3 sm:p-4">
              {selected.status !== "closed" ? (
                mode === "admin" && !selected.assigned_admin_id ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      Join this waiting session to send the welcome message and reply as support.
                    </p>
                    <Button size="sm" onClick={joinSession} disabled={joining}>
                      {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
                      Join session
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sendOk && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400" role="status">
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
                            void sendReply();
                          }
                        }}
                        placeholder={mode === "user" ? "Message the support team…" : "Reply as agent…"}
                        rows={2}
                        className="flex-1 resize-none rounded-xl border border-input bg-white/60 px-4 py-3 text-sm text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none dark:bg-white/5"
                        aria-label="Live chat message"
                      />
                      <Button size="sm" onClick={sendReply} disabled={sending || !reply.trim()}>
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  This case is closed. Its reference ID and full history are kept.{" "}
                  {mode === "user" ? (
                    <>
                      <button className="font-semibold text-primary hover:underline" onClick={startChat}>
                        Start a new chat
                      </button>
                      {" for a new case ID, or "}
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
            </div>
          </>
        )}
      </section>

      {mode === "admin" && selected && (
        <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-border/60 xl:flex">
          <div className="border-b border-border/60 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Customer</p>
            <p className="mt-1 truncate font-display text-sm font-bold">{customer?.name ?? "Client"}</p>
            <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-cyan-500" />
                <span className="truncate">{customer?.email ?? "No email on file"}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-cyan-500" />
                <span className="truncate">{customer?.phone ?? "No phone on file"}</span>
              </p>
            </div>
          </div>

          <div className="border-b border-border/60 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Case</p>
            <p className="mt-1 font-mono text-sm font-semibold tracking-wide text-cyan-600 dark:text-cyan-400">
              {selected.reference_id ?? "Pending ID"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Opened {fmtDateTime(selected.created_at)}
            </p>
            {selected.status === "closed" && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Resolved {fmtDateTime(selected.resolved_at ?? selected.updated_at)}
              </p>
            )}
            <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Priority
            </label>
            <select
              value={selected.priority ?? "normal"}
              onChange={(e) => void changePriority(e.target.value as ChatSession["priority"])}
              disabled={selected.status === "closed"}
              className="mt-1 h-9 w-full rounded-xl border border-input bg-white/60 px-2 text-xs capitalize dark:bg-white/5"
              aria-label="Case priority"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
            {selected.status !== "closed" && (
              <div className="mt-3 space-y-2">
                {!escalationOpen ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setEscalationOpen(true);
                      setActionMsg(null);
                    }}
                  >
                    <AlertTriangle className="h-4 w-4" /> Escalate case
                  </Button>
                ) : (
                  <div className="space-y-2 rounded-xl border border-orange-500/30 bg-orange-500/5 p-2.5">
                    <textarea
                      value={escalationReason}
                      onChange={(e) => setEscalationReason(e.target.value)}
                      rows={2}
                      placeholder="Record why this needs escalation…"
                      className="w-full resize-none rounded-lg border border-input bg-white/60 px-2.5 py-2 text-xs dark:bg-white/5"
                      aria-label="Escalation reason"
                    />
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={submitEscalation} disabled={escalating}>
                        {escalating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Record
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEscalationOpen(false);
                          setEscalationReason("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-b border-border/60 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <StickyNote className="h-3.5 w-3.5" /> Internal notes
            </p>
            {eventsUnavailable ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Apply the latest database migration to enable internal notes.
              </p>
            ) : (
              <>
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                  {agentEvents.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">No internal notes yet.</p>
                  ) : (
                    agentEvents.map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "rounded-lg border px-2.5 py-2 text-[11px]",
                          event.kind === "escalation"
                            ? "border-orange-500/30 bg-orange-500/5"
                            : "border-border/60 bg-primary/5",
                        )}
                      >
                        <p className="mb-1 flex items-center justify-between gap-2 font-semibold text-muted-foreground">
                          <span>{event.kind === "escalation" ? "Escalation" : "Note"}</span>
                          <span className="font-normal">{fmtDate(event.created_at)}</span>
                        </p>
                        <p className="whitespace-pre-line text-foreground">{event.body}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">by {event.author_name ?? "Agent"}</p>
                      </div>
                    ))
                  )}
                </div>
                <textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  rows={2}
                  placeholder="Private note (clients never see this)…"
                  className="mt-2 w-full resize-none rounded-lg border border-input bg-white/60 px-2.5 py-2 text-xs dark:bg-white/5"
                  aria-label="Internal note"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1.5 w-full"
                  onClick={saveNote}
                  disabled={savingNote || noteBody.trim().length < 2}
                >
                  {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StickyNote className="h-3.5 w-3.5" />}
                  Save note
                </Button>
              </>
            )}
          </div>

          <div className="px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <History className="h-3.5 w-3.5" /> Previous cases
            </p>
            {previousCases.length === 0 ? (
              <p className="mt-2 text-[11px] text-muted-foreground">This is the client&apos;s first live chat.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {previousCases.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelectedId(c.id)}
                      className="w-full rounded-lg border border-border/60 px-2.5 py-2 text-left text-[11px] transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-cyan-600 dark:text-cyan-400">
                          {c.reference_id ?? "Pending ID"}
                        </span>
                        <StatusBadge status={c.status} />
                      </span>
                      <span className="mt-0.5 block truncate text-muted-foreground">
                        {c.last_message_preview || fmtDate(c.created_at)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
