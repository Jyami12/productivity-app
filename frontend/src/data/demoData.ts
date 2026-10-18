import type { Session } from "./demoStore.ts";

// Fictional focus history, anchored to the browser's local date at first load/reset.
// The sample workspace has its own storage keys; real history is never seeded.
export function makeDemoSessions(now = Date.now()): Session[] {
  if (!Number.isFinite(now) || Number.isNaN(new Date(now).getTime())) return [];
  const tags = ["Deep work", "Studying", "Reading", "Creative work"];
  const minutes = [25, 40, 15, 50, 30, 20, 45];
  const hours = [9, 12, 16, 20];
  const rows: Session[] = [];
  for (let daysAgo = 27; daysAgo >= 1; daysAgo--) {
    // Include a few rest days, while leaving a recent run for the streak view.
    if ([6, 13, 20].includes(daysAgo)) continue;
    const count = 2 + (daysAgo % 3);
    for (let slot = 0; slot < count; slot++) {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(hours[slot], 10 + ((daysAgo + slot) % 4) * 10, 0, 0);
      rows.push({
        id: `m2-sample-rich-${daysAgo}-${slot}`,
        tag: tags[(daysAgo + slot) % tags.length],
        mode: slot % 2 === 0 ? "countdown" : "stopwatch",
        seconds: minutes[(daysAgo * 2 + slot) % minutes.length] * 60,
        completedAt: date.getTime(),
      });
    }
  }
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  // At least one completion today, even just after midnight. Such a session
  // can have started yesterday: the app credits minutes to completion date.
  for (let slot = 0; slot < 3; slot++) {
    const completedAt = now - slot * 90 * 60_000;
    if (completedAt < midnight.getTime()) continue;
    rows.push({
      id: `m2-sample-rich-today-${slot}`,
      tag: tags[slot],
      mode: slot === 2 ? "stopwatch" : "countdown",
      seconds: [25, 40, 20][slot] * 60,
      completedAt,
    });
  }
  return rows.sort((a, b) => b.completedAt - a.completedAt);
}
