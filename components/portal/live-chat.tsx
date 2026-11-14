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
import { readLiveChatEnrichment, readLiveChatInbox, readLiveChatMessages } from "@/lib/live-chat-read";
import {
  addChatInternalNoteAction,
  assignChatSessionAction,
  joinChatSessionAction,
  clientEndChatSessionAction,
  closeChatSessionAction,
  escalateChatSessionAction,
  loadChatAgentEventsAction,
  loadChatCaseTimelineAction,
  loadChatCustomerHistoryAction,
  loadChatRoutingDirectoryAction,
  loadChatStaffDirectoryAction,
  markChatPendingClientAction,
  markChatReadAction,
  offerChatSessionAction,
  reopenChatSessionAction,
  resolveChatSessionAction,
  respondChatAssignmentAction,
  respondChatEscalationAction,
  returnChatEscalationToQueueAction,
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
import { chatStatusMatchesFilter, reconcileChatSession, selectChatSession, selectPreviousChatCases, statusesForChatFilter } from "@/lib/chat-queue";
import type { ChatQueueFilter } from "@/lib/chat-queue";
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
type FilterValue = ChatQueueFilter;

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
  // Counts come from a database aggregate across the complete accessible
  // inbox, not the currently paginated or filtered queue.
  const [serverCounts, setServerCounts] = useState<{
    waiting: number;
    active: number;
    pendingClient: number;
    resolved: number;
    closed: number;
    all: number;
  } | null>(null);
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
  const viewKey = `${mode}|\u0000|${fStatus}|\u0000|${query.trim()}`;
  const [loadedViewKey, setLoadedViewKey] = useState<string | null>(null);
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
  const [timelineSessionId, setTimelineSessionId] = useState<string | null>(null);
  const [customerHistory, setCustomerHistory] = useState<Record<string, ChatSession[]>>({});
  const [historyNextOffset, setHistoryNextOffset] = useState<Record<string, number | null>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({});
  const [historyErrors, setHistoryErrors] = useState<Record<string, string>>({});
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
  const [dialogAssignTarget, setDialogAssignTarget] = useState<"staff" | "team" | "department" | "queue">("staff");
  const [dialogEscType, setDialogEscType] = useState<"staff" | "role" | "team" | "department">("staff");
  const [dialogEscRole, setDialogEscRole] = useState<string>("supervisor");
  const [dialogEscTeam, setDialogEscTeam] = useState<string>("");
  const [dialogEscDept, setDialogEscDept] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  const sessionsRef = useRef<ChatSession[]>([]);
  // The latest message cache is needed for pagination, but must not be a
  // dependency of loadThread: fetching an empty case also updates `threads`.
  const threadsRef = useRef(threads);
  // Separate in-flight generations per case; loading case B must not cancel A.
  const loadSeq = useRef<Record<string, number>>({});
  const lastMsgIdRef = useRef<string | null>(null);
  const bootstrapped = useRef(false);
  const refreshing = useRef(false);
  const reloadTimer = useRef<number | null>(null);
  const loadSessionsRef = useRef<((opts?: { initial?: boolean; append?: boolean }) => Promise<ChatSession[]>) | null>(null);
  const inboxRequestSeq = useRef(0);
  const latestFilterRef = useRef(fStatus);
  const lastRequestedViewRef = useRef(viewKey);
  const historyRequestSeq = useRef<Record<string, number>>({});
  const connectedRef = useRef(false);
  const startingRef = useRef(false);

  const switchQueueFilter = useCallback((value: FilterValue) => {
    // Re-clicking an active tab must not cancel its only in-flight response.
    if (latestFilterRef.current === value) return;
    latestFilterRef.current = value;
    inboxRequestSeq.current += 1;
    setFStatus(value);
  }, []);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const applySessions = useCallback((list: ChatSession[]) => {
    setSessions((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]));
      return list
        .map((s) => {
          const current = byId.get(s.id);
          return current ? reconcileChatSession(current, s) : s;
        })
        .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
    });
  }, []);

  const statusFilters = useCallback((): string[] | null => statusesForChatFilter(fStatus), [fStatus]);

  const loadSessions = useCallback(
    async (opts?: { initial?: boolean; append?: boolean }) => {
      const requestSeq = ++inboxRequestSeq.current;
      let res: Awaited<ReturnType<typeof readLiveChatInbox>>;
      try {
        res = await readLiveChatInbox(supabase, mode, {
          statuses: statusFilters(),
          query: query.trim() || null,
          cursorUpdatedAt: opts?.append ? nextCursor?.updated_at ?? null : null,
          cursorId: opts?.append ? nextCursor?.id ?? null : null,
          limit: PAGE_SIZE,
        });
      } catch {
        if (requestSeq === inboxRequestSeq.current) {
          setListErr("Could not contact Live Support. Check the connection and retry.");
          setLoadingList(false);
          setLoadingMore(false);
        }
        return sessionsRef.current;
      }
      // Reject stale requests from an older filter or query.
      if (requestSeq !== inboxRequestSeq.current) return sessionsRef.current;
      if (!res.ok) {
        if (opts?.initial) {
          setListErr(res.error || "Could not load live chat sessions.");
          setLoadingList(false);
        } else {
          setListErr(res.error || "Could not refresh live chat sessions.");
        }
        setLoadingMore(false);
        return sessionsRef.current;
      }
      const list = res.sessions ?? [];
      if (opts?.append) {
        setSessions((prev) => {
          const byId = new Map(prev.map((s) => [s.id, s]));
          for (const s of list) {
            const current = byId.get(s.id);
            byId.set(s.id, current ? reconcileChatSession(current, s) : s);
          }
          return Array.from(byId.values()).sort(
            (a, b) => +new Date(b.updated_at) - +new Date(a.updated_at),
          );
        });
      } else {
        applySessions(list);
      }
      if (res.counts) {
        setServerCounts({
          waiting: Number(res.counts.waiting ?? 0),
          active: Number(res.counts.active ?? 0),
          pendingClient: Number(res.counts.pending_client ?? 0),
          resolved: Number(res.counts.resolved ?? 0),
          closed: Number(res.counts.closed ?? 0),
          all: Number(res.counts.all ?? 0),
        });
      }
      setNextCursor(res.nextCursor ?? null);
      setLoadedViewKey(viewKey);
      setListErr(null);
      setLoadingList(false);
      setLoadingMore(false);
      // The case list and status counts are already visible. Populate
      // metadata independently so a slow unread/presence/profile request
      // never leaves Admin "All" waiting on another network round trip.
      void readLiveChatEnrichment(supabase, mode, list).then((enriched) => {
        if (requestSeq !== inboxRequestSeq.current) return;
        if (enriched.customers) {
          setCustomers((prev) => ({ ...prev, ...enriched.customers }));
        }
        if (enriched.unread) setUnread(enriched.unread);
        if (enriched.agentOnline !== undefined) {
          setAgentOnline(enriched.agentOnline ?? null);
        }
      }).catch(() => {
        // Metadata is best-effort; the authenticated queue remains usable.
      });
      return list;
    },
    [applySessions, mode, statusFilters, query, nextCursor, supabase, viewKey],
  );

  loadSessionsRef.current = loadSessions;

  const loadThread = useCallback(
    async (sessionId: string, opts?: { showLoader?: boolean; older?: boolean }) => {
      const seq = (loadSeq.current[sessionId] ?? 0) + 1;
      loadSeq.current[sessionId] = seq;
      if (opts?.showLoader) {
        setLoadingThreads((prev) => ({ ...prev, [sessionId]: true }));
      }
      const existing = threadsRef.current[sessionId] ?? [];
      const oldest = existing[0];

      try {
        const res = await readLiveChatMessages(supabase, sessionId, {
          beforeCreatedAt: opts?.older && oldest ? oldest.created_at : null,
          beforeId: opts?.older && oldest ? oldest.id : null,
          limit: 50,
        });
        // A newer request for this case won the race. Do not replace its
        // pagination/loader state with an out-of-order older response.
        if (seq !== loadSeq.current[sessionId]) return;
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
      } catch {
        if (seq === loadSeq.current[sessionId] && selectedIdRef.current === sessionId) {
          setChatErr("Messages could not be loaded. Please retry.");
        }
      } finally {
        // An empty thread must settle to the empty-state message, not an
        // endless three-bubble loading skeleton on both admin/client screens.
        if (seq === loadSeq.current[sessionId]) {
          setLoadingThreads((prev) => ({ ...prev, [sessionId]: false }));
          setLoadingOlder(false);
        }
      }
    },
    [supabase],
  );

  const loadAgentEvents = useCallback(
    async (sessionId: string) => {
      if (mode !== "admin") return;
      const res = await loadChatAgentEventsAction(sessionId);
      if (!res.ok || selectedIdRef.current !== sessionId) return;
      setAgentEvents(res.events ?? []);
      setEventsUnavailable(!!res.unavailable);
    },
    [mode],
  );

  const loadTimeline = useCallback(async (sessionId: string) => {
    if (mode !== "admin") return;
    const res = await loadChatCaseTimelineAction(sessionId);
    if (!res.ok || !res.timeline || selectedIdRef.current !== sessionId) return;
    setTimelineSessionId(sessionId);
    setTimeline({
      events: res.timeline.events,
      escalations: res.timeline.escalations,
      assignments: res.timeline.assignments,
    });
  }, [mode]);

  // History is independent of the active queue filter and its pagination.
  // The server checks staff authentication and existing case RLS first.
  const loadCustomerHistory = useCallback(async (
    caseId: string, customerId: string, offset = 0,
  ) => {
    const sequence = (historyRequestSeq.current[customerId] ?? 0) + 1;
    historyRequestSeq.current[customerId] = sequence;
    setHistoryLoading((prev) => ({ ...prev, [customerId]: true }));
    setHistoryErrors((prev) => ({ ...prev, [customerId]: "" }));
    try {
      const result = await loadChatCustomerHistoryAction(caseId, offset);
      if (historyRequestSeq.current[customerId] !== sequence) return;
      if (!result.ok || result.customerId !== customerId) {
        setHistoryErrors((prev) => ({
          ...prev, [customerId]: result.error ?? "Could not load case history.",
        }));
        return;
      }
      setCustomerHistory((prev) => {
        const oldCases = offset === 0 ? [] : prev[customerId] ?? [];
        const byId = new Map(oldCases.map((item) => [item.id, item]));
        for (const row of result.cases ?? []) {
          const current = byId.get(row.id);
          byId.set(row.id, current ? reconcileChatSession(current, row) : row);
        }
        return {
          ...prev,
          [customerId]: [...byId.values()].sort(
            (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
          ),
        };
      });
      setHistoryNextOffset((prev) => ({ ...prev, [customerId]: result.nextOffset ?? null }));
    } catch {
      if (historyRequestSeq.current[customerId] === sequence) {
        setHistoryErrors((prev) => ({
          ...prev, [customerId]: "Could not load previous cases. Retry.",
        }));
      }
    } finally {
      if (historyRequestSeq.current[customerId] === sequence) {
        setHistoryLoading((prev) => ({ ...prev, [customerId]: false }));
      }
    }
  }, []);

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
      const firstRequestSeq = inboxRequestSeq.current;
      const list = await loadSessions({ initial: true });
      if (!active) return;
      void loadDirectories();
      if (initialSessionId) {
        switchQueueFilter("all");
        setSelectedId(initialSessionId);
      } else if (mode === "user" && !bootstrapped.current) {
        const open = list.find((s) => s.status === "waiting" || s.status === "active");
        if (open) setSelectedId(open.id);
      }
      bootstrapped.current = true;
      // A tab/search change during the first request invalidates that
      // response, while the filter effect is still waiting for bootstrap.
      // Force a fresh request rather than leaving an endless list skeleton.
      if (inboxRequestSeq.current > firstRequestSeq + 1 && !initialSessionId) {
        window.setTimeout(() => {
          if (active) void loadSessionsRef.current?.({ initial: true });
        }, 0);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user, initialSessionId, mode]);

  // A filter change must schedule its own request, even while the initial
  // Waiting/Open request is bootstrapping. Previously a tab change during
  // bootstrap could leave "All 16" with a permanently empty Waiting list.
  useEffect(() => {
    if (!isLoaded || !user) return;
    if (lastRequestedViewRef.current === viewKey) return;
    lastRequestedViewRef.current = viewKey;
    setLoadingList(true);
    setListErr(null);
    const timer = window.setTimeout(() => {
      void loadSessionsRef.current?.({ initial: true });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [isLoaded, user, viewKey]);

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
            .map((x) => (x.id === s.id ? reconcileChatSession(x, s) : x))
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
      // Chat messages already stream over Realtime. Only refetch the
      // selected thread when disconnected; keep the inbox periodically fresh.
      Promise.all([
        loadSessionsRef.current?.() ?? Promise.resolve([]),
        sid && !connectedRef.current ? loadThread(sid) : Promise.resolve(),
      ]).finally(() => {
        refreshing.current = false;
      });
    }, mode === "admin" ? 20_000 : 25_000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mode]);

  useEffect(() => {
    if (!selectedId) {
      setChatErr(null);
      lastMsgIdRef.current = null;
      setAgentEvents([]);
      setTimeline({ events: [], escalations: [], assignments: [] });
      setTimelineSessionId(null);
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
          setSessions((prev) => prev.map((x) => (x.id === s.id ? reconcileChatSession(x, s) : x)));
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

  const selected = useMemo(() => {
    const queued = selectChatSession(sessions, selectedId, fStatus);
    if (queued) return queued;
    // A historical case may be outside the paginated inbox entirely.
    for (const records of Object.values(customerHistory)) {
      const historical = selectChatSession(records, selectedId, fStatus);
      if (historical) return historical;
    }
    return null;
  }, [sessions, selectedId, fStatus, customerHistory]);

  const messages = useMemo(
    () => (selectedId ? threads[selectedId] ?? [] : []),
    [threads, selectedId],
  );

  // Do not clear selectedId when Realtime reports a status transition.
  // During Join/Accept the case moves Waiting -> Active before the server
  // action returns; clearing here permanently lost the currently viewed
  // conversation. selectChatSession already hides a mismatched detail in
  // the old tab, while explicit tab clicks clear selection deliberately.

  useEffect(() => {
    if (mode !== "admin" || !selected?.user_id) return;
    if (Object.prototype.hasOwnProperty.call(customerHistory, selected.user_id)) return;
    void loadCustomerHistory(selected.id, selected.user_id);
    // Deliberately keyed by customer only; avoid loading history again on
    // every Realtime message or unrelated inbox refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selected?.user_id, loadCustomerHistory]);

  const customer = selected ? customers[selected.user_id] : undefined;

  const previousCases = useMemo(() =>
    mode === "admin" && selected
      ? selectPreviousChatCases(customerHistory[selected.user_id] ?? [], selected)
      : [],
    [mode, selected, customerHistory],
  );

  const openHistoricalCase = (id: string) => {
    switchQueueFilter("all");
    setQuery("");
    setSelectedId(id);
    setDetailsOpen(false);
  };

  const historyCustomerId = selected?.user_id ?? "";
  const isHistoryLoaded = !!historyCustomerId &&
    Object.prototype.hasOwnProperty.call(customerHistory, historyCustomerId);
  const isHistoryLoading = !!historyLoading[historyCustomerId];
  const historyError = historyErrors[historyCustomerId] ?? "";
  const nextHistoryOffset = historyNextOffset[historyCustomerId] ?? null;
  const loadMoreHistory = () => {
    if (selected && nextHistoryOffset !== null && !isHistoryLoading) {
      void loadCustomerHistory(selected.id, selected.user_id, nextHistoryOffset);
    }
  };
  const retryHistory = () => {
    if (selected && !isHistoryLoading) {
      void loadCustomerHistory(selected.id, selected.user_id);
    }
  };
  const visibleTimeline = timelineSessionId === selectedId
    ? timeline
    : { events: [], escalations: [], assignments: [] };

  const counts = useMemo(() => {
    if (serverCounts) return serverCounts;
    // Temporary fallback during initial load only; never present page-sized
    // counts as authoritative once the server aggregate is available.
    const waiting = sessions.filter((s) => s.status === "waiting").length;
    const active = sessions.filter((s) => s.status === "active").length;
    const pendingClient = sessions.filter((s) => s.status === "pending_client").length;
    const resolved = sessions.filter((s) => s.status === "resolved").length;
    const closed = sessions.filter((s) => s.status === "closed").length;
    return { waiting, active, pendingClient, resolved, closed, all: sessions.length };
  }, [sessions, serverCounts]);

  // Counts belong to the global queue, but rows belong to one requested
  // filter. Never display "No sessions" using stale rows from another tab.
  const viewIsPending = loadedViewKey !== viewKey;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = sessions.filter((s) => {
      // Even when Realtime wins a race against an older inbox RPC snapshot,
      // an Active case may never render inside the Closed queue.
      if (!chatStatusMatchesFilter(s.status, fStatus)) return false;
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
  }, [sessions, query, customers, mode, fStatus]);

  const selectedEscalation = useMemo(
    () => timelineSessionId === selectedId
      ? timeline.escalations.find((e) => e.status === "pending" || e.status === "accepted") ?? null
      : null,
    [timeline.escalations, timelineSessionId, selectedId],
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
  // Only offer destinations the current staff member can actually select.
  // Admins are already the highest role: escalating to a lower role queue
  // would be rejected by the database. An agent cannot target themselves.
  const eligibleEscalationStaff = staffDir.filter((member) =>
    member.id !== user?.id && (rank >= 3 ||
      ((CHAT_STAFF_RANK as Record<string, number>)[member.staff_role] ?? 0) > rank)
  );
  const eligibleEscalationRoles = (["senior_agent", "supervisor", "admin"] as const)
    .filter((role) =>
      CHAT_STAFF_RANK[role] > rank &&
      (rank < 2 || staffDir.some((member) => member.staff_role === role && member.id !== user?.id))
    );
  const validEscalationTarget = dialogEscType === "staff"
    ? eligibleEscalationStaff.some((member) => member.id === dialogStaff)
    : dialogEscType === "role"
      ? eligibleEscalationRoles.some((role) => role === dialogEscRole)
      : dialogEscType === "team"
        ? teams.some((team) => team.id === dialogEscTeam)
        : departments.some((department) => department.id === dialogEscDept);

  /* ---------------------------------------------------------------- */
  /*  Actions                                                          */
  /* ---------------------------------------------------------------- */

  const claim = async () => {
    if (!selectedId || joining) return;
    const caseId = selectedId;
    setJoining(true);
    setChatErr(null);
    setActionMsg(null);
    try {
      // `claim_chat_session` only assigns ownership; `join_chat_session`
      // also inserts the one-time welcome message and notifies the client.
      const res = await joinChatSessionAction(caseId);
      if (!res.ok || !res.session) {
        setChatErr(res.error ?? "Agent join could not be confirmed by the database.");
        return;
      }
      const persisted = res.session;
      setSessions((prev) => prev.map((row) => row.id === persisted.id ? persisted : row));
      setSelectedId(caseId);
      switchQueueFilter(persisted.status === "pending_client" ? "pending_client" : "active");
      setActionMsg(res.welcome
        ? "Agent joined. An automatic welcome message was saved in this case."
        : "Agent joined. The welcome message was already saved for this case.");
      // Do not leave the Join button spinning for another message fetch.
      void loadThread(caseId);
      scheduleSilentReload();
      void loadTimeline(caseId);
    } catch {
      setChatErr("Could not finish joining this case. Refresh before retrying.");
    } finally {
      setJoining(false);
    }
  };

  const startChat = async () => {
    // Prevent two clicks before React commits the loading state; otherwise
    // the second request's conflict error could overwrite a successful case.
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    setChatErr(null);
    let res: Awaited<ReturnType<typeof startChatSessionAction>>;
    try {
      res = await startChatSessionAction();
    } catch {
      startingRef.current = false;
      setStarting(false);
      setChatErr("Could not contact the server. Check the session list before retrying.");
      return;
    }
    if (!res.ok || !res.sessionId) {
      startingRef.current = false;
      setStarting(false);
      setChatErr(res.error ?? "Could not start live chat. Please retry.");
      return;
    }
    // Render ONLY the newly inserted database row and its own empty thread.
    // Cancel stale filtered responses before clearing any previous selection.
    inboxRequestSeq.current += 1;
    setThreads((prev) => ({ ...prev, [res.sessionId!]: [] }));
    if (res.session) {
      setSessions((prev) => [res.session!, ...prev.filter((item) => item.id !== res.sessionId)]);
    }
    setQuery("");
    switchQueueFilter("open");
    setSelectedId(res.sessionId);
    setChatErr(null);
    startingRef.current = false;
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
        switchQueueFilter("resolved");
      }
    } else if (dialog.kind === "close") {
      res = await closeChatSessionAction(selectedId, dialogReason.trim() || undefined);
      if (res.ok) {
        setActionMsg("Case closure confirmed in the database; history is preserved.");
        switchQueueFilter("closed");
      }
    } else if (dialog.kind === "reopen") {
      res = await reopenChatSessionAction(selectedId, dialogReason.trim());
      if (res.ok) {
        setActionMsg("Case reopen confirmed in the database.");
        switchQueueFilter("open");
      }
    } else if (dialog.kind === "return") {
      res = await returnChatSessionToQueueAction({ sessionId: selectedId, reason: dialogReason.trim() });
      if (res.ok) {
        setActionMsg("Case returned to waiting queue. Database state confirmed.");
        switchQueueFilter("waiting");
      }
    } else if (dialog.kind === "assign") {
      if (
        (dialogAssignTarget === "staff" && !dialogStaff)
        || (dialogAssignTarget === "team" && !dialogEscTeam)
        || (dialogAssignTarget === "department" && !dialogEscDept)
      ) {
        setBusy(false);
        setChatErr("Select a staff member, team, or department before routing the case.");
        return;
      }
      const selectedTeam = teams.find((team) => team.id === dialogEscTeam);
      res = await assignChatSessionAction({
        sessionId: selectedId,
        assigneeId: dialogAssignTarget === "staff" ? dialogStaff : null,
        teamId: dialogAssignTarget === "team" ? dialogEscTeam : null,
        departmentId: dialogAssignTarget === "department" ? dialogEscDept : (
          dialogAssignTarget === "team" ? selectedTeam?.department_id ?? null : null
        ),
        reason: dialogReason.trim() || null,
      });
      if (res.ok && res.session) {
        setActionMsg("Assignment and routing verified in the database. Case history is preserved.");
        const row = res.session;
        switchQueueFilter(row.status === "waiting" ? "waiting" :
          row.status === "pending_client" ? "pending_client" : "active");
      }
    } else if (dialog.kind === "offer") {
      res = await offerChatSessionAction({
        sessionId: selectedId,
        targetStaffId: dialogStaff,
        reason: dialogReason.trim(),
      });
      if (res.ok) setActionMsg("Transfer offer sent.");
    } else if (dialog.kind === "escalate") {
      if (!validEscalationTarget || dialogReason.trim().length < 3) {
        setBusy(false);
        setChatErr("Select an eligible destination and enter an escalation reason of at least 3 characters.");
        return;
      }
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
      scheduleSilentReload();
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
    if (accept) {
      if (!res.session) {
        setChatErr("Transfer was accepted, but the case ownership was not returned. Refresh the queue.");
        return;
      }
      const persisted = res.session;
      setSessions((prev) => {
        const exists = prev.some((row) => row.id === persisted.id);
        return exists
          ? prev.map((row) => row.id === persisted.id ? persisted : row)
          : [persisted, ...prev];
      });
      switchQueueFilter(persisted.status === "pending_client" ? "pending_client" : "active");
    }
    setActionMsg(accept ? "Transfer accepted; case ownership verified." : "Transfer offer declined.");
    scheduleSilentReload();
    if (selectedId) void loadTimeline(selectedId);
  };

  const respondEscalation = async (action: "accept" | "reject" | "return" | "cancel") => {
    if (!selectedEscalation || busy) return;
    if ((action === "reject" || action === "return") && dialogReason.trim().length < 3) {
      setChatErr("Enter a reason of at least 3 characters before rejecting or returning an escalation.");
      return;
    }
    setBusy(true);
    setChatErr(null);
    const res: { ok: boolean; error?: string; session?: ChatSession } = action === "return"
      ? await returnChatEscalationToQueueAction(selectedEscalation.id, dialogReason.trim())
      : await respondChatEscalationAction({
          escalationId: selectedEscalation.id,
          action,
          reason: action === "accept" ? null : dialogReason.trim() || null,
        });
    setBusy(false);
    if (!res.ok) {
      setChatErr(res.error ?? "Could not respond to the escalation.");
      return;
    }
    if (res.session) {
      const persisted = res.session;
      setSessions((prev) => prev.map((row) => row.id === persisted.id ? persisted : row));
      switchQueueFilter("waiting");
    }
    setActionMsg(({
      accept: "Escalation accepted.",
      reject: "Escalation rejected.",
      return: "Escalation and its case returned to the waiting queue.",
      cancel: "Escalation cancelled.",
    } as const)[action]);
    setDialog(null);
    setDialogReason("");
    scheduleSilentReload();
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
    const res = await updateChatPriorityAction({ sessionId: selectedId, priority });
    if (!res.ok || !res.session) {
      setChatErr(res.error ?? "Priority was not confirmed by the database.");
      return;
    }
    const persisted = res.session;
    setSessions((prev) => prev.map((row) => row.id === persisted.id ? persisted : row));
    setActionMsg("Priority saved and verified.");
    void loadTimeline(selectedId);
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
    if (!res.session) {
      setChatErr("Could not confirm this case status from the database.");
      return;
    }
    const persisted = res.session;
    setSessions((prev) => prev.map((row) => row.id === persisted.id ? persisted : row));
    switchQueueFilter("pending_client");
    setActionMsg("Case is awaiting the customer. Database state confirmed.");
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
    setDialogAssignTarget("staff");
    setDialogEscTeam("");
    setDialogEscDept("");
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
                    switchQueueFilter(tab.value);
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
          {!listErr && (loadingList || viewIsPending) && filtered.length === 0 ? (
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
                  case — use Join chat to take it.
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
                    Join chat
                  </Button>
                )}
                {mode === "admin" && selected.assigned_admin_id === user?.id && !selected.welcome_sent_at &&
                  selected.status !== "resolved" && selected.status !== "closed" && (
                  <Button size="sm" variant="outline" onClick={claim} disabled={joining}>
                    {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                    Send welcome
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
                        switchQueueFilter("resolved");
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

            {!!selected.assigned_admin_id && selected.status !== "resolved" && selected.status !== "closed" &&
              (mode === "user" || selected.assigned_admin_id === user?.id) && (
              <div className="border-b border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 sm:px-5" role="status">
                {mode === "admin"
                  ? `You are handling this case as ${selected.assigned_admin_name ?? "the assigned agent"}.`
                  : `${selected.assigned_admin_name ?? "A support agent"} has joined this chat.`}
              </div>
            )}

            {actionMsg && (
              <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-primary/5 px-4 py-2 text-xs font-medium text-primary sm:px-5" role="status" aria-live="polite">
                <span>{actionMsg}</span>
                {showResolvedHint && (
                  <button
                    className="rounded-full border border-primary/40 px-2 py-0.5 text-[11px] font-semibold"
                    onClick={() => {
                      switchQueueFilter("resolved");
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
                    Join this chat to reply as the assigned agent.
                  </p>
                  <Button size="sm" onClick={claim} disabled={joining}>
                    {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
                    Join chat
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
              timeline={visibleTimeline}
              previousCases={previousCases}
              historyLoaded={isHistoryLoaded}
              historyLoading={isHistoryLoading}
              historyError={historyError}
              historyHasMore={nextHistoryOffset !== null}
              onLoadMoreHistory={loadMoreHistory}
              onRetryHistory={retryHistory}
              onSelectCase={openHistoricalCase}
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
                    timeline={visibleTimeline}
                    previousCases={previousCases}
              historyLoaded={isHistoryLoaded}
              historyLoading={isHistoryLoading}
              historyError={historyError}
              historyHasMore={nextHistoryOffset !== null}
              onLoadMoreHistory={loadMoreHistory}
              onRetryHistory={retryHistory}
                    onSelectCase={openHistoricalCase}
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
                  {dialog.kind === "assign" && (
                    <>
                      <label className="text-xs font-semibold text-muted-foreground">Route the case to</label>
                      <select
                        value={dialogAssignTarget}
                        onChange={(e) => setDialogAssignTarget(e.target.value as typeof dialogAssignTarget)}
                        className="h-10 w-full rounded-xl border border-input bg-white/60 px-3 text-sm dark:bg-white/5"
                      >
                        <option value="staff">Another staff member</option>
                        <option value="team">A support team</option>
                        <option value="department">A department</option>
                        <option value="queue">Unassigned waiting queue</option>
                      </select>
                    </>
                  )}
                  {(dialog.kind === "offer" || (dialog.kind === "assign" && dialogAssignTarget === "staff")) && (
                    <>
                      <label className="text-xs font-semibold text-muted-foreground">Staff member</label>
                      <select
                        value={dialogStaff}
                        onChange={(e) => setDialogStaff(e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-white/60 px-3 text-sm dark:bg-white/5"
                      >
                        <option value="">Select staff…</option>
                        {staffDir.filter((m) => m.id !== user?.id).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} · {CHAT_STAFF_ROLE_LABELS[m.staff_role] ?? m.staff_role} · {m.active_cases} active
                          </option>
                        ))}
                      </select>
                      {staffDir.length <= 1 && (
                        <p className="text-[11px] text-amber-600">No additional agent is configured. An administrator must provision real staff accounts first.</p>
                      )}
                    </>
                  )}
                  {dialog.kind === "assign" && dialogAssignTarget === "team" && (
                    <>
                      <label className="text-xs font-semibold text-muted-foreground">Support team</label>
                      <select
                        value={dialogEscTeam}
                        onChange={(e) => setDialogEscTeam(e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-white/60 px-3 text-sm dark:bg-white/5"
                      >
                        <option value="">Select team…</option>
                        {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                      </select>
                      {teams.length === 0 && <p className="text-[11px] text-amber-600">No support teams have been configured.</p>}
                    </>
                  )}
                  {dialog.kind === "assign" && dialogAssignTarget === "department" && (
                    <>
                      <label className="text-xs font-semibold text-muted-foreground">Department</label>
                      <select
                        value={dialogEscDept}
                        onChange={(e) => setDialogEscDept(e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-white/60 px-3 text-sm dark:bg-white/5"
                      >
                        <option value="">Select department…</option>
                        {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                      </select>
                      {departments.length === 0 && <p className="text-[11px] text-amber-600">No support departments have been configured.</p>}
                    </>
                  )}
                  {dialog.kind === "assign" && dialogAssignTarget === "queue" && (
                    <p className="text-xs text-muted-foreground">Remove the current assignee and return the case to the waiting queue.</p>
                  )}
                </div>
              )}

              {dialog.kind === "escalate" && !selectedEscalation && (
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
                      {eligibleEscalationStaff.map((m) => (
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
                      <option value="">Select an eligible role…</option>
                      {eligibleEscalationRoles.map((role) => (
                        <option key={role} value={role}>
                          {CHAT_STAFF_ROLE_LABELS[role] ?? role}
                        </option>
                      ))}
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
                  {!validEscalationTarget && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300" role="alert">
                      <p>
                        {dialogEscType === "staff" && eligibleEscalationStaff.length === 0
                          ? "No eligible agent is configured to receive this escalation."
                          : dialogEscType === "role" && eligibleEscalationRoles.length === 0
                            ? "There is no higher staffed role available for escalation."
                            : dialogEscType === "team" && teams.length === 0
                              ? "No support team exists yet."
                              : dialogEscType === "department" && departments.length === 0
                                ? "No support department exists yet."
                                : "Choose a valid escalation destination."}
                      </p>
                      {rank >= 3 ? (
                        <Link href="/admin/support-team" className="mt-2 inline-block font-semibold underline">
                          Set up real support agents and teams
                        </Link>
                      ) : (
                        <p className="mt-2">Ask a supervisor to configure the required support team.</p>
                      )}
                    </div>
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
                  {selectedEscalation.status === "pending" && (
                    <Button size="sm" variant="outline" onClick={() => void respondEscalation("reject")} disabled={busy}>
                      Reject escalation
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => void respondEscalation("return")} disabled={busy}>
                    Return case to queue
                  </Button>
                  {selectedEscalation.status === "pending" && (
                    <Button size="sm" variant="ghost" onClick={() => void respondEscalation("cancel")} disabled={busy}>
                      Cancel escalation
                    </Button>
                  )}
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDialog(null)} disabled={busy}>
                  Cancel
                </Button>
                {!(dialog.kind === "escalate" && selectedEscalation) && (
                  <Button onClick={runDialogAction} disabled={busy ||
                    (dialog.kind === "escalate" &&
                      (!validEscalationTarget || dialogReason.trim().length < 3))}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Confirm
                  </Button>
                )}
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
  historyLoaded,
  historyLoading,
  historyError,
  historyHasMore,
  onLoadMoreHistory,
  onRetryHistory,
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
  historyLoaded: boolean;
  historyLoading: boolean;
  historyError: string;
  historyHasMore: boolean;
  onLoadMoreHistory: () => void;
  onRetryHistory: () => void;
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

      {timeline.events.length > 0 && (
        <div className={cn("border-b border-border/60 py-3", bare ? "" : "px-4")}>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <History className="h-3.5 w-3.5" /> Case activity
          </p>
          <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
            {timeline.events.slice(0, 25).map((event) => (
              <li key={event.id} className="rounded-lg border border-border/60 px-2 py-1.5 text-[10px]">
                <p className="font-semibold capitalize">{event.event_type.replaceAll("_", " ")}</p>
                <p className="text-muted-foreground">
                  {event.actor_name ?? "System"}
                  {event.from_value && event.to_value ? ` · ${event.from_value} → ${event.to_value}` : ""}
                </p>
                <p className="text-muted-foreground">{fmtDateTime(event.created_at)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={cn("py-3", bare ? "" : "px-4")}>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <History className="h-3.5 w-3.5" /> Previous cases
        </p>
        {historyError && (
          <div role="alert" className="mt-2 text-xs text-red-500">
            {historyError}{" "}
            <button type="button" className="font-semibold underline" onClick={onRetryHistory}>Retry</button>
          </div>
        )}
        {!historyLoaded && historyLoading ? (
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading previous cases…
          </p>
        ) : !historyLoaded && historyError ? null : previousCases.length === 0 ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {historyLoaded ? "No earlier cases for this customer." : "Select a case to load customer history."}
          </p>
        ) : (
          <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto">
            {previousCases.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
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
        {historyHasMore && (
          <Button type="button" size="sm" variant="outline" className="mt-2 w-full"
            disabled={historyLoading} onClick={onLoadMoreHistory}>
            {historyLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            Load older cases
          </Button>
        )}
      </div>
    </div>
  );
}
