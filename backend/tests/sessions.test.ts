// API tests for /api/sessions. Time-based rules are tested by moving a
// session's timestamps back in the database instead of waiting.
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { browser, prisma, resetDatabase, startServer, stopServer } from "./helpers.ts";

type Browser = ReturnType<typeof browser>;

before(() => startServer());
after(stopServer);
beforeEach(resetDatabase);

let emailCount = 0;
async function loggedIn(): Promise<Browser> {
  const b = browser();
  const res = await b.request("POST", "/api/auth/register", {
    email: `user${++emailCount}@example.com`,
    password: "correct-horse",
  });
  assert.equal(res.status, 201);
  return b;
}

const startCountdown = (b: Browser, plannedSeconds = 300, tag = "Deep work") =>
  b.request("POST", "/api/sessions", { mode: "countdown", tag, plannedSeconds });
const startStopwatch = (b: Browser, tag = "Reading") =>
  b.request("POST", "/api/sessions", { mode: "stopwatch", tag });
const act = (b: Browser, id: string, action: string) =>
  b.request("POST", `/api/sessions/${id}/${action}`);

/**
 * Pretends `seconds` more time has passed: moves the start (and any current
 * pause) back. While paused, this makes the pause that much longer.
 */
async function rewind(id: string, seconds: number) {
  const s = await prisma.focusSession.findUniqueOrThrow({ where: { id } });
  const back = (d: Date) => new Date(d.getTime() - seconds * 1000);
  await prisma.focusSession.update({
    where: { id },
    data: { startedAt: back(s.startedAt), pausedAt: s.pausedAt && back(s.pausedAt) },
  });
}


/** Real request time adds a little to rewound durations; allow up to 2 seconds. */
function assertAbout(actual: number, expected: number) {
  assert.ok(actual >= expected && actual <= expected + 2, `expected about ${expected}, got ${actual}`);
}

function assertError(res: { status: number; body: any }, status: number, code: string) {
  assert.equal(res.status, status, JSON.stringify(res.body));
  assert.equal(res.body.error.code, code);
}

describe("authentication", () => {
  test("every session route returns 401 without a login", async () => {
    const anon = browser();
    const routes: [string, string][] = [
      ["POST", "/api/sessions"],
      ["GET", "/api/sessions"],
      ["GET", "/api/sessions/active"],
      ["GET", "/api/sessions/some-id"],
      ...["pause", "resume", "complete", "cancel"].map(
        (a): [string, string] => ["POST", `/api/sessions/some-id/${a}`],
      ),
    ];
    for (const [method, path] of routes) {
      assertError(await anon.request(method, path, method === "POST" ? {} : undefined), 401, "UNAUTHENTICATED");
    }
  });

  test("a logged-out browser loses access", async () => {
    const b = await loggedIn();
    await b.request("POST", "/api/auth/logout");
    assertError(await b.request("GET", "/api/sessions"), 401, "UNAUTHENTICATED");
  });
});

