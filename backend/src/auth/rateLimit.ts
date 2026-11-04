import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { sendError } from "../errors.js";

export interface AuthRateLimits {
  /** Failed login attempts allowed per IP address per window. */
  login: number;
  /** Accounts that can be created per IP address per window. */
  register: number;
  windowMs: number;
}

export const DEFAULT_AUTH_RATE_LIMITS: AuthRateLimits = {
  login: 10,
  register: 10,
  windowMs: 15 * 60 * 1000,
};

function limiter(limit: number, windowMs: number, options: { skipSuccessfulRequests?: boolean } = {}): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    // Sends RateLimit and Retry-After headers so clients know when to retry.
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ...options,
    handler: (_req, res) => {
      const minutes = Math.ceil(windowMs / 60_000);
      sendError(res, 429, "RATE_LIMITED", `Too many attempts. Please try again in ${minutes} minutes.`);
    },
  });
}

/**
 * Limits password guessing and mass sign-ups per IP address. Successful logins
 * don't count, so a user who types their password correctly is never blocked.
 * Counts are kept in memory, so they reset when the server restarts and are
 * per server instance (fine for a single deployed instance).
 */
export function authRateLimiters(limits: AuthRateLimits) {
  return {
    login: limiter(limits.login, limits.windowMs, { skipSuccessfulRequests: true }),
    register: limiter(limits.register, limits.windowMs),
  };
}
