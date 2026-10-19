import type { NextFunction, Request, Response } from "express";
import type { User } from "../generated/prisma/client.js";
import { currentUser } from "./sessions.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      user?: User;
    }
  }
}

/** Rejects the request with 401 unless a valid login cookie is present. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await currentUser(req);
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Please log in." } });
    return;
  }
  res.locals.user = user;
  next();
}
