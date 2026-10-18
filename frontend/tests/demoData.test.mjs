import assert from "node:assert/strict";
import { test } from "node:test";
import { makeDemoSessions } from "../src/data/demoData.ts";

test("rich sample has 28 days, today's activity, rest days, modes and tags without future data", () => {
  const now = new Date(2026, 9, 17, 13).getTime();
  const sessions = makeDemoSessions(now);
  assert.deepEqual(sessions, makeDemoSessions(now));
  assert.equal(sessions.length, 75);
  assert.equal(new Set(sessions.map((s) => s.id)).size, sessions.length);
  assert(sessions.every((s) => s.completedAt <= now && s.seconds >= 60));
  assert(
    sessions.every(
      (s, i) => !i || sessions[i - 1].completedAt >= s.completedAt,
    ),
  );
  assert.equal(new Set(sessions.map((s) => s.tag)).size, 4);
  assert.equal(new Set(sessions.map((s) => s.mode)).size, 2);
  const localDays = new Set(
    sessions.map((s) => new Date(s.completedAt).toDateString()),
  );
  assert.equal(localDays.size, 25);
  assert(localDays.has(new Date(now).toDateString()));
  assert.equal(
    sessions
      .filter(
        (s) =>
          new Date(s.completedAt).toDateString() ===
          new Date(now).toDateString(),
      )
      .reduce((sum, s) => sum + s.seconds, 0),
    85 * 60,
  );
});

test("midnight and DST sample fixtures never create future records", () => {
  process.env.TZ = "America/New_York";
  for (const now of [
    new Date(2026, 2, 8, 0).getTime(),
    new Date(2026, 10, 1, 0, 0, 1).getTime(),
  ]) {
    const rows = makeDemoSessions(now);
    assert(rows.every((s) => s.completedAt <= now));
    assert.equal(
      new Date(rows[0].completedAt).toDateString(),
      new Date(now).toDateString(),
    );
    assert.equal(rows.filter((s) => s.id.includes("today")).length, 1);
  }
  assert.deepEqual(makeDemoSessions(NaN), []);
});

test("new sample storage is isolated from normal and older sample history", async () => {
  const memory = new Map([
    ["dinofocus.demo.sessions.v1", "[]"],
    ["dinofocus.demo.active.v1", "null"],
    ["dinofocus.m2.sample.sessions.v1", "old sample sentinel"],
  ]);
  globalThis.localStorage = {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => memory.set(k, v),
    removeItem: (k) => memory.delete(k),
  };
  globalThis.window = { location: { search: "?demo=sample" } };
  const { demoStore, resetSampleWorkspace } =
    await import("../src/data/demoStore.ts?rich-sample-test");
  const count = demoStore.getSessions().length;
  assert(count >= 73);
  const active = {
    startedAt: Date.now(),
    mode: "countdown",
    duration: 1,
    tag: "Deep work",
  };
  demoStore.setActive(active);
  assert.equal(
    demoStore.complete(active, active.startedAt + 60000).length,
    count + 1,
  );
  assert.equal(
    demoStore.complete(active, active.startedAt + 120000).length,
    count + 1,
  );
  resetSampleWorkspace();
  assert.equal(demoStore.getSessions().length, count);
  assert.equal(demoStore.getActive(), null);
  assert.equal(memory.get("dinofocus.demo.sessions.v1"), "[]");
  assert.equal(memory.get("dinofocus.demo.active.v1"), "null");
  assert.equal(
    memory.get("dinofocus.m2.sample.sessions.v1"),
    "old sample sentinel",
  );
});
