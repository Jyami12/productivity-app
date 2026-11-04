// Unit tests for the focus-session rules. No database or server needed.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  abandonAfterSeconds,
  isAbandoned,
  cancel,
  complete,
  creditedSeconds,
  elapsedSeconds,
  MAX_STOPWATCH_CREDIT_SECONDS,
  pause,
  resume,
  type RuleResult,
  type SessionChanges,
  type SessionTiming,
} from "../src/sessions/rules.ts";

const T0 = new Date("2026-11-03T10:00:00Z");
const at = (secondsAfterStart: number) => new Date(T0.getTime() + secondsAfterStart * 1000);

const countdown = (over: Partial<SessionTiming> = {}): SessionTiming => ({
  mode: "countdown",
  status: "active",
  plannedSeconds: 1500,
  startedAt: T0,
  pausedAt: null,
  pausedSeconds: 0,
  ...over,
});
const stopwatch = (over: Partial<SessionTiming> = {}) =>
  countdown({ mode: "stopwatch", plannedSeconds: null, ...over });

/** Applies a successful rule result, failing the test otherwise. */
type Session = SessionTiming & SessionChanges;
function apply(s: Session, result: RuleResult): Session {
  assert.ok(result.ok, result.ok ? "" : `expected ok, got ${result.code}`);
  return { ...s, ...result.changes };
}
function assertFails(result: RuleResult, code: string) {
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, code);
}

describe("elapsedSeconds", () => {
  test("counts whole seconds since start", () => {
    assert.equal(elapsedSeconds(countdown(), at(90.9)), 90);
  });

  test("excludes finished pauses", () => {
    assert.equal(elapsedSeconds(countdown({ pausedSeconds: 30 }), at(100)), 70);
  });

  test("freezes while paused", () => {
    const paused = countdown({ pausedAt: at(40) });
    assert.equal(elapsedSeconds(paused, at(40)), 40);
    assert.equal(elapsedSeconds(paused, at(5000)), 40);
  });

  test("is never negative, even if the clock is before the start", () => {
    assert.equal(elapsedSeconds(countdown(), at(-60)), 0);
    assert.equal(elapsedSeconds(countdown({ pausedSeconds: 500 }), at(10)), 0);
  });
});

describe("complete: countdown", () => {
  test("is rejected before the planned time, saying how long is left", () => {
    const result = complete(countdown(), at(1499));
    assertFails(result, "SESSION_TOO_SHORT");
    if (!result.ok) assert.match(result.message, /1 more second/);
  });

  test("credits exactly the planned time, even if finished late", () => {
    const done = apply(countdown(), complete(countdown(), at(4000)));
    assert.equal(done.status, "completed");
    assert.equal(done.creditedSeconds, 1500);
    assert.deepEqual(done.endedAt, at(4000));
  });

  test("time spent paused does not count toward the planned time", () => {
    const s = countdown({ pausedSeconds: 600 });
    assertFails(complete(s, at(1500)), "SESSION_TOO_SHORT");
    assert.equal(apply(s, complete(s, at(2100))).creditedSeconds, 1500);
  });
});

describe("complete: stopwatch", () => {
  test("is rejected under 60 seconds", () => {
    assertFails(complete(stopwatch(), at(59)), "SESSION_TOO_SHORT");
  });

  test("credits the elapsed time", () => {
    assert.equal(apply(stopwatch(), complete(stopwatch(), at(60))).creditedSeconds, 60);
    assert.equal(apply(stopwatch(), complete(stopwatch(), at(3725))).creditedSeconds, 3725);
  });

  test("caps credit at 12 hours", () => {
    const done = apply(stopwatch(), complete(stopwatch(), at(3 * 24 * 3600)));
    assert.equal(done.creditedSeconds, MAX_STOPWATCH_CREDIT_SECONDS);
  });
});

