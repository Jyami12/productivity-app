import cookieParser from "cookie-parser";
import express, { type ErrorRequestHandler } from "express";
import { authRouter } from "./auth/routes.js";
import { prisma } from "./db.js";

// Builds the Express app without starting a server, so tests can import it.
export function createApp() {
  const app = express();
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

  app.use("/api/auth", authRouter);

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
