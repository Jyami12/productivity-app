import type { Session } from "./demoStore.ts";

// Fictional sessions for presentation use. Dates are relative to first load/reset.
// 8 sessions, 149 minutes. One real one-minute countdown reaches the 150-minute target.
export function makeDemoSessions(now = Date.now()): Session[] {
  const rows: [number, string, number, Session["mode"]][] = [
    [1, "Studying", 24, "countdown"],
    [2, "Deep work", 25, "countdown"],
    [2, "Reading", 15, "stopwatch"],
    [3, "Creative work", 25, "countdown"],
    [4, "Studying", 25, "countdown"],
    [5, "Deep work", 20, "stopwatch"],
    [6, "Reading", 10, "countdown"],
    [6, "Reading", 5, "stopwatch"],
  ];
  return rows.map(([daysAgo, tag, minutes, mode], index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(17 - index, 0, 0, 0);
    return {
      id: `m2-sample-${index + 1}`,
      tag,
      mode,
      seconds: minutes * 60,
      completedAt: date.getTime(),
    };
  }).sort((a, b) => b.completedAt - a.completedAt);
}