describe("start", () => {
  test("starts a countdown with server-set timing", async () => {
    const b = await loggedIn();
    const before = Date.now();
    const res = await startCountdown(b, 1500, "  Deep work  ");
    assert.equal(res.status, 201);
    const s = res.body.session;
    assert.equal(s.mode, "countdown");
    assert.equal(s.status, "active");
    assert.equal(s.tag, "Deep work");
    assert.equal(s.plannedSeconds, 1500);
    assert.equal(s.requiredSeconds, 1500);
    assert.equal(s.creditedSeconds, 0);
    assert.equal(s.endedAt, null);
    assert.ok(Math.abs(new Date(s.startedAt).getTime() - before) < 5000);
  });

  test("starts a stopwatch with no planned length", async () => {
    const res = await startStopwatch(await loggedIn());
    assert.equal(res.status, 201);
    assert.equal(res.body.session.plannedSeconds, null);
    assert.equal(res.body.session.requiredSeconds, 60);
  });

  test("ignores client-supplied timing and credit fields", async () => {
    const b = await loggedIn();
    const res = await b.request("POST", "/api/sessions", {
      mode: "stopwatch",
      tag: "Cheat",
      plannedSeconds: 10,
      creditedSeconds: 99999,
      startedAt: "2020-01-01T00:00:00Z",
      status: "completed",
    });
    assert.equal(res.status, 201);
    const row = await prisma.focusSession.findUniqueOrThrow({ where: { id: res.body.session.id } });
    assert.equal(row.creditedSeconds, 0);
    assert.equal(row.status, "active");
    assert.equal(row.plannedSeconds, null);
    assert.ok(row.startedAt.getTime() > Date.now() - 60_000);
  });

  test("rejects invalid input with field errors", async () => {
    const b = await loggedIn();
    const cases: [unknown, string][] = [
      [{ mode: "countdown", tag: " ", plannedSeconds: 300 }, "tag"],
      [{ mode: "countdown", tag: "x".repeat(41), plannedSeconds: 300 }, "tag"],
      [{ mode: "countdown", tag: "Work", plannedSeconds: 59 }, "plannedSeconds"],
      [{ mode: "countdown", tag: "Work", plannedSeconds: 24 * 3600 + 1 }, "plannedSeconds"],
      [{ mode: "countdown", tag: "Work", plannedSeconds: 90.5 }, "plannedSeconds"],
      [{ mode: "countdown", tag: "Work" }, "plannedSeconds"],
      [{ mode: "lap", tag: "Work" }, "mode"],
      [{ tag: "Work" }, "mode"],
    ];
    for (const [body, field] of cases) {
      const res = await b.request("POST", "/api/sessions", body);
      assertError(res, 400, "VALIDATION_ERROR");
      assert.ok(res.body.error.fields[field], `expected an error on ${field} for ${JSON.stringify(body)}`);
    }
    assert.equal(await prisma.focusSession.count(), 0);
  });

  test("allows only one active session per user", async () => {
    const b = await loggedIn();
    assert.equal((await startCountdown(b)).status, 201);
    assertError(await startStopwatch(b), 409, "ACTIVE_SESSION_EXISTS");
    // A different user is unaffected.
    assert.equal((await startStopwatch(await loggedIn())).status, 201);
  });

  test("simultaneous starts create exactly one session", async () => {
    const b = await loggedIn();
    const results = await Promise.all([1, 2, 3, 4].map(() => startStopwatch(b)));
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409, 409, 409]);
    assert.equal(await prisma.focusSession.count(), 1);
  });

  test("a new session can start after the previous one ends", async () => {
    const b = await loggedIn();
    const first = (await startStopwatch(b)).body.session;
    await act(b, first.id, "cancel");
    assert.equal((await startStopwatch(b)).status, 201);
  });
});

describe("active session", () => {
  test("returns null when nothing is running, with the server time", async () => {
    const res = await (await loggedIn()).request("GET", "/api/sessions/active");
    assert.equal(res.status, 200);
    assert.equal(res.body.session, null);
    assert.ok(Math.abs(new Date(res.body.serverTime).getTime() - Date.now()) < 5000);
  });

  test("returns the running session with live elapsed time", async () => {
    const b = await loggedIn();
    const { id } = (await startCountdown(b)).body.session;
    await rewind(id, 120);
    const res = await b.request("GET", "/api/sessions/active");
    assert.equal(res.body.session.id, id);
    assertAbout(res.body.session.elapsedSeconds, 120);
  });

  test("is cleared once the session ends", async () => {
    const b = await loggedIn();
    const { id } = (await startStopwatch(b)).body.session;
    await act(b, id, "cancel");
    assert.equal((await b.request("GET", "/api/sessions/active")).body.session, null);
  });
});

