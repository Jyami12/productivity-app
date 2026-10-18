import type { Session } from "./demoStore.ts";

export type View = "day" | "week";
export type Bounds = { start: number; end: number };
export type DailyTotal = {
  key: string;
  start: number;
  seconds: number;
  count: number;
};

export function dateKey(value: number | Date): string {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function parseDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  const d = new Date(0);
  d.setFullYear(year, month - 1, day);
  d.setHours(0, 0, 0, 0);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(key) ||
    !Number.isFinite(d.getTime()) ||
    dateKey(d) !== key
  )
    throw new Error("Invalid local date");
  return d;
}
// Calendar arithmetic preserves local days across daylight-saving transitions.
export function addDays(value: number | Date, amount: number): Date {
  const d = new Date(value);
  d.setDate(d.getDate() + amount);
  return d;
}
export function periodBounds(key: string, view: View): Bounds {
  const start = parseDate(key);
  if (view === "week")
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return {
    start: start.getTime(),
    end: addDays(start, view === "week" ? 7 : 1).getTime(),
  };
}
export function comparableBounds(
  bounds: Bounds,
  view: View,
  now: number,
): Bounds {
  const length = view === "week" ? 7 : 1;
  const start = addDays(bounds.start, -length).getTime();
  // Current periods compare through the same local weekday/time in the prior period.
  const end =
    bounds.end > now
      ? Math.min(
          bounds.start,
          addDays(Math.max(bounds.start, now), -length).getTime() + 1,
        )
      : bounds.start;
  return { start, end };
}
export function validSessions(
  rows: readonly Session[],
  now = Date.now(),
): Session[] {
  const seen = new Set<string>();
  return rows
    .filter((s) => {
      if (
        !s ||
        typeof s.id !== "string" ||
        seen.has(s.id) ||
        typeof s.tag !== "string" ||
        !["countdown", "stopwatch"].includes(s.mode) ||
        !Number.isFinite(s.seconds) ||
        s.seconds <= 0 ||
        !Number.isFinite(s.completedAt) ||
        !Number.isFinite(new Date(s.completedAt).getTime()) ||
        s.completedAt > now
      )
        return false;
      seen.add(s.id);
      return true;
    })
    .map((s) => ({ ...s, tag: s.tag.trim() || "Uncategorized" }))
    .sort((a, b) => b.completedAt - a.completedAt);
}
export function within(rows: readonly Session[], bounds: Bounds): Session[] {
  return rows.filter(
    (s) => s.completedAt >= bounds.start && s.completedAt < bounds.end,
  );
}
export function totalSeconds(rows: readonly Session[]): number {
  return rows.reduce((sum, s) => sum + s.seconds, 0);
}
export function dailyTotals(
  rows: readonly Session[],
  bounds: Bounds,
): DailyTotal[] {
  const totals = new Map<string, DailyTotal>();
  for (
    let d = new Date(bounds.start);
    d.getTime() < bounds.end;
    d = addDays(d, 1)
  ) {
    const key = dateKey(d);
    totals.set(key, { key, start: d.getTime(), seconds: 0, count: 0 });
  }
  for (const s of within(rows, bounds)) {
    const bucket = totals.get(dateKey(s.completedAt));
    if (bucket) {
      bucket.seconds += s.seconds;
      bucket.count++;
    }
  }
  return [...totals.values()];
}
export function activityTotals(rows: readonly Session[]) {
  const totals = new Map<
    string,
    { tag: string; seconds: number; count: number }
  >();
  for (const s of rows) {
    const current = totals.get(s.tag) ?? { tag: s.tag, seconds: 0, count: 0 };
    current.seconds += s.seconds;
    current.count++;
    totals.set(s.tag, current);
  }
  return [...totals.values()].sort(
    (a, b) => b.seconds - a.seconds || a.tag.localeCompare(b.tag),
  );
}
export function streaks(rows: readonly Session[], now: number) {
  const days = [...new Set(rows.map((s) => dateKey(s.completedAt)))].sort();
  const used = new Set(days);
  let best = 0,
    run = 0,
    previous = "";
  for (const key of days) {
    run =
      previous && dateKey(addDays(parseDate(previous), 1)) === key
        ? run + 1
        : 1;
    best = Math.max(best, run);
    previous = key;
  }
  let cursor = parseDate(dateKey(now));
  if (!used.has(dateKey(cursor))) cursor = addDays(cursor, -1);
  let current = 0;
  while (used.has(dateKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, best };
}
export function formatDuration(seconds: number): string {
  if (!seconds) return "0m";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m`;
}
export function exactDuration(seconds: number): string {
  const n = Math.floor(seconds);
  return `${Math.floor(n / 3600)}h ${Math.floor((n % 3600) / 60)}m ${n % 60}s`;
}
// Quote all fields and neutralize spreadsheet formula prefixes in exported text.
export function csvCell(value: string | number): string {
  const s = String(value);
  const safe =
    typeof value === "string" && /^[\s]*[=+@-]/.test(s) ? `'${s}` : s;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function sessionsCsv(rows: readonly Session[]): string {
  const header = [
    "Session ID",
    "Activity",
    "Mode",
    "Duration seconds",
    "Completed at (ISO)",
    "Completion date (local)",
  ];
  const data = rows.map((s) => [
    s.id,
    s.tag,
    s.mode,
    s.seconds,
    new Date(s.completedAt).toISOString(),
    dateKey(s.completedAt),
  ]);
  return [header, ...data]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}
