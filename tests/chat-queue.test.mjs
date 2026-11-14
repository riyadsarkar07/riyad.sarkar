import assert from "node:assert/strict";
import test from "node:test";
import {
  chatInboxViewIsCurrent,
  chatInboxViewKey,
  chatStatusMatchesFilter,
  selectChatSession,
  selectPreviousChatCases,
  statusesForChatFilter,
  reconcileChatSession,
} from "../lib/chat-queue.ts";

const cases = [
  { id: "case-a", status: "closed" },
  { id: "case-b", status: "active" },
  { id: "case-c", status: "waiting" },
  { id: "case-d", status: "resolved" },
];

test("Closed queue never renders the previously selected Active session", () => {
  assert.equal(selectChatSession(cases, "case-b", "closed"), null);
  assert.deepEqual(selectChatSession(cases, "case-a", "closed"), cases[0]);
});

test("Closing only Case A does not change the visible statuses for Cases B or C", () => {
  const next = cases.map((item) =>
    item.id === "case-a" ? { ...item, status: "closed" } : item,
  );
  assert.deepEqual(next.find((item) => item.id === "case-b"), cases[1]);
  assert.deepEqual(next.find((item) => item.id === "case-c"), cases[2]);
});

test("Remote lifecycle change invalidates a stale selected case on refresh", () => {
  const pending = [{ id: "case-b", status: "active" }];
  assert.ok(selectChatSession(pending, "case-b", "active"));
  const refreshed = [{ ...pending[0], status: "closed" }];
  assert.equal(selectChatSession(refreshed, "case-b", "active"), null);
  assert.equal(selectChatSession(refreshed, "case-b", "closed")?.status, "closed");
});

test("Open filter excludes resolved and closed histories", () => {
  assert.deepEqual(statusesForChatFilter("open"), [
    "waiting", "active", "pending_client",
  ]);
  assert.equal(chatStatusMatchesFilter("closed", "open"), false);
  assert.equal(chatStatusMatchesFilter("resolved", "open"), false);
  assert.equal(chatStatusMatchesFilter("pending_client", "open"), true);
  assert.equal(chatStatusMatchesFilter("closed", "all"), true);
});

test("Stale Realtime update cannot reopen a more recent closed case", () => {
  const closed = {
    id: "case-a", status: "closed", version: 14,
    updated_at: "2026-11-14T10:05:00Z",
  };
  const oldActive = {
    id: "case-a", status: "active", version: 13,
    updated_at: "2026-11-14T10:03:00Z",
  };
  assert.deepEqual(reconcileChatSession(closed, oldActive), closed);
});

test("A newer database version wins and updates exactly one case", () => {
  const before = [
    { id: "case-a", status: "active", version: 3, updated_at: "2026-11-14T10:00:00Z" },
    { id: "case-b", status: "active", version: 2, updated_at: "2026-11-14T10:00:00Z" },
    { id: "case-c", status: "waiting", version: 1, updated_at: "2026-11-14T10:00:00Z" },
  ];
  const incoming = { ...before[0], status: "closed", version: 4, updated_at: "2026-11-14T10:01:00Z" };
  const after = before.map((item) => item.id === incoming.id ? reconcileChatSession(item, incoming) : item);
  assert.equal(after[0].status, "closed");
  assert.deepEqual(after[1], before[1]);
  assert.deepEqual(after[2], before[2]);
});

test("Same-version message timestamps are monotonic", () => {
  const current = { id: "case-c", status: "waiting", version: 1, updated_at: "2026-11-14T10:02:00Z" };
  const older = { ...current, updated_at: "2026-11-14T10:01:00Z" };
  const newer = { ...current, updated_at: "2026-11-14T10:03:00Z" };
  assert.deepEqual(reconcileChatSession(current, older), current);
  assert.deepEqual(reconcileChatSession(current, newer), newer);
});

test("Admin previous cases list retains resolved/closed history outside Waiting queue", () => {
  const history = [
    { id: "old-closed", user_id: "client-a", status: "closed", created_at: "2026-10-01T00:00:00Z" },
    { id: "current", user_id: "client-a", status: "active", created_at: "2026-11-14T00:00:00Z" },
    { id: "another-user", user_id: "client-b", status: "resolved", created_at: "2026-11-12T00:00:00Z" },
    { id: "old-resolved", user_id: "client-a", status: "resolved", created_at: "2026-11-01T00:00:00Z" },
  ];
  const result = selectPreviousChatCases(history, history[1]);
  assert.deepEqual(result.map((item) => item.id), ["old-resolved", "old-closed"]);
  assert.deepEqual(result.map((item) => item.status), ["resolved", "closed"]);
  assert.deepEqual(selectPreviousChatCases(history, null), []);
  // The active filter excludes historical rows from the inbox, not history.
  assert.equal(chatStatusMatchesFilter(result[0].status, "active"), false);
});

test("An Admin All-tab transition cannot render the old empty Waiting page", () => {
  const waiting = chatInboxViewKey("admin", "waiting", "");
  const all = chatInboxViewKey("admin", "all", "");
  assert.equal(chatInboxViewIsCurrent(waiting, all), false);
  assert.equal(chatInboxViewIsCurrent(null, all), false);
  assert.equal(chatInboxViewIsCurrent(all, all), true);
});

test("Queue view identity changes only for meaningful search/filter changes", () => {
  assert.equal(
    chatInboxViewKey("user", "open", "  CASE-123 "),
    chatInboxViewKey("user", "open", "case-123"),
  );
  assert.notEqual(
    chatInboxViewKey("user", "open", ""),
    chatInboxViewKey("admin", "open", ""),
  );
  assert.notEqual(
    chatInboxViewKey("admin", "waiting", ""),
    chatInboxViewKey("admin", "resolved", ""),
  );
});