describe("pause and resume", () => {
  test("a full pause/resume cycle adds the pause to pausedSeconds", () => {
    let s: Session = stopwatch();
    s = apply(s, pause(s, at(100)));
    assert.deepEqual(s.pausedAt, at(100));
    s = apply(s, resume(s, at(160)));
    assert.equal(s.pausedAt, null);
    assert.equal(s.pausedSeconds, 60);
    assert.equal(elapsedSeconds(s, at(200)), 140);
  });

  test("multiple pauses add up", () => {
    let s: Session = stopwatch();
    s = apply(s, pause(s, at(10)));
    s = apply(s, resume(s, at(20)));
    s = apply(s, pause(s, at(30)));
    s = apply(s, resume(s, at(55)));
    assert.equal(s.pausedSeconds, 35);
  });

  test("cannot pause twice or resume while running", () => {
    assertFails(pause(stopwatch({ pausedAt: at(5) }), at(10)), "SESSION_ALREADY_PAUSED");
    assertFails(resume(stopwatch(), at(10)), "SESSION_NOT_PAUSED");
  });

  test("completing while paused counts the time up to the pause only", () => {
    let s: Session = stopwatch();
    s = apply(s, pause(s, at(120)));
    s = apply(s, complete(s, at(1000)));
    assert.equal(s.creditedSeconds, 120);
    assert.equal(s.pausedSeconds, 880);
    assert.equal(s.pausedAt, null);
  });

  test("pausing cannot be used to reach the countdown target sooner", () => {
    let s: Session = countdown({ plannedSeconds: 300 });
    s = apply(s, pause(s, at(100)));
    assertFails(complete(s, at(10_000)), "SESSION_TOO_SHORT");
  });
});

describe("cancel", () => {
  test("ends the session with no credit, even if paused", () => {
    let s: Session = stopwatch();
    s = apply(s, pause(s, at(500)));
    s = apply(s, cancel(s, at(600)));
    assert.equal(s.status, "cancelled");
    assert.equal(s.creditedSeconds, 0);
    assert.deepEqual(s.endedAt, at(600));
    assert.equal(s.pausedAt, null);
    assert.equal(s.pausedSeconds, 100);
  });
});

describe("ended sessions", () => {
  for (const status of ["completed", "cancelled"] as const) {
    test(`a ${status} session cannot be paused, resumed, completed, or cancelled`, () => {
      const s = countdown({ status });
      for (const rule of [pause, resume, complete, cancel]) {
        assertFails(rule(s, at(5000)), "SESSION_NOT_ACTIVE");
      }
    });
  }
});

describe("creditedSeconds", () => {
  test("is 0 before the session may be completed", () => {
    assert.equal(creditedSeconds(countdown(), at(100)), 0);
    assert.equal(creditedSeconds(stopwatch(), at(59)), 0);
  });
});

describe("isAbandoned", () => {
  const HOUR = 3600;

  test("a countdown is abandoned 2 hours after its planned length", () => {
    assert.equal(abandonAfterSeconds(countdown()), 1500 + 2 * HOUR);
    assert.equal(isAbandoned(countdown(), at(1500 + 2 * HOUR)), false);
    assert.equal(isAbandoned(countdown(), at(1500 + 2 * HOUR + 1)), true);
  });

  test("a stopwatch is abandoned after 12 hours", () => {
    assert.equal(isAbandoned(stopwatch(), at(12 * HOUR)), false);
    assert.equal(isAbandoned(stopwatch(), at(12 * HOUR + 1)), true);
  });

  test("uses clock time, so a long pause counts", () => {
    assert.equal(isAbandoned(countdown({ pausedAt: at(10), pausedSeconds: 0 }), at(1500 + 2 * HOUR + 1)), true);
  });

  test("ended sessions are never abandoned", () => {
    assert.equal(isAbandoned(countdown({ status: "completed" }), at(30 * 24 * HOUR)), false);
    assert.equal(isAbandoned(countdown({ status: "cancelled" }), at(30 * 24 * HOUR)), false);
  });
});
