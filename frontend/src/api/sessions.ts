import { request } from "./client.ts";
import type { ActiveSession, Session } from "../data/demoStore.ts";

export interface FocusSession {
  id: string;
  tag: string;
  mode: "countdown" | "stopwatch";
  status: "active" | "completed" | "cancelled";
  plannedSeconds: number | null;
  startedAt: string;
  pausedAt: string | null;
  endedAt: string | null;
  creditedSeconds: number;
  elapsedSeconds: number;
}

export function toHistory(s: FocusSession): Session {
  if (s.status !== "completed" || !s.endedAt) throw new Error("Session is not completed.");
  return { id: s.id, tag: s.tag, mode: s.mode, seconds: s.creditedSeconds, completedAt: Date.parse(s.endedAt) };
}

// Anchor the display to server-computed elapsed time, independent of clock skew.
export function toActive(s: FocusSession, receivedAt = Date.now()): ActiveSession {
  return {
    id: s.id,
    startedAt: receivedAt - s.elapsedSeconds * 1000,
    duration: (s.plannedSeconds ?? 0) / 60,
    mode: s.mode,
    tag: s.tag,
    ...(s.pausedAt ? { pausedAt: receivedAt } : {}),
  };
}

export const sessionsApi = {
  active: () => request<{ session: FocusSession | null }>("GET", "/sessions/active").then(r => r.session),
  start: (mode: "countdown" | "stopwatch", tag: string, minutes: number) =>
    request<{ session: FocusSession }>("POST", "/sessions", { mode, tag, ...(mode === "countdown" ? { plannedSeconds: minutes * 60 } : {}) }).then(r => r.session),
  transition: (id: string, action: "pause" | "resume" | "complete" | "cancel") =>
    request<{ session: FocusSession }>("POST", `/sessions/${encodeURIComponent(id)}/${action}`).then(r => r.session),
  history: async (): Promise<Session[]> => {
    const all: Session[] = [];
    let cursor: string | null = null;
    do {
      const query = new URLSearchParams({ status: "completed", limit: "100" });
      if (cursor) query.set("cursor", cursor);
      const page: { sessions: FocusSession[]; nextCursor: string | null } = await request("GET", `/sessions?${query}`);
      all.push(...page.sessions.map(toHistory));
      cursor = page.nextCursor;
    } while (cursor);
    return [...new Map(all.map(s => [s.id, s])).values()];
  },
};
