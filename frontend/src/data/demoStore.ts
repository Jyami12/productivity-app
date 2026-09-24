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
}
const sessionKey = "dinofocus.demo.sessions.v1",
  activeKey = "dinofocus.demo.active.v1";
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
  return Math.max(0, Math.floor((now - active.startedAt) / 1000));
}
const validMode = (mode: unknown) =>
  mode === "countdown" || mode === "stopwatch";
// Replace this browser-only adapter with an API client once backend contracts are agreed.
export const demoStore = {
  getSessions(): Session[] {
    const data = read(sessionKey);
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
      typeof data.tag === "string"
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
