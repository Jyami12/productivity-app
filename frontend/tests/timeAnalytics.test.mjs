import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  comparableBounds,
  dailyTotals,
  dateKey,
  parseDate,
  periodBounds,
  sessionsCsv,
  streaks,
  totalSeconds,
  validSessions,
  within,
} from "../src/data/timeAnalytics.ts";
process.env.TZ = "America/New_York";
const stamp = (year, month, day, hour = 12, minute = 0) =>
  new Date(year, month - 1, day, hour, minute).getTime();
const session = (id, completedAt, seconds = 1500, tag = "Deep work") => ({
  id,
  completedAt,
  seconds,
  tag,
  mode: "countdown",
});

test("weeks start Monday, including across a year boundary", () => {
  const b = periodBounds("2026-01-01", "week");
  assert.equal(dateKey(b.start), "2025-12-29");
  assert.equal(dateKey(b.end), "2026-01-05");
  assert.throws(() => parseDate("2026-02-30"));
  assert.throws(() => parseDate("bad"));
});
test("local days remain correct at both daylight-saving boundaries", () => {
  const spring = periodBounds("2026-03-08", "day"),
    fall = periodBounds("2026-11-01", "day");
  assert.equal((spring.end - spring.start) / 3600000, 23);
  assert.equal((fall.end - fall.start) / 3600000, 25);
  assert.equal(dateKey(addDays(parseDate("2026-03-08"), 1)), "2026-03-09");
});
test("a current week compares through the same local weekday and time", () => {
  const now = stamp(2026, 10, 17, 12, 15);
  const b = periodBounds("2026-10-17", "week");
  const p = comparableBounds(b, "week", now);
  assert.equal(p.start, stamp(2026, 10, 5, 0));
  assert.equal(p.end, stamp(2026, 10, 10, 12, 15) + 1);
  const historical = comparableBounds(
    periodBounds("2026-09-24", "week"),
    "week",
    now,
  );
  assert.equal(dateKey(historical.start), "2026-09-14");
  assert.equal(dateKey(historical.end), "2026-09-21");
});
test("partial-day comparison uses the same clock time across DST", () => {
  const now = stamp(2026, 3, 8, 14, 30);
  const p = comparableBounds(periodBounds("2026-03-08", "day"), "day", now);
  assert.equal(p.end, stamp(2026, 3, 7, 14, 30) + 1);
});
test("range boundaries are exclusive at the end and cross-midnight sessions credit the completion date", () => {
  const b = periodBounds("2026-10-17", "day");
  const rows = [
    session("before", b.start - 1),
    session("midnight", b.start, 3600),
    session("end", b.end),
  ];
  assert.deepEqual(
    within(rows, b).map((s) => s.id),
    ["midnight"],
  );
  assert.equal(totalSeconds(within(rows, b)), 3600);
});
test("daily buckets include empty days and preserve seconds", () => {
  const b = periodBounds("2026-10-14", "week");
  const rows = [
    session("a", stamp(2026, 10, 12), 90),
    session("b", stamp(2026, 10, 14), 1500),
  ];
  const days = dailyTotals(rows, b);
  assert.equal(days.length, 7);
  assert.equal(days[1].seconds, 0);
  assert.equal(
    days.reduce((n, d) => n + d.seconds, 0),
    1590,
  );
});
test("streaks span midnight and allow today to remain unfinished", () => {
  const now = stamp(2026, 10, 17);
  const rows = [14, 15, 16].map((d) => session(String(d), stamp(2026, 10, d)));
  assert.deepEqual(streaks(rows, now), { current: 3, best: 3 });
  assert.deepEqual(streaks(rows, stamp(2026, 10, 18)), { current: 0, best: 3 });
});
test("invalid rows, future timestamps and duplicate records do not inflate totals", () => {
  const now = stamp(2026, 10, 17);
  const ok = session("a", now - 10000);
  const rows = [
    ok,
    ok,
    { ...ok, id: "bad", seconds: NaN },
    { ...ok, id: "future", completedAt: now + 1 },
    { ...ok, id: "tag", tag: "  " },
  ];
  const valid = validSessions(rows, now);
  assert.equal(valid.length, 2);
  assert.equal(valid[1].tag, "Uncategorized");
});
test("CSV quotes delimiters and neutralizes spreadsheet formulas", () => {
  const csv = sessionsCsv([
    session("a", stamp(2026, 10, 17), 90, '=HYPERLINK("x","y")'),
  ]);
  assert.match(csv, /"'=HYPERLINK\(""x"",""y""\)"/);
  assert.match(csv, /"90"/);
  assert.match(csv, /"2026-10-17"/);
});
