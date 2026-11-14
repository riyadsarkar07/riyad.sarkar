"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
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
  RotateCcw,
  Search,
  Send,
  StickyNote,
  Timer,
  User,
  UserPlus,
  WifiOff,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSupabase } from "@/hooks/use-supabase";
import {
  addChatInternalNoteAction,
  assignChatSessionAction,
  claimChatSessionAction,
  clientEndChatSessionAction,
  closeChatSessionAction,
  escalateChatSessionAction,
  loadChatAgentEventsAction,
  loadChatCaseTimelineAction,
  loadChatRoutingDirectoryAction,
  loadChatStaffDirectoryAction,
  loadLiveChatInboxAction,
  loadLiveChatMessagesAction,
  markChatPendingClientAction,
  markChatReadAction,
  offerChatSessionAction,
  reopenChatSessionAction,
  resolveChatSessionAction,
  respondChatAssignmentAction,
  respondChatEscalationAction,
  returnChatSessionToQueueAction,
  sendChatMessageAction,
  setChatAgentStatusAction,
  startChatSessionAction,
  updateChatPriorityAction,
} from "@/app/actions";
import { StatusBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AGENT_STATUSES,
  AGENT_STATUS_LABELS,
  CHAT_PRIORITIES,
  CHAT_STAFF_RANK,
  CHAT_STAFF_ROLE_LABELS,
  PRIORITY_LABELS,
} from "@/lib/constants";
import type { AgentStatus } from "@/lib/constants";
import type {
  ChatAssignment,
  ChatCaseEvent,
  ChatDepartment,
  ChatEscalation,
  ChatStaffMember,
  ChatTeam,
} from "@/types/dashboard";
import type { ChatAgentEvent, ChatCustomer, ChatMessage, ChatSession } from "@/types/dashboard";

type Mode = "user" | "admin";
type FilterValue = "open" | "waiting" | "active" | "pending_client" | "resolved" | "closed" | "all";

const PAGE_SIZE = 25;

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