describe("complete", () => {
  test("a countdown cannot be completed early", async () => {
    const b = await loggedIn();
    const { id } = (await startCountdown(b, 300)).body.session;
    await rewind(id, 250);
    const res = await act(b, id, "complete");
    assertError(res, 409, "SESSION_TOO_SHORT");
    assert.match(res.body.error.message, /more seconds/);
    assert.equal((await prisma.focusSession.findUniqueOrThrow({ where: { id } })).status, "active");
  });

  test("a countdown is credited exactly its planned length", async () => {
    const b = await loggedIn();
    const { id } = (await startCountdown(b, 300)).body.session;
    await rewind(id, 900); // finished well after the timer ran out
    const res = await act(b, id, "complete");
    assert.equal(res.status, 200);
    assert.equal(res.body.session.status, "completed");
    assert.equal(res.body.session.creditedSeconds, 300);
    assert.ok(res.body.session.endedAt);
  });

  test("a stopwatch needs 60 seconds and is credited its elapsed time", async () => {
    const b = await loggedIn();
    const { id } = (await startStopwatch(b)).body.session;
    await rewind(id, 50);
    assertError(await act(b, id, "complete"), 409, "SESSION_TOO_SHORT");
    await rewind(id, 100);
    const res = await act(b, id, "complete");
    assert.equal(res.status, 200);
    assertAbout(res.body.session.creditedSeconds, 150);
  });

  test("a stopwatch can be completed just under 12 hours", async () => {
    const b = await loggedIn();
    const { id } = (await startStopwatch(b)).body.session;
    await rewind(id, 12 * 3600 - 30);
    const res = await act(b, id, "complete");
    assert.equal(res.status, 200);
    assertAbout(res.body.session.creditedSeconds, 12 * 3600 - 30);
  });

  test("completing twice returns the same result without crediting again", async () => {
    const b = await loggedIn();
    const { id } = (await startCountdown(b, 300)).body.session;
    await rewind(id, 400);
    const first = await act(b, id, "complete");
    const saved = await prisma.focusSession.findUniqueOrThrow({ where: { id } });
    const second = await act(b, id, "complete");
    assert.equal(second.status, 200);
    assert.deepEqual(second.body.session, first.body.session);
    assert.deepEqual(await prisma.focusSession.findUniqueOrThrow({ where: { id } }), saved);
  });

  test("simultaneous completions are applied once", async () => {
    const b = await loggedIn();
    const { id } = (await startStopwatch(b)).body.session;
    await rewind(id, 90);
    const results = await Promise.all([1, 2, 3, 4].map(() => act(b, id, "complete")));
    assert.ok(results.every((r) => r.status === 200));
    const endedAt = new Set(results.map((r) => r.body.session.endedAt));
    assert.equal(endedAt.size, 1, "every response should show the same saved completion");
    const row = await prisma.focusSession.findUniqueOrThrow({ where: { id } });
    assert.equal(row.creditedSeconds, results[0].body.session.creditedSeconds);
  });

  test("a cancelled session cannot be completed", async () => {
    const b = await loggedIn();
    const { id } = (await startStopwatch(b)).body.session;
    await rewind(id, 600);
    await act(b, id, "cancel");
    assertError(await act(b, id, "complete"), 409, "SESSION_NOT_ACTIVE");
  });
});

describe("pause and resume", () => {
  test("paused time does not count toward a countdown", async () => {
    const b = await loggedIn();
    const { id } = (await startCountdown(b, 300)).body.session;
    await rewind(id, 100); // run 100s
    assert.equal((await act(b, id, "pause")).status, 200);
    await rewind(id, 120); // paused 120s
    const resumed = await act(b, id, "resume");
    assert.equal(resumed.status, 200);
    assertAbout(resumed.body.session.pausedSeconds, 120);
    assert.equal(resumed.body.session.pausedAt, null);
    assertAbout(resumed.body.session.elapsedSeconds, 100);

    await rewind(id, 180); // 400s since start, but only 280 focused
    assertError(await act(b, id, "complete"), 409, "SESSION_TOO_SHORT");
    await rewind(id, 25); // 305 focused
    assert.equal((await act(b, id, "complete")).status, 200);
  });

  test("elapsed time is frozen while paused", async () => {
    const b = await loggedIn();
    const { id } = (await startStopwatch(b)).body.session;
    await rewind(id, 100);
    await act(b, id, "pause");
    await rewind(id, 5000); // paused for a long time
    const s = (await b.request("GET", "/api/sessions/active")).body.session;
    assert.ok(s.pausedAt);
    assertAbout(s.elapsedSeconds, 100);
  });

  test("completing while paused credits only the time before the pause", async () => {
    const b = await loggedIn();
    const { id } = (await startStopwatch(b)).body.session;
    await rewind(id, 200);
    await act(b, id, "pause");
    await rewind(id, 3000);
    const res = await act(b, id, "complete");
    assert.equal(res.status, 200);
    assertAbout(res.body.session.creditedSeconds, 200);
    assertAbout(res.body.session.pausedSeconds, 3000);
    assert.equal(res.body.session.pausedAt, null);
  });

  test("rejects pausing twice and resuming while running", async () => {
    const b = await loggedIn();
    const { id } = (await startStopwatch(b)).body.session;
    assertError(await act(b, id, "resume"), 409, "SESSION_NOT_PAUSED");
    await act(b, id, "pause");
    assertError(await act(b, id, "pause"), 409, "SESSION_ALREADY_PAUSED");
  });

  test("an ended session cannot be paused or resumed", async () => {
    const b = await loggedIn();
    const { id } = (await startStopwatch(b)).body.session;
    await act(b, id, "cancel");
    assertError(await act(b, id, "pause"), 409, "SESSION_NOT_ACTIVE");
    assertError(await act(b, id, "resume"), 409, "SESSION_NOT_ACTIVE");
  });
});

