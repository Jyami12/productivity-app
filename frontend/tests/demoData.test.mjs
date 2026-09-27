import assert from "node:assert/strict";
import { test } from "node:test";
import { makeDemoSessions } from "../src/data/demoData.ts";

test("sample history is plausible, deterministic, and one minute from the target", () => {
  const now = new Date(2026, 8, 27, 10).getTime();
  const sessions = makeDemoSessions(now);
  assert.deepEqual(sessions, makeDemoSessions(now));
  assert.equal(sessions.length, 8);
  assert.equal(new Set(sessions.map(s => s.id)).size, 8);
  assert.equal(sessions.reduce((sum, s) => sum + s.seconds, 0), 149 * 60);
  assert(sessions.every(s => s.completedAt < now && s.seconds >= 60));
  assert(sessions.every((s, i) => !i || sessions[i - 1].completedAt >= s.completedAt));
  assert.deepEqual(Object.fromEntries(["Deep work", "Studying", "Reading", "Creative work"].map(tag =>
    [tag, sessions.filter(s => s.tag === tag).reduce((sum, s) => sum + s.seconds / 60, 0)]
  )), {"Deep work": 45, Studying: 49, Reading: 30, "Creative work": 25});
});

test("sample mode is isolated, persists completions, and resets only sample history", async () => {
  const memory = new Map([["dinofocus.demo.sessions.v1", "[]"], ["dinofocus.demo.active.v1", "null"]]);
  globalThis.localStorage = {
    getItem: k => memory.get(k) ?? null,
    setItem: (k, v) => memory.set(k, v),
    removeItem: k => memory.delete(k),
  };
  globalThis.window = { location: { search: "?demo=sample" } };
  const { demoStore, resetSampleWorkspace } = await import("../src/data/demoStore.ts?sample-test");
  assert.equal(demoStore.getSessions().length, 8);
  const active = { startedAt: Date.now(), mode: "countdown", duration: 1, tag: "Deep work" };
  demoStore.setActive(active);
  assert.equal(demoStore.complete(active, active.startedAt + 60000).length, 9);
  assert.equal(demoStore.getSessions().reduce((sum, s) => sum + s.seconds / 60, 0), 150);
  assert.equal(demoStore.complete(active, active.startedAt + 120000).length, 9);
  assert.equal(demoStore.getSessions().length, 9);
  resetSampleWorkspace();
  assert.equal(demoStore.getSessions().length, 8);
  assert.equal(demoStore.getActive(), null);
  assert.equal(memory.get("dinofocus.demo.sessions.v1"), "[]");
  assert.equal(memory.get("dinofocus.demo.active.v1"), "null");
});
