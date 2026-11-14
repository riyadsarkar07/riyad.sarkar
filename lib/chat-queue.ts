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
