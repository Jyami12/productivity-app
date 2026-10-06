import { makeDemoSessions } from "./demoData.ts";

export const isSampleWorkspace =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("demo") === "sample";

export interface Session {
  id: string;
  tag: string;
  mode: "countdown" | "stopwatch";
  seconds: number;
  completedAt: number;
}
export interface ActiveSession {
  startedAt: number;
  mode: Session["mode"];
  duration: number;
  tag: string;
  pausedAt?: number;
  pausedMs?: number;
}
const sessionKey = isSampleWorkspace
    ? "dinofocus.m2.sample.sessions.v1"
    : "dinofocus.demo.sessions.v1",
  activeKey = isSampleWorkspace
    ? "dinofocus.m2.sample.active.v1"
    : "dinofocus.demo.active.v1";

// Only the separate sample workspace is reset. Ordinary browser history is untouched.
export function resetSampleWorkspace() {
  if (!isSampleWorkspace) return;
  localStorage.setItem(sessionKey, JSON.stringify(makeDemoSessions()));
  localStorage.removeItem(activeKey);
}
function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Current tab still works when storage is unavailable. */
  }
}
export function elapsedSeconds(active: ActiveSession, now: number) {
  return Math.max(
    0,
    Math.floor(
      ((active.pausedAt ?? now) - active.startedAt - (active.pausedMs ?? 0)) /
        1000,
    ),
  );
}
export function toggleSessionPause(
  active: ActiveSession,
  now: number,
): ActiveSession {
  if (active.pausedAt !== undefined) {
    const { pausedAt, ...running } = active;
    return {
      ...running,
      pausedMs: (active.pausedMs ?? 0) + Math.max(0, now - pausedAt),
    };
  }
  return { ...active, pausedAt: now };
}
const validMode = (mode: unknown) =>
  mode === "countdown" || mode === "stopwatch";
// Replace this browser-only adapter with an API client once backend contracts are agreed.
export const demoStore = {
  getSessions(): Session[] {
    let data = read(sessionKey);
    if (data === null && isSampleWorkspace) {
      data = makeDemoSessions();
      write(sessionKey, data);
    }
    return Array.isArray(data)
      ? data.filter(
          (s): s is Session =>
            !!s &&
            typeof s.id === "string" &&
            typeof s.tag === "string" &&
            validMode(s.mode) &&
            Number.isFinite(s.seconds) &&
            s.seconds >= 60 &&
            Number.isFinite(s.completedAt),
        )
      : [];
  },
  getActive(): ActiveSession | null {
    const data = read(activeKey) as ActiveSession | null;
    return data &&
      Number.isFinite(data.startedAt) &&
      validMode(data.mode) &&
      Number.isFinite(data.duration) &&
      data.duration > 0 &&
      typeof data.tag === "string" &&
      (data.pausedAt === undefined ||
        (Number.isFinite(data.pausedAt) && data.pausedAt >= data.startedAt)) &&
      (data.pausedMs === undefined ||
        (Number.isFinite(data.pausedMs) && data.pausedMs >= 0))
      ? data
      : null;
  },
  setActive(active: ActiveSession | null) {
    write(activeKey, active);
  },
  complete(active: ActiveSession, now: number): Session[] {
    const sessions = this.getSessions(),
      id = String(active.startedAt);
    const seconds =
      active.mode === "countdown"
        ? active.duration * 60
        : elapsedSeconds(active, now);
    if (
      elapsedSeconds(active, now) <
        (active.mode === "countdown" ? active.duration * 60 : 60) ||
      sessions.some((s) => s.id === id)
    )
      return sessions;
    const next = [
      { id, tag: active.tag, mode: active.mode, seconds, completedAt: now },
      ...sessions,
    ];
    write(sessionKey, next);
    return next;
  },
};