describe("cancel", () => {
  test("ends the session with no credit", async () => {
    const b = await loggedIn();
    const { id } = (await startStopwatch(b)).body.session;
    await rewind(id, 3000);
    const res = await act(b, id, "cancel");
    assert.equal(res.status, 200);
    assert.equal(res.body.session.status, "cancelled");
    assert.equal(res.body.session.creditedSeconds, 0);
    assert.ok(res.body.session.endedAt);
  });

  test("cancelling twice returns the same result", async () => {
    const b = await loggedIn();
    const { id } = (await startStopwatch(b)).body.session;
    const first = await act(b, id, "cancel");
    const second = await act(b, id, "cancel");
    assert.equal(second.status, 200);
    assert.deepEqual(second.body.session, first.body.session);
  });

  test("a completed session cannot be cancelled", async () => {
    const b = await loggedIn();
    const { id } = (await startStopwatch(b)).body.session;
    await rewind(id, 120);
    await act(b, id, "complete");
    assertError(await act(b, id, "cancel"), 409, "SESSION_NOT_ACTIVE");
    assert.equal((await prisma.focusSession.findUniqueOrThrow({ where: { id } })).status, "completed");
  });
});

describe("ownership", () => {
  test("another user's session behaves as if it does not exist", async () => {
    const owner = await loggedIn();
    const other = await loggedIn();
    const { id } = (await startStopwatch(owner)).body.session;
    await rewind(id, 120);

    assertError(await other.request("GET", `/api/sessions/${id}`), 404, "SESSION_NOT_FOUND");
    for (const action of ["pause", "resume", "complete", "cancel"]) {
      assertError(await act(other, id, action), 404, "SESSION_NOT_FOUND");
    }
    assert.equal((await other.request("GET", "/api/sessions/active")).body.session, null);
    assert.equal((await prisma.focusSession.findUniqueOrThrow({ where: { id } })).status, "active");
  });

  test("history only lists the user's own sessions", async () => {
    const owner = await loggedIn();
    const other = await loggedIn();
    const { id } = (await startStopwatch(owner)).body.session;
    await rewind(id, 120);
    await act(owner, id, "complete");
    assert.equal((await owner.request("GET", "/api/sessions")).body.sessions.length, 1);
    assert.deepEqual((await other.request("GET", "/api/sessions")).body.sessions, []);
  });

  test("unknown ids return 404", async () => {
    const b = await loggedIn();
    assertError(await b.request("GET", "/api/sessions/not-a-real-id"), 404, "SESSION_NOT_FOUND");
    assertError(await act(b, "00000000-0000-0000-0000-000000000000", "complete"), 404, "SESSION_NOT_FOUND");
  });
});

describe("history", () => {
  /** Creates a finished session directly, `minutesAgo` minutes in the past. */
  async function finished(b: Browser, minutesAgo: number, status: "completed" | "cancelled" = "completed") {
    const { id } = (await startStopwatch(b, `Tag ${minutesAgo}`)).body.session;
    await rewind(id, 120);
    await act(b, id, status === "completed" ? "complete" : "cancel");
    const endedAt = new Date(Date.now() - minutesAgo * 60_000);
    await prisma.focusSession.update({ where: { id }, data: { endedAt } });
    return id;
  }

  test("lists completed sessions, newest first, excluding active and cancelled ones", async () => {
    const b = await loggedIn();
    const old = await finished(b, 30);
    const recent = await finished(b, 5);
    await finished(b, 10, "cancelled");
    await startStopwatch(b); // still active

    const res = await b.request("GET", "/api/sessions");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.sessions.map((s: any) => s.id), [recent, old]);
    assert.equal(res.body.nextCursor, null);
  });

  test("filters by status", async () => {
    const b = await loggedIn();
    const done = await finished(b, 30);
    const cancelled = await finished(b, 5, "cancelled");
    const ids = async (q: string) =>
      (await b.request("GET", `/api/sessions?status=${q}`)).body.sessions.map((s: any) => s.id);
    assert.deepEqual(await ids("cancelled"), [cancelled]);
    assert.deepEqual(await ids("all"), [cancelled, done]);
  });

  test("pages through results with a cursor", async () => {
    const b = await loggedIn();
    const expected = [];
    for (const minutesAgo of [1, 2, 3, 4, 5]) expected.push(await finished(b, minutesAgo));

    const seen = [];
    let cursor: string | null = null;
    do {
      const res: any = await b.request("GET", `/api/sessions?limit=2${cursor ? `&cursor=${cursor}` : ""}`);
      assert.ok(res.body.sessions.length <= 2);
      seen.push(...res.body.sessions.map((s: any) => s.id));
      cursor = res.body.nextCursor;
    } while (cursor);
    assert.deepEqual(seen, expected);
  });

  test("rejects bad query parameters", async () => {
    const b = await loggedIn();
    assertError(await b.request("GET", "/api/sessions?limit=0"), 400, "VALIDATION_ERROR");
    assertError(await b.request("GET", "/api/sessions?limit=101"), 400, "VALIDATION_ERROR");
    assertError(await b.request("GET", "/api/sessions?status=active"), 400, "VALIDATION_ERROR");
    assertError(await b.request("GET", "/api/sessions?cursor=nope"), 400, "INVALID_CURSOR");
  });

  test("another user's session id is not accepted as a cursor", async () => {
    const owner = await loggedIn();
    const other = await loggedIn();
    const id = await finished(owner, 5);
    assertError(await other.request("GET", `/api/sessions?cursor=${id}`), 400, "INVALID_CURSOR");
  });

  test("completed sessions survive logging out and back in", async () => {
    const b = browser();
    const creds = { email: "persist@example.com", password: "correct-horse" };
    await b.request("POST", "/api/auth/register", creds);
    const id = await finished(b, 1);
    await b.request("POST", "/api/auth/logout");

    const fresh = browser(); // a different browser, as after a reload or on another device
    await fresh.request("POST", "/api/auth/login", creds);
    const res = await fresh.request("GET", "/api/sessions");
    assert.deepEqual(res.body.sessions.map((s: any) => s.id), [id]);
    assert.equal(res.body.sessions[0].status, "completed");
  });
});

