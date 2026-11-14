import assert from "node:assert/strict";
import test from "node:test";
import {
  chatStatusMatchesFilter,
  selectChatSession,
  statusesForChatFilter,
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
