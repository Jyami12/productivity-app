import { createHash, randomBytes } from "node:crypto";
import type { CookieOptions, Request, Response } from "express";
import { prisma } from "../db.js";

export const SESSION_COOKIE = "dinofocus_session";
const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

const cookieOptions: CookieOptions = {
  httpOnly: true, // not readable from page JavaScript
  sameSite: "lax", // not sent on cross-site POSTs (basic CSRF protection)
  secure: process.env.NODE_ENV === "production", // HTTPS-only once deployed
  path: "/",
};

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

function readToken(req: Request): string | undefined {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  return typeof token === "string" && token.length > 0 ? token : undefined;
}

/** Starts a login session, replacing any session this browser already had. */
export async function startSession(req: Request, res: Response, userId: string) {
  await endSession(req, res);
  const token = randomBytes(32).toString("base64url");
  await prisma.authSession.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_MS),
    },
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_MS });
}

export async function endSession(req: Request, res: Response) {
  const token = readToken(req);
  if (token) {
    await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

/** Returns the logged-in user for this request, or null. */
export async function currentUser(req: Request) {
  const token = readToken(req);
  if (!token) return null;
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.authSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.user;
}
