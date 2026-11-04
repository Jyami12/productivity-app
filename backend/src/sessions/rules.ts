// Focus-session timing and state rules. Pure functions with no database or
// Express code: routes load a session, ask these rules what may happen, and
// write the returned changes. All times come from the server's clock.
import type { FocusSession } from "../generated/prisma/client.js";

/** A stopwatch session must run at least this long to be saved. */
export const MIN_STOPWATCH_SECONDS = 60;
/** Countdown length limits, matching the frontend's 1–1440 minute input. */
export const MIN_COUNTDOWN_SECONDS = 60;
export const MAX_COUNTDOWN_SECONDS = 24 * 60 * 60;
/** A stopwatch left running is never credited more than this. */
export const MAX_STOPWATCH_CREDIT_SECONDS = 12 * 60 * 60;
/** Extra time a countdown gets past its planned length before it counts as abandoned. */
export const ABANDON_GRACE_SECONDS = 2 * 60 * 60;

/** The fields these rules read. */
export type SessionTiming = Pick<
  FocusSession,
  "mode" | "status" | "plannedSeconds" | "startedAt" | "pausedAt" | "pausedSeconds"
>;

/** The fields a transition may change. */
export type SessionChanges = Partial<
  Pick<FocusSession, "status" | "pausedAt" | "pausedSeconds" | "endedAt" | "creditedSeconds">
>;

export type RuleErrorCode =
  | "SESSION_NOT_ACTIVE" // already completed or cancelled
  | "SESSION_ALREADY_PAUSED"
  | "SESSION_NOT_PAUSED"
  | "SESSION_TOO_SHORT"; // completed before the minimum time

export type RuleResult =
  | { ok: true; changes: SessionChanges }
  | { ok: false; code: RuleErrorCode; message: string };

const fail = (code: RuleErrorCode, message: string): RuleResult => ({ ok: false, code, message });
const seconds = (ms: number) => Math.max(0, Math.floor(ms / 1000));

/** Seconds of the current pause, or 0 when running. */
function currentPauseSeconds(s: SessionTiming, now: Date) {
  return s.pausedAt ? seconds(now.getTime() - s.pausedAt.getTime()) : 0;
}

/**
 * Focused seconds so far: time since start minus all paused time. While paused
 * the clock is frozen at the moment of pausing. Never negative.
 */
export function elapsedSeconds(s: SessionTiming, now: Date) {
  const end = s.pausedAt ?? now;
  return Math.max(0, seconds(end.getTime() - s.startedAt.getTime()) - s.pausedSeconds);
}

/** Seconds that must elapse before the session may be completed. */
export function requiredSeconds(s: SessionTiming) {
  return s.mode === "countdown" ? (s.plannedSeconds ?? 0) : MIN_STOPWATCH_SECONDS;
}

/** Seconds credited if the session were completed now (0 if too short). */
export function creditedSeconds(s: SessionTiming, now: Date) {
  const elapsed = elapsedSeconds(s, now);
  if (elapsed < requiredSeconds(s)) return 0;
  return s.mode === "countdown"
    ? s.plannedSeconds!
    : Math.min(elapsed, MAX_STOPWATCH_CREDIT_SECONDS);
}

/**
 * Seconds after the start (clock time, pauses included) at which an active
 * session counts as abandoned, for example because the tab was closed.
 */
export function abandonAfterSeconds(s: SessionTiming) {
  return s.mode === "countdown"
    ? (s.plannedSeconds ?? 0) + ABANDON_GRACE_SECONDS
    : MAX_STOPWATCH_CREDIT_SECONDS;
}

/** True if this active session has been left too long and should be cancelled. */
export function isAbandoned(s: SessionTiming, now: Date) {
  return (
    s.status === "active" &&
    seconds(now.getTime() - s.startedAt.getTime()) > abandonAfterSeconds(s)
  );
}

export function pause(s: SessionTiming, now: Date): RuleResult {
  if (s.status !== "active") return fail("SESSION_NOT_ACTIVE", "This session has already ended.");
  if (s.pausedAt) return fail("SESSION_ALREADY_PAUSED", "This session is already paused.");
  return { ok: true, changes: { pausedAt: now } };
}

export function resume(s: SessionTiming, now: Date): RuleResult {
  if (s.status !== "active") return fail("SESSION_NOT_ACTIVE", "This session has already ended.");
  if (!s.pausedAt) return fail("SESSION_NOT_PAUSED", "This session is not paused.");
  return {
    ok: true,
    changes: { pausedAt: null, pausedSeconds: s.pausedSeconds + currentPauseSeconds(s, now) },
  };
}

/** Completes the session; allowed while paused. Credit is computed here, never taken from the client. */
export function complete(s: SessionTiming, now: Date): RuleResult {
  if (s.status !== "active") return fail("SESSION_NOT_ACTIVE", "This session has already ended.");
  const elapsed = elapsedSeconds(s, now);
  const required = requiredSeconds(s);
  if (elapsed < required) {
    return fail(
      "SESSION_TOO_SHORT",
      `This session can be completed in ${required - elapsed} more seconds.`,
    );
  }
  return {
    ok: true,
    changes: {
      status: "completed",
      endedAt: now,
      pausedAt: null,
      pausedSeconds: s.pausedSeconds + currentPauseSeconds(s, now),
      creditedSeconds: creditedSeconds(s, now),
    },
  };
}

/** Cancels the session with no credit; allowed while paused. */
export function cancel(s: SessionTiming, now: Date): RuleResult {
  if (s.status !== "active") return fail("SESSION_NOT_ACTIVE", "This session has already ended.");
  return {
    ok: true,
    changes: {
      status: "cancelled",
      endedAt: now,
      pausedAt: null,
      pausedSeconds: s.pausedSeconds + currentPauseSeconds(s, now),
      creditedSeconds: 0,
    },
  };
}