/** Human SLA state derived from real server timestamps, never invented. */
function slaState(s: ChatSession, nowMs: number) {
  const out: {
    firstOverdue: boolean;
    resolutionOverdue: boolean;
    firstDueIn: number | null;
    resolutionDueIn: number | null;
  } = {
    firstOverdue: !!s.first_response_breached,
    resolutionOverdue: !!s.resolution_breached,
    firstDueIn: null,
    resolutionDueIn: null,
  };
  const paused = !!s.sla_paused_since;
  if (paused) return out;
  if (s.first_response_due_at && !s.first_response_at) {
    const inMs = new Date(s.first_response_due_at).getTime() - nowMs;
    out.firstDueIn = inMs;
    if (inMs < 0) out.firstOverdue = true;
  }
  if (s.resolution_due_at && s.status !== "resolved" && s.status !== "closed") {
    const inMs = new Date(s.resolution_due_at).getTime() - nowMs;
    out.resolutionDueIn = inMs;
    if (inMs < 0) out.resolutionOverdue = true;
  }
  return out;
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
    case "critical":
      return "border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400";
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
  staffRole = null,
}: {
  mode: Mode;
  initialSessionId?: string | null;
  staffRole?: string | null;
}) {
  const { user, isLoaded } = useAuth();
  const supabase = useSupabase();
  const [activeStaffRole, setActiveStaffRole] = useState<string | null>(staffRole);
  const rank = activeStaffRole
    ? (CHAT_STAFF_RANK as Record<string, number>)[activeStaffRole] ?? 0
    : 0;
  const isStaff = mode === "admin" && rank >= 1;
  const canSupervise = rank >= 3;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [customers, setCustomers] = useState<Record<string, ChatCustomer>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({});
  const [threadHasMore, setThreadHasMore] = useState<Record<string, boolean>>({});
  const [loadingOlder, setLoadingOlder] = useState(false);
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
  const [nextCursor, setNextCursor] = useState<{ updated_at: string | null; id: string | null; has_more: boolean } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [agentEvents, setAgentEvents] = useState<ChatAgentEvent[]>([]);
  const [eventsUnavailable, setEventsUnavailable] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [showResolvedHint, setShowResolvedHint] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [timeline, setTimeline] = useState<{
    events: ChatCaseEvent[];
    escalations: ChatEscalation[];
    assignments: ChatAssignment[];
  }>({ events: [], escalations: [], assignments: [] });
  const [staffDir, setStaffDir] = useState<ChatStaffMember[]>([]);
  const [departments, setDepartments] = useState<ChatDepartment[]>([]);
  const [teams, setTeams] = useState<ChatTeam[]>([]);

  const [dialog, setDialog] = useState<
    | null
    | { kind: "resolve" }
    | { kind: "close" }
    | { kind: "reopen" }
    | { kind: "return" }
    | { kind: "assign" }
    | { kind: "offer" }
    | { kind: "escalate" }
  >(null);
  const [dialogReason, setDialogReason] = useState("");
  const [dialogStaff, setDialogStaff] = useState<string>("");
  const [dialogEscType, setDialogEscType] = useState<"staff" | "role" | "team" | "department">("staff");
  const [dialogEscRole, setDialogEscRole] = useState<string>("supervisor");
  const [dialogEscTeam, setDialogEscTeam] = useState<string>("");
  const [dialogEscDept, setDialogEscDept] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  const sessionsRef = useRef<ChatSession[]>([]);
  const loadSeq = useRef(0);
  const lastMsgIdRef = useRef<string | null>(null);
  const bootstrapped = useRef(false);
  const refreshing = useRef(false);
  const reloadTimer = useRef<number | null>(null);
  const loadSessionsRef = useRef<((opts?: { initial?: boolean; append?: boolean }) => Promise<ChatSession[]>) | null>(null);
  const inboxRequestSeq = useRef(0);

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

  const statusFilters = useCallback((): string[] | null => {
    switch (fStatus) {
      case "open":
        return ["waiting", "active", "pending_client"];
      case "waiting":
        return ["waiting"];
      case "active":
        return ["active"];
      case "pending_client":
        return ["pending_client"];
      case "resolved":
        return ["resolved"];
      case "closed":
        return ["closed"];
      default:
        return null;
    }
  }, [fStatus]);

  const loadSessions = useCallback(
    async (opts?: { initial?: boolean; append?: boolean }) => {
      const requestSeq = ++inboxRequestSeq.current;
      const res = await loadLiveChatInboxAction(mode, {
        statuses: statusFilters(),
        query: query.trim() || null,
        cursorUpdatedAt: opts?.append ? nextCursor?.updated_at ?? null : null,
        cursorId: opts?.append ? nextCursor?.id ?? null : null,
        limit: PAGE_SIZE,
      });
      // Reject stale requests from an older filter or query.
      if (requestSeq !== inboxRequestSeq.current) return sessionsRef.current;
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
      if (opts?.append) {
        setSessions((prev) => {
          const byId = new Map(prev.map((s) => [s.id, s]));
          for (const s of list) byId.set(s.id, { ...byId.get(s.id), ...s });
          return Array.from(byId.values()).sort(
            (a, b) => +new Date(b.updated_at) - +new Date(a.updated_at),
          );
        });
      } else {
        applySessions(list);
      }
      setNextCursor(res.nextCursor ?? null);
      setListErr(null);
      setLoadingList(false);
      setLoadingMore(false);
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
      if (res.staffRole !== undefined && res.staffRole !== null) setActiveStaffRole(res.staffRole);
      return list;
    },
    [applySessions, mode, statusFilters, query, nextCursor],
  );

  loadSessionsRef.current = loadSessions;

  const loadThread = useCallback(
    async (sessionId: string, opts?: { showLoader?: boolean; older?: boolean }) => {
      const seq = ++loadSeq.current;
      if (opts?.showLoader) {
        setLoadingThreads((prev) => ({ ...prev, [sessionId]: true }));
      }
      const existing = threads[sessionId] ?? [];
      const oldest = existing[0];
      const res = await loadLiveChatMessagesAction(sessionId, {
        beforeCreatedAt: opts?.older && oldest ? oldest.created_at : null,
        beforeId: opts?.older && oldest ? oldest.id : null,
        limit: 50,
      });
      if (seq !== loadSeq.current) return;
      setLoadingThreads((prev) => ({ ...prev, [sessionId]: false }));
      setLoadingOlder(false);
      if (!res.ok) {
        if (selectedIdRef.current === sessionId) {
          setChatErr(res.error || "Could not load messages.");
        }
        return;
      }
      const incoming = res.messages ?? [];
      setThreadHasMore((prev) => ({ ...prev, [sessionId]: !!res.hasMore }));
      setThreads((prev) => {
        const merged = mergeChatMessages(prev[sessionId] ?? [], incoming);
        return { ...prev, [sessionId]: merged };
      });
    },
    [threads],
  );

  const loadAgentEvents = useCallback(
    async (sessionId: string) => {
      if (mode !== "admin") return;
      const res = await loadChatAgentEventsAction(sessionId);
      if (!res.ok) return;
      setAgentEvents(res.events ?? []);
      setEventsUnavailable(!!res.unavailable);
    },
    [mode],
  );

  const loadTimeline = useCallback(async (sessionId: string) => {
    if (mode !== "admin") return;
    const res = await loadChatCaseTimelineAction(sessionId);
    if (!res.ok || !res.timeline) return;
    setTimeline({
      events: res.timeline.events,
      escalations: res.timeline.escalations,
      assignments: res.timeline.assignments,
    });
  }, [mode]);

  const loadDirectories = useCallback(async () => {
    if (mode !== "admin") return;
    if (rank >= 2) {
      const res = await loadChatStaffDirectoryAction();
      if (res.ok) setStaffDir(res.staff ?? []);
    }
    const routing = await loadChatRoutingDirectoryAction();
    if (routing.ok) {
      setDepartments(routing.departments ?? []);
      setTeams(routing.teams ?? []);
    }
  }, [mode, rank]);

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
      void (loadSessionsRef.current?.() ?? Promise.resolve([])).finally(() => {
        refreshing.current = false;
      });
    }, 400);
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
      const list = await loadSessions({ initial: true });
      if (!active) return;
      void loadDirectories();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user, initialSessionId, mode]);

  // Reload the list when filters/search change (not on every render).
  useEffect(() => {
    if (!bootstrapped.current) return;
    const t = window.setTimeout(() => void loadSessions(), 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fStatus, query]);

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
            .map((x) => (x.id === s.id ? { ...x, ...s } : x))
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
        if (status === "SUBSCRIBED") {
          // Resync after any reconnect so no message is missed.
          void loadSessionsRef.current?.();
          const sid = selectedIdRef.current;
          if (sid) void loadThread(sid);
        }
      });

    const onVis = () => {
      if (document.visibilityState === "visible") void loadSessionsRef.current?.();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, user, mode]);

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible" || refreshing.current) return;
      refreshing.current = true;
      const sid = selectedIdRef.current;
      Promise.all([loadSessionsRef.current?.() ?? Promise.resolve([]), sid ? loadThread(sid) : Promise.resolve()]).finally(() => {
        refreshing.current = false;
      });
    }, mode === "admin" ? 12_000 : 25_000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mode]);

  useEffect(() => {
    if (!selectedId) {
      setChatErr(null);
      lastMsgIdRef.current = null;
      setAgentEvents([]);
      setTimeline({ events: [], escalations: [], assignments: [] });
      return;
    }
    const sessionId = selectedId;
    const hasCache = (threads[sessionId] ?? []).length > 0;
    if (!hasCache) setLoadingThreads((prev) => ({ ...prev, [sessionId]: true }));
    setChatErr(null);
    setActionMsg(null);
    setShowResolvedHint(false);
    void loadThread(sessionId, { showLoader: !hasCache });
    void markRead(sessionId);
    if (mode === "admin") {
      void loadAgentEvents(sessionId);
      void loadTimeline(sessionId);
    }

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
          setSessions((prev) => prev.map((x) => (x.id === s.id ? { ...x, ...s } : x)));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, supabase, loadThread, markRead, mode, loadAgentEvents, loadTimeline]);

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
    const pendingClient = sessions.filter((s) => s.status === "pending_client").length;
    const resolved = sessions.filter((s) => s.status === "resolved").length;
    const closed = sessions.filter((s) => s.status === "closed").length;
    return { waiting, active, pendingClient, resolved, closed, all: sessions.length };
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
      return true;
    });
    if (mode === "admin") {
      const rankOf = (s: ChatSession) =>
        s.status === "waiting" ? 0 : s.status === "active" ? 1 : s.status === "pending_client" ? 2 : 3;
      return [...list].sort((a, b) => {
        const r = rankOf(a) - rankOf(b);
        if (r !== 0) return r;
        return +new Date(b.updated_at) - +new Date(a.updated_at);
      });
    }
    return list;
  }, [sessions, query, customers, mode]);

  const selectedEscalation = useMemo(
    () => timeline.escalations.find((e) => e.status === "pending" || e.status === "accepted") ?? null,
    [timeline.escalations],
  );

  const myPendingOffer = useMemo(() => {
    if (!user) return null;
    return (
      timeline.assignments.find((a) => a.status === "offered" && a.assignee_id === user.id) ?? null
    );
  }, [timeline.assignments, user]);

  const isAssignedToMe = !!selected && !!user && selected.assigned_admin_id === user.id;
  const canWriteSelected = canSupervise || isAssignedToMe;
  const sla = selected ? slaState(selected, now) : null;

  /* ---------------------------------------------------------------- */
  /*  Actions                                                          */
  /* ---------------------------------------------------------------- */

  const claim = async () => {
    if (!selectedId || joining) return;
    setJoining(true);
    setChatErr(null);
    setActionMsg(null);
    const res = await claimChatSessionAction(selectedId);
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
              assigned_admin_id: res.assignedAdminId ?? user?.id ?? s.assigned_admin_id,
              assigned_admin_name: res.assignedAdminName ?? s.assigned_admin_name,
              joined_at: s.joined_at ?? new Date().toISOString(),
            }
          : s,
      ),
    );
    setActionMsg("You are now the assigned agent for this case.");
    await loadThread(selectedId);
    void loadSessions();
    void loadTimeline(selectedId);
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
    // Never inherit a previous case's messages, even across same-page starts.
    setThreads((prev) => ({ ...prev, [res.sessionId!]: [] }));
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

  const runDialogAction = async () => {
    if (!selectedId || !dialog || busy) return;
    setBusy(true);
    setChatErr(null);
    let res: { ok: boolean; error?: string; session?: ChatSession } = { ok: false, error: "Unknown action" };
    if (dialog.kind === "resolve") {
      res = await resolveChatSessionAction(selectedId, dialogReason.trim() || undefined);
      if (res.ok) {
        setActionMsg("Case resolved and confirmed in the database; history is preserved.");
        setShowResolvedHint(true);
        setFStatus("resolved");
      }
    } else if (dialog.kind === "close") {
      res = await closeChatSessionAction(selectedId, dialogReason.trim() || undefined);
      if (res.ok) {
        setActionMsg("Case closure confirmed in the database; history is preserved.");
        setFStatus("closed");
      }
    } else if (dialog.kind === "reopen") {
      res = await reopenChatSessionAction(selectedId, dialogReason.trim());
      if (res.ok) {
        setActionMsg("Case reopen confirmed in the database.");
        setFStatus("open");
      }
    } else if (dialog.kind === "return") {
      res = await returnChatSessionToQueueAction({ sessionId: selectedId, reason: dialogReason.trim() });
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === selectedId
              ? { ...s, status: "waiting" as const, assigned_admin_id: null, assigned_admin_name: null }
              : s,
          ),
        );
        setActionMsg("Case returned to the waiting queue.");
      }
    } else if (dialog.kind === "assign") {
      res = await assignChatSessionAction({
        sessionId: selectedId,
        assigneeId: dialogStaff || null,
        reason: dialogReason.trim() || null,
      });
      if (res.ok) {
        setActionMsg("Case reassigned.");
        void loadSessions();
      }
    } else if (dialog.kind === "offer") {
      res = await offerChatSessionAction({
        sessionId: selectedId,
        targetStaffId: dialogStaff,
        reason: dialogReason.trim(),
      });
      if (res.ok) setActionMsg("Transfer offer sent.");
    } else if (dialog.kind === "escalate") {
      res = await escalateChatSessionAction({
        sessionId: selectedId,
        targetType: dialogEscType,
        targetStaffId: dialogEscType === "staff" ? dialogStaff || null : null,
        targetRole: dialogEscType === "role" ? dialogEscRole : null,
        targetTeamId: dialogEscType === "team" ? dialogEscTeam || null : null,
        targetDepartmentId: dialogEscType === "department" ? dialogEscDept || null : null,
        reason: dialogReason.trim(),
      });
      if (res.ok) setActionMsg("Escalation created.");
    }
    setBusy(false);
    if (!res.ok) {
      setChatErr(res.error ?? "Action failed.");
      return;
    }
    // Lifecycle badges use only the database row returned after the RPC.
    if (res.session) {
      setSessions((prev) => prev.map((row) => row.id === res.session!.id ? res.session! : row));
    }
    setDialog(null);
    setDialogReason("");
    setDialogStaff("");
    if (selectedId) {
      void loadTimeline(selectedId);
      void loadSessions();
    }
  };

  const respondOffer = async (accept: boolean) => {
    if (!myPendingOffer) return;
    setBusy(true);
    const res = await respondChatAssignmentAction({
      assignmentId: myPendingOffer.id,
      accept,
      reason: accept ? null : "Declined by agent",
    });
    setBusy(false);
    if (!res.ok) {
      setChatErr(res.error ?? "Could not respond to the offer.");
      return;
    }
    setActionMsg(accept ? "You accepted the case." : "Offer declined.");
    void loadSessions();
    if (selectedId) void loadTimeline(selectedId);
  };

  const respondEscalation = async (action: "accept" | "reject" | "return" | "cancel") => {
    if (!selectedEscalation) return;
    setBusy(true);
    const res = await respondChatEscalationAction({
      escalationId: selectedEscalation.id,
      action,
      reason: action === "accept" ? null : dialogReason.trim() || `${action} by staff`,
    });
    setBusy(false);
    if (!res.ok) {
      setChatErr(res.error ?? "Could not respond to the escalation.");
      return;
    }
    setActionMsg(`Escalation ${action}ed.`);
    setDialog(null);
    setDialogReason("");
    if (selectedId) void loadTimeline(selectedId);
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

  const togglePendingClient = async () => {
    if (!selectedId) return;
    setBusy(true);
    const res = await markChatPendingClientAction(selectedId);
    setBusy(false);
    if (!res.ok) {
      setChatErr(res.error ?? "Could not update the case.");
      return;
    }
    setSessions((prev) =>
      prev.map((s) => (s.id === selectedId ? { ...s, status: "pending_client" as const } : s)),
    );
    setActionMsg("Case is now waiting for the customer.");
  };

  const changePresence = async (status: AgentStatus) => {
    const res = await setChatAgentStatusAction(status);
    if (!res.ok) setChatErr(res.error ?? "Could not update presence.");
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
          { value: "pending_client", label: "Awaiting", count: counts.pendingClient },
          { value: "resolved", label: "Resolved", count: counts.resolved },
          { value: "closed", label: "Closed", count: counts.closed },
          { value: "all", label: "All", count: counts.all },
        ]
      : [
          { value: "open", label: "Open", count: counts.waiting + counts.active + counts.pendingClient },
          { value: "resolved", label: "Resolved", count: counts.resolved },
          { value: "closed", label: "Closed", count: counts.closed },
          { value: "all", label: "All", count: counts.all },
        ];

  const openDialog = (kind: NonNullable<typeof dialog>["kind"]) => {
    setDialog({ kind } as NonNullable<typeof dialog>);
    setDialogReason("");
    setDialogStaff("");
    setChatErr(null);
  };

  return (
    <div className="glass gradient-border flex h-[calc(100dvh-11rem)] min-h-[560px] flex-col overflow-hidden rounded-3xl lg:h-[calc(100dvh-9rem)] lg:flex-row">
      {/* Queue / list panel */}
      <aside
        className={cn(
          "flex w-full flex-col border-b border-border/60 lg:w-[20rem] lg:shrink-0 lg:border-b-0 lg:border-r",
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

        {mode === "admin" && isStaff && (
          <div className="border-b border-border/60 px-3 py-2">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              My presence
            </label>
            <select
              className="mt-1 h-8 w-full rounded-lg border border-input bg-white/60 px-2 text-xs dark:bg-white/5"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) void changePresence(e.target.value as AgentStatus);
              }}
              aria-label="Set my agent presence"
            >
              <option value="" disabled>
                Set status…
              </option>
              {AGENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {AGENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        )}

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
                  onClick={() => {
                    setSelectedId(null);
                    setFStatus(tab.value);
                  }}
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
                  : fStatus === "resolved"
                    ? "No resolved cases right now."
                    : fStatus === "waiting"
                      ? "The waiting queue is empty. New client sessions appear here automatically."
                      : "No live chat sessions yet."}
              </p>
              {mode === "user" && fStatus !== "closed" && (
                <Button size="sm" variant="outline" onClick={startChat} disabled={starting}>
                  {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {chatErr ? "Retry live chat" : "Start a live chat"}
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
                const rowSla = slaState(s, now);
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => {
                        setSelectedId(s.id);
                        setDetailsOpen(false);
                      }}
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
                          {(rowSla.firstOverdue || rowSla.resolutionOverdue) && (
                            <span className="rounded-full border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-600 dark:text-red-400">
                              SLA
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {s.status === "closed" || s.status === "resolved"
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
              {nextCursor?.has_more && (
                <li className="p-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={loadingMore}
                    onClick={() => {
                      setLoadingMore(true);
                      void loadSessions({ append: true });
                    }}
                  >
                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Load more
                  </Button>
                </li>
              )}
            </ul>
          )}
        </div>
      </aside>

      {/* Thread panel */}
      <section
        className={cn(
          "flex min-w-0 flex-1 flex-col border-b border-border/60 lg:border-b-0",
          !selectedId ? "hidden lg:flex" : "",
        )}
      >
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
                  case — use Claim case to take it.
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
                  {mode === "admin" ? customer?.name ?? "Client" : selected.reference_id ?? "Session"}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
                  {mode === "admin" && (
                    <>
                      <span className="inline-flex items-center gap-1 font-mono text-cyan-600 dark:text-cyan-400">
                        Case {selected.reference_id ?? "pending"}
                      </span>
                      <span>
                        {selected.status === "resolved"
                          ? `Resolved ${fmtDate(selected.resolved_at ?? selected.updated_at)}`
                          : selected.status === "closed"
                            ? `Closed ${fmtDate(selected.closed_at ?? selected.updated_at)}`
                            : `${fmtDuration(
                                selected.status === "waiting" ? selected.created_at : selected.joined_at ?? selected.created_at,
                                now,
                              )}`}
                      </span>
                      {selected.assigned_admin_name && <span>Owner: {selected.assigned_admin_name}</span>}
                      {selected.team_id && <span>Team routed</span>}
                    </>
                  )}
                  {mode === "user" && (
                    <span>
                      {selected.assigned_admin_name
                        ? `Connected with ${selected.assigned_admin_name}`
                        : selected.status === "waiting"
                          ? "Waiting for an agent"
                          : selected.status === "resolved"
                            ? `Resolved ${fmtDate(selected.resolved_at ?? selected.updated_at)}`
                            : selected.status === "closed"
                              ? `Closed ${fmtDate(selected.closed_at ?? selected.updated_at)}`
                              : "Support team"}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1" aria-live="polite">
                    {connected ? <Radio className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3" />}
                    {connected ? "Realtime" : "Auto-refresh"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={selected.status} />
                {mode === "admin" && isStaff && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="xl:hidden"
                    onClick={() => setDetailsOpen(true)}
                    aria-label="Open case details"
                  >
                    <StickyNote className="h-4 w-4" /> Details
                  </Button>
                )}
                {mode === "admin" && selected.status !== "resolved" && selected.status !== "closed" && !selected.assigned_admin_id && (
                  <Button size="sm" onClick={claim} disabled={joining}>
                    {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
                    Claim case
                  </Button>
                )}
                {mode === "admin" && canWriteSelected && selected.status !== "resolved" && selected.status !== "closed" && (
                  <Button size="sm" variant="outline" onClick={() => openDialog("resolve")} disabled={busy}>
                    <CheckCircle2 className="h-4 w-4" /> Resolve
                  </Button>
                )}
                {mode === "admin" && canSupervise && selected.status !== "closed" && (
                  <Button size="sm" variant="ghost" onClick={() => openDialog("close")} disabled={busy}>
                    Close
                  </Button>
                )}
                {mode === "admin" && (selected.status === "resolved" || selected.status === "closed") &&
                  ((selected.status === "resolved" && rank >= 2) || (selected.status === "closed" && canSupervise)) && (
                    <Button size="sm" variant="outline" onClick={() => openDialog("reopen")} disabled={busy}>
                      <RotateCcw className="h-4 w-4" /> Reopen
                    </Button>
                  )}
                {mode === "user" && selected.status !== "resolved" && selected.status !== "closed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const res = await clientEndChatSessionAction(selected.id);
                      if (res.ok && res.session) {
                        setSessions((prev) => prev.map((s) => s.id === res.session!.id ? res.session! : s));
                        setFStatus("resolved");
                        setActionMsg("Case ended and confirmed in the database. New Chat creates a separate case.");
                      } else {
                        setChatErr(res.error ?? "Could not end the session.");
                      }
                    }}
                  >
                    End session
                  </Button>
                )}
              </div>
            </div>

            {mode === "admin" && isStaff && myPendingOffer && selected.assigned_admin_id !== user?.id && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs text-cyan-700 dark:text-cyan-300 sm:px-5">
                <span>You have a pending transfer offer for this case.</span>
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={() => void respondOffer(true)} disabled={busy}>
                    Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void respondOffer(false)} disabled={busy}>
                    Decline
                  </Button>
                </div>
              </div>
            )}

            {selected.assigned_admin_id === user?.id && selected.status !== "resolved" && selected.status !== "closed" && (
              <div className="border-b border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 sm:px-5">
                {mode === "admin"
                  ? `You are handling this case as ${selected.assigned_admin_name ?? "the assigned agent"}.`
                  : `${selected.assigned_admin_name} has joined this chat.`}
              </div>
            )}

            {actionMsg && (
              <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-primary/5 px-4 py-2 text-xs font-medium text-primary sm:px-5" role="status" aria-live="polite">
                <span>{actionMsg}</span>
                {showResolvedHint && (
                  <button
                    className="rounded-full border border-primary/40 px-2 py-0.5 text-[11px] font-semibold"
                    onClick={() => {
                      setFStatus("resolved");
                      setShowResolvedHint(false);
                    }}
                  >
                    Show resolved
                  </button>
                )}
              </div>
            )}

            {mode === "admin" && isStaff && selectedEscalation && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-500/30 bg-orange-500/10 px-4 py-2.5 text-xs text-orange-700 dark:text-orange-300 sm:px-5">
                <span className="inline-flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Escalation {selectedEscalation.status} · {selectedEscalation.reason.slice(0, 60)}
                </span>
                {selectedEscalation.status === "pending" && (
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={() => void respondEscalation("accept")} disabled={busy}>
                      Accept
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openDialog("escalate")} disabled={busy}>
                      Manage
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite">
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
                  {mode === "admin" ? "No messages yet. Claim the case and greet the client." : "No messages yet. Say hello."}
                </p>
              ) : (
                <>
                  {threadHasMore[selected.id] && (
                    <div className="flex justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loadingOlder}
                        onClick={() => {
                          setLoadingOlder(true);
                          void loadThread(selected.id, { older: true });
                        }}
                      >
                        {loadingOlder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <History className="h-3.5 w-3.5" />}
                        Load earlier messages
                      </Button>
                    </div>
                  )}
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
                </>
              )}
            </div>

            {chatErr && messages.length > 0 && (
              <p className="px-4 pt-2 text-xs text-red-500 sm:px-5" role="alert">
                {chatErr}
              </p>
            )}

            <div className="border-t border-border/60 p-3 sm:p-4">
              {selected.status === "resolved" || selected.status === "closed" ? (
                <div className="text-center text-sm text-muted-foreground">
                  {selected.status === "resolved" ? "This case is resolved." : "This case is closed."} Its reference ID
                  and full history are kept.{" "}
                  {mode === "user" ? (
                    <>
                      Send a message to reopen it (within 72 hours), or{" "}
                      <button className="font-semibold text-primary hover:underline" onClick={startChat}>
                        start a new case
                      </button>
                      {"."}
                    </>
                  ) : (
                    <span>Use Reopen to continue working on it, or ask the client to start a new case.</span>
                  )}
                </div>
              ) : mode === "admin" && !selected.assigned_admin_id ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Claim this case to reply as the assigned agent.
                  </p>
                  <Button size="sm" onClick={claim} disabled={joining}>
                    {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
                    Claim case
                  </Button>
                </div>
              ) : mode === "admin" && !canWriteSelected ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-primary/5 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    This case is owned by {selected.assigned_admin_name ?? "another agent"}. Only the owner or a
                    supervisor can reply.
                  </p>
                  {rank >= 2 && (
                    <Button size="sm" variant="outline" onClick={() => openDialog("offer")} disabled={busy}>
                      <ArrowUpRight className="h-4 w-4" /> Offer transfer
                    </Button>
                  )}
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
                  {mode === "admin" && canWriteSelected && (
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="ghost" onClick={togglePendingClient} disabled={busy}>
                        <Timer className="h-3.5 w-3.5" /> Waiting for customer
                      </Button>
                      {rank >= 2 && (
                        <Button size="sm" variant="ghost" onClick={() => openDialog("offer")} disabled={busy}>
                          <ArrowUpRight className="h-3.5 w-3.5" /> Transfer
                        </Button>
                      )}
                      {canSupervise && (
                        <Button size="sm" variant="ghost" onClick={() => openDialog("assign")} disabled={busy}>
                          <UserPlus className="h-3.5 w-3.5" /> Assign
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openDialog("escalate")} disabled={busy}>
                        <AlertTriangle className="h-3.5 w-3.5" /> Escalate
                      </Button>
                      {(isAssignedToMe || canSupervise) && (
                        <Button size="sm" variant="ghost" onClick={() => openDialog("return")} disabled={busy}>
                          <RotateCcw className="h-3.5 w-3.5" /> Return to queue
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Details panel: inline on wide screens, slide-over otherwise */}
      {mode === "admin" && selected && (
        <>
          <aside
            className={cn(
              "hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-border/60 xl:flex",
            )}
          >
            <DetailsBody
              selected={selected}
              customer={customer}
              sla={sla}
              rank={rank}
              isAssignedToMe={isAssignedToMe}
              canSupervise={canSupervise}
              agentEvents={agentEvents}
              eventsUnavailable={eventsUnavailable}
              noteBody={noteBody}
              setNoteBody={setNoteBody}
              savingNote={savingNote}
              saveNote={saveNote}
              timeline={timeline}
              previousCases={previousCases}
              onSelectCase={(id) => setSelectedId(id)}
              onChangePriority={changePriority}
              openDialog={openDialog}
              busy={busy}
            />
          </aside>

          <AnimatePresence>
            {detailsOpen && (
              <motion.div
                className="fixed inset-0 z-50 flex justify-end bg-black/40 xl:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDetailsOpen(false)}
              >
                <motion.aside
                  className="flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-border bg-background"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "tween", duration: 0.22 }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Case details"
                >
                  <div className="sticky top-0 flex items-center justify-between border-b border-border/60 bg-background px-4 py-3">
                    <p className="font-display text-sm font-bold">Case details</p>
                    <Button size="sm" variant="ghost" onClick={() => setDetailsOpen(false)} aria-label="Close details">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <DetailsBody
                    selected={selected}
                    customer={customer}
                    sla={sla}
                    rank={rank}
                    isAssignedToMe={isAssignedToMe}
                    canSupervise={canSupervise}
                    agentEvents={agentEvents}
                    eventsUnavailable={eventsUnavailable}
                    noteBody={noteBody}
                    setNoteBody={setNoteBody}
                    savingNote={savingNote}
                    saveNote={saveNote}
                    timeline={timeline}
                    previousCases={previousCases}
                    onSelectCase={(id) => {
                      setSelectedId(id);
                      setDetailsOpen(false);
                    }}
                    onChangePriority={changePriority}
                    openDialog={openDialog}
                    busy={busy}
                    bare
                  />
                </motion.aside>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Dialogs */}
      <AnimatePresence>
        {dialog && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !busy && setDialog(null)}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={
                dialog.kind === "assign"
                  ? "Assign case"
                  : dialog.kind === "offer"
                    ? "Offer transfer"
                    : dialog.kind === "escalate"
                      ? "Escalate case"
                      : `Confirm ${dialog.kind}`
              }
            >
              <h3 className="font-display text-base font-bold capitalize">
                {`${dialog.kind} case`}
              </h3>

              {(dialog.kind === "assign" || dialog.kind === "offer") && (
                <div className="mt-3 space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Staff member</label>
                  <select
                    value={dialogStaff}
                    onChange={(e) => setDialogStaff(e.target.value)}
                    className="h-10 w-full rounded-xl border border-input bg-white/60 px-3 text-sm dark:bg-white/5"
                  >
                    <option value="">Select staff…</option>
                    {staffDir
                      .filter((m) => m.id !== user?.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} · {CHAT_STAFF_ROLE_LABELS[m.staff_role] ?? m.staff_role} · {m.active_cases} active
                        </option>
                      ))}
                  </select>
                  {dialog.kind === "assign" && (
                    <p className="text-[11px] text-muted-foreground">
                      Leaving the member blank returns the case to the team queue.
                    </p>
                  )}
                </div>
              )}

              {dialog.kind === "escalate" && (
                <div className="mt-3 space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Escalate to</label>
                  <select
                    value={dialogEscType}
                    onChange={(e) => setDialogEscType(e.target.value as typeof dialogEscType)}
                    className="h-10 w-full rounded-xl border border-input bg-white/60 px-3 text-sm dark:bg-white/5"
                  >
                    <option value="staff">A specific staff member</option>
                    <option value="role">A role queue</option>
                    <option value="team">A team</option>
                    <option value="department">A department</option>
                  </select>
                  {dialogEscType === "staff" && (
                    <select
                      value={dialogStaff}
                      onChange={(e) => setDialogStaff(e.target.value)}
                      className="h-10 w-full rounded-xl border border-input bg-white/60 px-3 text-sm dark:bg-white/5"
                    >
                      <option value="">Select staff…</option>
                      {staffDir.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} · {CHAT_STAFF_ROLE_LABELS[m.staff_role] ?? m.staff_role}
                        </option>
                      ))}
                    </select>
                  )}
                  {dialogEscType === "role" && (
                    <select
                      value={dialogEscRole}
                      onChange={(e) => setDialogEscRole(e.target.value)}
                      className="h-10 w-full rounded-xl border border-input bg-white/60 px-3 text-sm dark:bg-white/5"
                    >
                      <option value="senior_agent">Senior Agent</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                  {dialogEscType === "team" && (
                    <select
                      value={dialogEscTeam}
                      onChange={(e) => setDialogEscTeam(e.target.value)}
                      className="h-10 w-full rounded-xl border border-input bg-white/60 px-3 text-sm dark:bg-white/5"
                    >
                      <option value="">Select team…</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {dialogEscType === "department" && (
                    <select
                      value={dialogEscDept}
                      onChange={(e) => setDialogEscDept(e.target.value)}
                      className="h-10 w-full rounded-xl border border-input bg-white/60 px-3 text-sm dark:bg-white/5"
                    >
                      <option value="">Select department…</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {dialog.kind !== "assign" && dialog.kind !== "offer" && dialog.kind !== "escalate" && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {dialog.kind === "resolve" && "Resolving keeps the full history and case ID. The customer can reopen within 72 hours."}
                  {dialog.kind === "close" && "Closing archives the case. Only supervisors and admins can close."}
                  {dialog.kind === "reopen" && "Reopening restarts SLA tracking and requires a reason."}
                  {dialog.kind === "return" && "Returning the case sends it back to the waiting queue."}
                </p>
              )}

              <label className="mt-3 block text-xs font-semibold text-muted-foreground">
                {dialog.kind === "resolve"
                  ? "Resolution summary (optional)"
                  : dialog.kind === "assign" || dialog.kind === "offer"
                    ? "Reason"
                    : dialog.kind === "escalate"
                      ? "Reason (required)"
                      : "Reason (required)"}
              </label>
              <textarea
                value={dialogReason}
                onChange={(e) => setDialogReason(e.target.value)}
                rows={3}
                className="mt-1 w-full resize-none rounded-xl border border-input bg-white/60 px-3 py-2 text-sm dark:bg-white/5"
                aria-label="Reason"
              />

              {dialog.kind === "escalate" && selectedEscalation && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => void respondEscalation("return")} disabled={busy}>
                    Return escalation
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void respondEscalation("cancel")} disabled={busy}>
                    Cancel escalation
                  </Button>
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDialog(null)} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={runDialogAction} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirm
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Case details panel                                                 */
/* ------------------------------------------------------------------ */

function DetailsBody({
  selected,
  customer,
  sla,
  rank,
  isAssignedToMe,
  canSupervise,
  agentEvents,
  eventsUnavailable,
  noteBody,
  setNoteBody,
  savingNote,
  saveNote,
  timeline,
  previousCases,
  onSelectCase,
  onChangePriority,
  openDialog,
  busy,
  bare,
}: {
  selected: ChatSession;
  customer: ChatCustomer | undefined;
  sla: ReturnType<typeof slaState> | null;
  rank: number;
  isAssignedToMe: boolean;
  canSupervise: boolean;
  agentEvents: ChatAgentEvent[];
  eventsUnavailable: boolean;
  noteBody: string;
  setNoteBody: (v: string) => void;
  savingNote: boolean;
  saveNote: () => void;
  timeline: { events: ChatCaseEvent[]; escalations: ChatEscalation[]; assignments: ChatAssignment[] };
  previousCases: ChatSession[];
  onSelectCase: (id: string) => void;
  onChangePriority: (p: ChatSession["priority"]) => void;
  openDialog: (kind: "resolve" | "close" | "reopen" | "return" | "assign" | "offer" | "escalate") => void;
  busy: boolean;
  bare?: boolean;
}) {
  return (
    <div className={cn(bare ? "px-4 py-3" : "")}>
      <div className={cn("border-b border-border/60 py-3", bare ? "" : "px-4")}>
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

      <div className={cn("border-b border-border/60 py-3", bare ? "" : "px-4")}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Case</p>
        <p className="mt-1 font-mono text-sm font-semibold tracking-wide text-cyan-600 dark:text-cyan-400">
          {selected.reference_id ?? "Pending ID"}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Opened {fmtDateTime(selected.created_at)}
          {typeof selected.reopen_count === "number" && selected.reopen_count > 0
            ? ` · reopened ${selected.reopen_count}×`
            : ""}
        </p>
        {selected.resolved_at && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">Resolved {fmtDateTime(selected.resolved_at)}</p>
        )}
        {selected.closed_at && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">Closed {fmtDateTime(selected.closed_at)}</p>
        )}

        {sla && (sla.firstDueIn !== null || sla.resolutionDueIn !== null || sla.firstOverdue || sla.resolutionOverdue) && (
          <div className="mt-2 space-y-1 rounded-lg border border-border/60 bg-primary/5 p-2 text-[11px]">
            <p className="font-semibold text-muted-foreground">SLA</p>
            {selected.first_response_due_at && (
              <p className={cn(sla.firstOverdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                First response:{" "}
                {selected.first_response_at
                  ? "met"
                  : sla.firstOverdue
                    ? "overdue"
                    : `${fmtDuration(new Date().toISOString(), Date.now() + (sla.firstDueIn ?? 0))} left`}
              </p>
            )}
            {selected.resolution_due_at && selected.status !== "resolved" && selected.status !== "closed" && (
              <p className={cn(sla.resolutionOverdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                Resolution:{" "}
                {sla.resolutionOverdue
                  ? "overdue"
                  : `${fmtDuration(new Date().toISOString(), Date.now() + (sla.resolutionDueIn ?? 0))} left`}
              </p>
            )}
            {selected.sla_paused_since && <p className="text-amber-600 dark:text-amber-400">Paused (waiting on customer)</p>}
          </div>
        )}

        <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Priority
        </label>
        <select
          value={selected.priority ?? "normal"}
          onChange={(e) => void onChangePriority(e.target.value as ChatSession["priority"])}
          disabled={selected.status === "resolved" || selected.status === "closed" || !(isAssignedToMe || canSupervise)}
          className="mt-1 h-9 w-full rounded-xl border border-input bg-white/60 px-2 text-xs capitalize dark:bg-white/5"
          aria-label="Case priority"
        >
          {CHAT_PRIORITIES.map((p) => (
            <option key={p} value={p} disabled={p === "critical" && rank < 3}>
              {PRIORITY_LABELS[p]}
              {p === "critical" && rank < 3 ? " (supervisor only)" : ""}
            </option>
          ))}
        </select>

        {selected.status !== "resolved" && selected.status !== "closed" && (
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {(isAssignedToMe || canSupervise) && (
              <Button size="sm" variant="outline" onClick={() => openDialog("resolve")} disabled={busy}>
                Resolve
              </Button>
            )}
            {rank >= 2 && (
              <Button size="sm" variant="outline" onClick={() => openDialog("offer")} disabled={busy}>
                Transfer
              </Button>
            )}
            {canSupervise && (
              <Button size="sm" variant="outline" onClick={() => openDialog("assign")} disabled={busy}>
                Assign
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => openDialog("escalate")} disabled={busy}>
              Escalate
            </Button>
            {canSupervise && (
              <Button size="sm" variant="ghost" onClick={() => openDialog("close")} disabled={busy}>
                Close
              </Button>
            )}
          </div>
        )}
      </div>

      <div className={cn("border-b border-border/60 py-3", bare ? "" : "px-4")}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Assignment</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {selected.assigned_admin_name ? `Owner: ${selected.assigned_admin_name}` : "Unassigned (queue)"}
        </p>
        {timeline.assignments.length > 0 && (
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
            {timeline.assignments.slice(0, 8).map((a) => (
              <li key={a.id} className="rounded-lg border border-border/60 px-2 py-1.5 text-[10px] text-muted-foreground">
                <span className="font-semibold text-foreground">{a.assignee_name ?? "Team queue"}</span> · {a.status}
                {a.reason ? ` · ${a.reason}` : ""}
                <span className="block">{fmtDate(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={cn("border-b border-border/60 py-3", bare ? "" : "px-4")}>
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

      {timeline.escalations.length > 0 && (
        <div className={cn("border-b border-border/60 py-3", bare ? "" : "px-4")}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Escalations</p>
          <ul className="mt-2 space-y-1.5">
            {timeline.escalations.slice(0, 6).map((e) => (
              <li key={e.id} className="rounded-lg border border-orange-500/30 bg-orange-500/5 px-2.5 py-2 text-[10px]">
                <p className="flex items-center justify-between gap-2 font-semibold">
                  <span className="uppercase">{e.status}</span>
                  <span className="font-normal text-muted-foreground">{fmtDate(e.created_at)}</span>
                </p>
                <p className="mt-0.5 text-foreground">{e.reason}</p>
                <p className="mt-0.5 text-muted-foreground">to {e.target_type}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={cn("py-3", bare ? "" : "px-4")}>
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
                  onClick={() => onSelectCase(c.id)}
                  className="w-full rounded-lg border border-border/60 px-2.5 py-2 text-left text-[11px] transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-cyan-600 dark:text-cyan-400">{c.reference_id ?? "Pending ID"}</span>
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
    </div>
  );
}
