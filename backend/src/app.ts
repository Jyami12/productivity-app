import cookieParser from "cookie-parser";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { requireAuth } from "./auth/middleware.js";
import { DEFAULT_AUTH_RATE_LIMITS, type AuthRateLimits } from "./auth/rateLimit.js";
import { createAuthRouter } from "./auth/routes.js";
import { prisma } from "./db.js";
import { sessionsRouter } from "./sessions/routes.js";

export interface AppOptions {
  authRateLimits?: AuthRateLimits;
}

// Builds the Express app without starting a server, so tests can import it.
export function createApp(options: AppOptions = {}) {
  const app = express();
  // When deployed behind a host's proxy, set TRUST_PROXY to the number of
  // proxies (usually 1) so rate limits see each visitor's real IP address.
  const trustProxy = Number(process.env.TRUST_PROXY ?? 0);
  if (trustProxy > 0) app.set("trust proxy", trustProxy);

  // Standard security headers (no MIME sniffing, no framing, HSTS, etc.).
  app.use(helmet());
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());

  app.get("/api/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, database: "connected" });
    } catch (error) {
      console.error("Database health check failed:", error);
      res.status(503).json({ ok: false, database: "unreachable" });
    }
  });

  app.use("/api/auth", createAuthRouter(options.authRateLimits ?? DEFAULT_AUTH_RATE_LIMITS));
  app.use("/api/sessions", requireAuth, sessionsRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found." } });
  });

  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error?.type === "entity.parse.failed") {
      res.status(400).json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } });
      return;
    }
    console.error(error);
    res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong." } });
  };
  app.use(handleError);

  return app;
}
