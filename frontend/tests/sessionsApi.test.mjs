import assert from "node:assert/strict";
import { test } from "node:test";
import { sessionsApi, toActive, toHistory } from "../src/api/sessions.ts";
import { elapsedSeconds } from "../src/data/demoStore.ts";

const session = {
  id: "server-id", tag: "My project", mode: "countdown", status: "completed",
  plannedSeconds: 60, startedAt: "2026-11-01T12:00:00Z", pausedAt: null,
  endedAt: "2026-11-01T12:02:00Z", creditedSeconds: 60, elapsedSeconds: 90,
};

test("history uses server credit and completion time rather than browser elapsed time", () => {
  assert.deepEqual(toHistory(session), {
    id: session.id, tag: session.tag, mode: session.mode, seconds: 60, completedAt: Date.parse(session.endedAt),
  });
  assert.throws(() => toHistory({ ...session, status: "cancelled" }));
});

test("recovered timers use server elapsed time regardless of browser clock and preserve pauses", () => {
  const received = 900000;
  const running = toActive({ ...session, status: "active", elapsedSeconds: 20 }, received);
  assert.equal(running.id, "server-id");
  assert.equal(running.duration, 1);
  assert.equal(elapsedSeconds(running, received + 5000), 25);
  const paused = toActive({ ...session, status: "active", elapsedSeconds: 20, pausedAt: session.startedAt }, received);
  assert.equal(elapsedSeconds(paused, received + 60000), 20);
});

test("history follows pagination so analytics include more than 100 sessions", async t => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async url => {
    calls.push(String(url));
    const next = calls.length === 1;
    return new Response(JSON.stringify({ sessions: [{ ...session, id: next ? "first" : "second" }], nextCursor: next ? "first" : null }), { status: 200 });
  });
  const history = await sessionsApi.history();
  assert.deepEqual(history.map(s => s.id), ["first", "second"]);
  assert.match(calls[1], /cursor=first/);
  assert.match(calls[0], /status=completed/);
});

test("start and completion send no browser timing or reward claims", async t => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, ...options });
    return new Response(JSON.stringify({ session }), { status: 200 });
  });
  await sessionsApi.start("countdown", "My project", 5);
  await sessionsApi.transition("server-id", "complete");
  assert.deepEqual(JSON.parse(calls[0].body), { mode: "countdown", tag: "My project", plannedSeconds: 300 });
  assert.equal(calls[1].url, "/api/sessions/server-id/complete");
  assert.equal(calls[1].body, undefined);
  assert.equal(calls[1].credentials, "same-origin");
});
