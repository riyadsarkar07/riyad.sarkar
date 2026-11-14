/**
 * Fast, read-only Live Support queries from the authenticated browser client.
 *
 * These are RLS-protected Supabase RPCs, not privileged server actions.
 * The server still exclusively handles lifecycle writes (join/transfer/close).
 * Reading directly avoids a Vercel -> Supabase -> Vercel round trip on
 * every queue refresh and live message fetch.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatCustomer, ChatMessage, ChatSession } from "@/types/dashboard";

type ChatScope = "user" | "admin";

export type LiveChatReadFilters = {
  statuses?: string[] | null;
  query?: string | null;
  cursorUpdatedAt?: string | null;
  cursorId?: string | null;
  limit?: number;
};

type InboxCounts = {
  waiting: number;
  active: number;
  pending_client: number;
  resolved: number;
  closed: number;
  all: number;
};

type InboxCursor = { updated_at: string | null; id: string | null; has_more: boolean };
type InboxPage = {
  sessions?: ChatSession[];
  counts?: InboxCounts;
  next_cursor?: InboxCursor;
  server_now?: string;
};

type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

export type InboxReadResult = {
  ok: boolean;
  error?: string;
  sessions?: ChatSession[];
  profiles?: Record<string, string>;
  customers?: Record<string, ChatCustomer>;
  unread?: Record<string, number>;
  counts?: InboxCounts;
  nextCursor?: InboxCursor;
  serverNow?: string;
  agentOnline?: boolean | null;
};

const READ_TIMEOUT_MS = 12_000;

export async function readLiveChatInbox(
  supabase: SupabaseClient,
  scope: ChatScope,
  filters: LiveChatReadFilters = {},
): Promise<InboxReadResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), READ_TIMEOUT_MS);
  let data: unknown;
  let error: { message: string } | null = null;

  try {
    const response = await supabase.rpc("chat_inbox_page", {
      p_scope: scope,
      p_statuses: filters.statuses ?? null,
      p_priorities: null,
      p_assignee: null,
      p_team: null,
      p_department: null,
      p_has_escalation: null,
      p_query: filters.query ?? null,
      p_cursor_updated_at: filters.cursorUpdatedAt ?? null,
      p_cursor_id: filters.cursorId ?? null,
      p_limit: filters.limit ?? 25,
    }).abortSignal(controller.signal);
    data = response.data;
    error = response.error;
  } catch {
    return { ok: false, error: "Could not contact Live Support. Retry the queue." };
  } finally {
    clearTimeout(timeout);
  }

  if (error) {
    return { ok: false, error: controller.signal.aborted
      ? "Live Support timed out. Check the connection and retry."
      : error.message };
  }
  const page = (data ?? {}) as InboxPage;
  if (!Array.isArray(page.sessions) || !page.counts) {
    return { ok: false, error: "The server returned an invalid chat queue response." };
  }

  const sessions = page.sessions;
  const customerIds = Array.from(new Set(sessions.map((row) => row.user_id)));
  const sessionIds = sessions.map((row) => row.id);

  // Enrichment is optional and parallel; it must not block the case list.
  // The directory function checks staff authorization on the server.
  const directoryPromise = (async (): Promise<CustomerRow[]> => {
    if (scope !== "admin" || customerIds.length === 0) return [];
    try {
      const { data: result } = await supabase.rpc("chat_customer_directory", { p_ids: customerIds });
      return ((result ?? {}) as { customers?: CustomerRow[] }).customers ?? [];
    } catch { return []; }
  })();

  const unreadPromise = (async (): Promise<Array<{ session_id: string }>> => {
    if (sessionIds.length === 0) return [];
    try {
      const { data: rows } = await supabase.from("chat_messages")
        .select("session_id")
        .eq("read", false)
        .eq("sender_role", scope === "admin" ? "user" : "admin")
        .in("session_id", sessionIds);
      return (rows ?? []) as Array<{ session_id: string }>;
    } catch { return []; }
  })();

  const onlinePromise = supabase.rpc("admin_online_count");
  const [directory, unreadMessages, online] = await Promise.all([
    directoryPromise,
    unreadPromise,
    onlinePromise,
  ]);

  const profiles: Record<string, string> = {};
  const customers: Record<string, ChatCustomer> = {};
  for (const row of directory) {
    const name = row.full_name?.trim() || row.email || "Client";
    profiles[row.id] = name;
    customers[row.id] = {
      id: row.id, name, email: row.email, phone: row.phone,
    };
  }
  const unread: Record<string, number> = {};
  for (const row of unreadMessages) {
    unread[row.session_id] = (unread[row.session_id] ?? 0) + 1;
  }

  const onlineCount = online.data;
  const agentOnline = online.error || onlineCount == null
    ? null
    : Number(onlineCount) > 0;
  return {
    ok: true,
    sessions,
    profiles,
    customers,
    unread,
    counts: page.counts,
    nextCursor: page.next_cursor,
    serverNow: page.server_now,
    agentOnline,
  };
}

export async function readLiveChatMessages(
  supabase: SupabaseClient,
  sessionId: string,
  opts: { beforeCreatedAt?: string | null; beforeId?: string | null; limit?: number } = {},
): Promise<{
  ok: boolean;
  error?: string;
  messages?: ChatMessage[];
  hasMore?: boolean;
}> {
  // chat_messages_page is SECURITY INVOKER and reads the RLS-protected
  // chat_messages table. Unrelated customer cases are not readable.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), READ_TIMEOUT_MS);
  try {
    const { data, error } = await supabase.rpc("chat_messages_page", {
      p_session_id: sessionId,
      p_before_created_at: opts.beforeCreatedAt ?? null,
      p_before_id: opts.beforeId ?? null,
      p_limit: opts.limit ?? 50,
    }).abortSignal(controller.signal);
    if (error) {
      return { ok: false, error: controller.signal.aborted
        ? "Message loading timed out. Retry this case."
        : error.message };
    }
    const page = (data ?? {}) as { messages?: ChatMessage[]; has_more?: boolean };
    if (!Array.isArray(page.messages)) {
      return { ok: false, error: "The server returned an invalid message response." };
    }
    return { ok: true, messages: page.messages, hasMore: !!page.has_more };
  } catch {
    return { ok: false, error: "Could not load messages. Check your connection and retry." };
  } finally {
    clearTimeout(timeout);
  }
}
