import type { Session } from "./demoStore.ts";

// 120 fictional minutes across a 28-day window: five collected fossils,
// T. rex at 80%, and six locked fossils. Ordinary history is never seeded.
export function makeDemoSessions(now = Date.now()): Session[] {
  if (!Number.isFinite(now) || Number.isNaN(new Date(now).getTime())) return [];
  const tags = ["Deep work", "Studying", "Reading", "Creative work"];
  const offsets = [27, 25, 22, 19, 17, 15, 12, 10, 8, 5, 3, 2, 1];
  const minutes = [5, 8, 5, 10, 7, 5, 12, 8, 5, 10, 5, 10, 5]; // 95 total
  const rows: Session[] = offsets.map((daysAgo, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours([9, 12, 16, 20][i % 4], 20, 0, 0);
    return {
      id: `m2-sample-partial-${daysAgo}`,
      tag: tags[i % tags.length],
      mode: i % 2 === 0 ? "countdown" : "stopwatch",
      seconds: minutes[i] * 60,
      completedAt: date.getTime(),
    };
  });
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  // Keep today's 25 minutes constant even when opening the demo just after
  // midnight. Minutes are attributed to the completion date in this app.
  const slots = now - midnight.getTime() >= 180 * 60_000 ? [10, 10, 5] : [25];
  slots.forEach((duration, i) =>
    rows.push({
      id: `m2-sample-partial-today-${i}`,
      tag: tags[i],
      mode: i === slots.length - 1 ? "stopwatch" : "countdown",
      seconds: duration * 60,
      completedAt: now - i * 90 * 60_000,
    }),
  );
  return rows.sort((a, b) => b.completedAt - a.completedAt);
}