describe("account deletion", () => {
  test("deleting a user removes their focus sessions", async () => {
    const b = await loggedIn();
    await startStopwatch(b);
    await prisma.user.deleteMany();
    assert.equal(await prisma.focusSession.count(), 0);
  });
});

describe("abandoned sessions", () => {
  const HOUR = 3600;
  const row = (id: string) => prisma.focusSession.findUniqueOrThrow({ where: { id } });

  test("a countdown past its planned time + 2 hours is cancelled with no credit", async () => {
    const b = await loggedIn();
    const { id } = (await startCountdown(b, 300)).body.session;
    await rewind(id, 300 + 2 * HOUR + 10);

    assert.equal((await b.request("GET", "/api/sessions/active")).body.session, null);
    const saved = await row(id);
    assert.equal(saved.status, "cancelled");
    assert.equal(saved.creditedSeconds, 0);
    assert.ok(saved.endedAt);
  });

  test("a countdown inside the 2-hour grace period can still be completed", async () => {
    const b = await loggedIn();
    const { id } = (await startCountdown(b, 300)).body.session;
    await rewind(id, 300 + 2 * HOUR - 60);
    const res = await act(b, id, "complete");
    assert.equal(res.status, 200);
    assert.equal(res.body.session.creditedSeconds, 300);
  });

  test("a stopwatch running over 12 hours is cancelled", async () => {
    const b = await loggedIn();
    const { id } = (await startStopwatch(b)).body.session;
    await rewind(id, 12 * HOUR + 10);
    assertError(await act(b, id, "complete"), 409, "SESSION_NOT_ACTIVE");
    assert.equal((await row(id)).status, "cancelled");
  });

  test("an abandoned session no longer blocks starting a new one", async () => {
    const b = await loggedIn();
    const { id } = (await startCountdown(b, 300)).body.session;
    await rewind(id, 3 * 24 * HOUR);
    const res = await startStopwatch(b);
    assert.equal(res.status, 201);
    assert.equal((await row(id)).status, "cancelled");
  });

  test("time spent paused still counts toward abandonment", async () => {
    const b = await loggedIn();
    const { id } = (await startCountdown(b, 300)).body.session;
    await act(b, id, "pause");
    await rewind(id, 300 + 2 * HOUR + 10); // paused the whole time
    assertError(await act(b, id, "resume"), 409, "SESSION_NOT_ACTIVE");
    assert.equal((await row(id)).status, "cancelled");
  });

  test("abandoned sessions show up as cancelled in history", async () => {
    const b = await loggedIn();
    const { id } = (await startStopwatch(b)).body.session;
    await rewind(id, 13 * HOUR);
    const res = await b.request("GET", "/api/sessions?status=cancelled");
    assert.deepEqual(res.body.sessions.map((s: any) => s.id), [id]);
    assert.deepEqual((await b.request("GET", "/api/sessions")).body.sessions, []);
  });

  test("one user's requests never touch another user's sessions", async () => {
    const owner = await loggedIn();
    const other = await loggedIn();
    const { id } = (await startStopwatch(owner)).body.session;
    await rewind(id, 13 * HOUR);
    await other.request("GET", "/api/sessions/active");
    assert.equal((await row(id)).status, "active");
    await owner.request("GET", "/api/sessions/active");
    assert.equal((await row(id)).status, "cancelled");
  });
});
