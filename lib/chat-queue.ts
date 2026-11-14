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
