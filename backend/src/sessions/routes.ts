// Focus-session API. Mounted behind requireAuth, so res.locals.user is always set.
// Every query is scoped to the logged-in user: another user's session looks
// exactly like one that doesn't exist (404).
import { type Request, type Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { sendError, validationError } from "../errors.js";
import { type FocusSession, Prisma } from "../generated/prisma/client.js";
import {
  cancel,
  complete,
  elapsedSeconds,
  isAbandoned,
  MAX_COUNTDOWN_SECONDS,
  MIN_COUNTDOWN_SECONDS,
  pause,
  requiredSeconds,
  resume,
  type RuleResult,
  type SessionTiming,
} from "./rules.js";

const tag = z
  .string()
  .trim()
  .min(1, "Enter a tag.")
  .max(40, "Tag must be at most 40 characters.");

// Unknown fields (for example a client-sent creditedSeconds) are dropped.
const startBody = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("countdown"),
    tag,
    plannedSeconds: z
      .number()
      .int("Duration must be whole seconds.")
      .min(MIN_COUNTDOWN_SECONDS, "Duration must be at least 1 minute.")
      .max(MAX_COUNTDOWN_SECONDS, "Duration must be at most 24 hours."),
  }),
  z.object({ mode: z.literal("stopwatch"), tag }),
], { error: "Mode must be countdown or stopwatch." });

const listQuery = z.object({
  status: z.enum(["completed", "cancelled", "all"]).default("completed"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  // id of the last session from the previous page
  cursor: z.string().max(100).optional(),
});

/** The session as sent to the browser, with server-computed timing. */
export function publicSession(s: FocusSession, now: Date) {
  return {
    id: s.id,
    tag: s.tag,
    mode: s.mode,
    status: s.status,
    plannedSeconds: s.plannedSeconds,
    startedAt: s.startedAt,
    pausedAt: s.pausedAt,
    pausedSeconds: s.pausedSeconds,
    endedAt: s.endedAt,
    creditedSeconds: s.creditedSeconds,
    // Live values for an active session; for an ended one, as of when it ended.
    elapsedSeconds: elapsedSeconds(s, s.endedAt ?? now),
    requiredSeconds: requiredSeconds(s),
  };
}

const userId = (res: Response) => res.locals.user!.id;

const findOwn = (req: Request, res: Response) =>
  prisma.focusSession.findFirst({ where: { id: String(req.params.id), userId: userId(res) } });

const ruleStatus: Record<Exclude<RuleResult, { ok: true }>["code"], number> = {
  SESSION_NOT_ACTIVE: 409,
  SESSION_ALREADY_PAUSED: 409,
  SESSION_NOT_PAUSED: 409,
  SESSION_TOO_SHORT: 409,
};

/**
 * Loads the user's session, asks a rule what may happen, and saves the result
 * only if the row hasn't changed since it was read. If another request changed
 * it first, the rule is re-checked against the fresh row, so two simultaneous
 * requests can never both apply (for example, completing twice).
 */
function transition(
  rule: (s: SessionTiming, now: Date) => RuleResult,
  options: { idempotentStatus?: FocusSession["status"] } = {},
) {
  return async (req: Request, res: Response) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const session = await findOwn(req, res);
      const now = new Date();
      if (!session) {
        sendError(res, 404, "SESSION_NOT_FOUND", "Focus session not found.");
        return;
      }
      // Repeating a completion returns the saved result without changing anything.
      if (options.idempotentStatus && session.status === options.idempotentStatus) {
        res.json({ session: publicSession(session, now) });
        return;
      }
      const result = rule(session, now);
      if (!result.ok) {
        sendError(res, ruleStatus[result.code], result.code, result.message);
        return;
      }
      const { count } = await prisma.focusSession.updateMany({
        where: { id: session.id, userId: userId(res), updatedAt: session.updatedAt },
        data: result.changes,
      });
      if (count === 1) {
        const saved = await prisma.focusSession.findUniqueOrThrow({ where: { id: session.id } });
        res.json({ session: publicSession(saved, now) });
        return;
      }
    }
    sendError(res, 409, "SESSION_CONFLICT", "This session was changed by another request. Try again.");
  };
}

/**
 * Cancels the user's active session, with no credit, if it was abandoned
 * (for example the tab was closed). Runs before every session route, so an
 * abandoned session never blocks starting a new one. If another request
 * changes the session at the same moment, that request wins.
 */
export async function cancelAbandoned(userId: string, now = new Date()) {
  const active = await prisma.focusSession.findFirst({ where: { userId, status: "active" } });
  if (!active || !isAbandoned(active, now)) return;
  const result = cancel(active, now);
  if (!result.ok) return;
  await prisma.focusSession.updateMany({
    where: { id: active.id, userId, updatedAt: active.updatedAt },
    data: result.changes,
  });
}

export const sessionsRouter = Router();

sessionsRouter.use(async (_req, res, next) => {
  await cancelAbandoned(userId(res));
  next();
});

sessionsRouter.post("/", async (req, res) => {
  const parsed = startBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }
  const body = parsed.data;
  try {
    const session = await prisma.focusSession.create({
      data: {
        userId: userId(res),
        tag: body.tag,
        mode: body.mode,
        plannedSeconds: body.mode === "countdown" ? body.plannedSeconds : null,
      },
    });
    res.status(201).json({ session: publicSession(session, new Date()) });
  } catch (error) {
    // The database allows one active session per user.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      sendError(res, 409, "ACTIVE_SESSION_EXISTS", "Finish or cancel your current session first.");
      return;
    }
    throw error;
  }
});

sessionsRouter.get("/active", async (_req, res) => {
  const session = await prisma.focusSession.findFirst({
    where: { userId: userId(res), status: "active" },
  });
  const now = new Date();
  res.json({ session: session && publicSession(session, now), serverTime: now });
});

sessionsRouter.get("/", async (req, res) => {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }
  const { status, limit, cursor } = parsed.data;
  const where = {
    userId: userId(res),
    status: status === "all" ? { in: ["completed" as const, "cancelled" as const] } : status,
  };
  if (cursor && !(await prisma.focusSession.findFirst({ where: { ...where, id: cursor } }))) {
    sendError(res, 400, "INVALID_CURSOR", "Unknown page cursor.");
    return;
  }
  // Fetch one extra row to know whether another page exists.
  const rows = await prisma.focusSession.findMany({
    where,
    orderBy: [{ endedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, limit);
  const now = new Date();
  res.json({
    sessions: page.map((s) => publicSession(s, now)),
    nextCursor: rows.length > limit ? page.at(-1)!.id : null,
  });
});

sessionsRouter.get("/:id", async (req, res) => {
  const session = await findOwn(req, res);
  if (!session) {
    sendError(res, 404, "SESSION_NOT_FOUND", "Focus session not found.");
    return;
  }
  res.json({ session: publicSession(session, new Date()) });
});

sessionsRouter.post("/:id/pause", transition(pause));
sessionsRouter.post("/:id/resume", transition(resume));
sessionsRouter.post("/:id/complete", transition(complete, { idempotentStatus: "completed" }));
sessionsRouter.post("/:id/cancel", transition(cancel, { idempotentStatus: "cancelled" }));
