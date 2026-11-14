/**
 * Pure Live Support queue selectors.
 *
 * The queue and conversation header must never describe different lifecycle
 * statuses. These functions intentionally depend only on authoritative
 * session rows and are shared by the React UI and regression tests.
 */
export type ChatQueueStatus =
  | "waiting"
  | "active"
  | "pending_client"
  | "resolved"
  | "closed";

export type ChatQueueFilter =
  | "open"
  | ChatQueueStatus
  | "all";

export function statusesForChatFilter(
  filter: ChatQueueFilter,
): ChatQueueStatus[] | null {
  if (filter === "all") return null;
  if (filter === "open") return ["waiting", "active", "pending_client"];
  return [filter];
}

export function chatStatusMatchesFilter(
  status: string,
  filter: ChatQueueFilter,
): boolean {
  const statuses = statusesForChatFilter(filter);
  return statuses === null || statuses.includes(status as ChatQueueStatus);
}

/** No selected case is shown unless its persisted status fits the queue. */
export function selectChatSession<T extends { id: string; status: string }>(
  sessions: readonly T[],
  selectedId: string | null,
  filter: ChatQueueFilter,
): T | null {
  if (!selectedId) return null;
  const session = sessions.find((item) => item.id === selectedId) ?? null;
  return session && chatStatusMatchesFilter(session.status, filter) ? session : null;
}

/**
 * Merge authoritative database snapshots without regressing a case's lifecycle.
 * PostgreSQL increments `version` for status/ownership/priority transitions;
 * `updated_at` also orders message-only updates within the same version.
 */
export function reconcileChatSession<T extends {
  id: string;
  version?: number | null;
  updated_at?: string | null;
}>(current: T, incoming: T): T {
  if (current.id !== incoming.id) return current;
  if (current.version != null && incoming.version != null) {
    if (incoming.version < current.version) return current;
    if (incoming.version > current.version) return { ...current, ...incoming };
  }
  const currentTime = current.updated_at ? Date.parse(current.updated_at) : 0;
  const incomingTime = incoming.updated_at ? Date.parse(incoming.updated_at) : 0;
  if (Number.isFinite(currentTime) && Number.isFinite(incomingTime) && incomingTime < currentTime) {
    return current;
  }
  return { ...current, ...incoming };
}

/** A customer's history is independent of the current inbox status filter.
 * Include solved/closed cases and never show another customer's case.
 */
export function selectPreviousChatCases<T extends {
  id: string;
  user_id: string;
  created_at: string;
}>(history: readonly T[], selected: T | null): T[] {
  if (!selected) return [];
  return history
    .filter((item) => item.user_id === selected.user_id && item.id !== selected.id)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

/**
 * Distinguish the currently requested inbox tab/search from the last response.
 * Global badge counts may say "All 16" while the previously requested
 * Waiting page legitimately contained zero rows. That must be a loading
 * state, never a misleading "No live chat sessions yet" empty state.
 */
export function chatInboxViewKey(
  mode: "user" | "admin",
  filter: ChatQueueFilter,
  query: string,
): string {
  return JSON.stringify([mode, filter, query.trim().toLowerCase()]);
}

export function chatInboxViewIsCurrent(
  loadedViewKey: string | null,
  requestedViewKey: string,
): boolean {
  return loadedViewKey === requestedViewKey;
}
