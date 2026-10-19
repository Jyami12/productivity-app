import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { Prisma, type User } from "../generated/prisma/client.js";
import { requireAuth } from "./middleware.js";
import { hashPassword, verifyPassword } from "./password.js";
import { endSession, startSession } from "./sessions.js";

const email = z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address."));
// bcrypt ignores everything after 72 bytes, so longer passwords are rejected.
const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .refine((p) => Buffer.byteLength(p) <= 72, "Password must be at most 72 bytes.");

const registerBody = z.object({ email, password });
const loginBody = z.object({ email, password: z.string().min(1, "Enter your password.") });

/** The only user fields ever sent to the browser. */
const publicUser = (user: User) => ({
  id: user.id,
  email: user.email,
  createdAt: user.createdAt,
});

function validationError(error: z.ZodError) {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: "Please fix the highlighted fields.",
      fields: z.flattenError(error).fieldErrors,
    },
  };
}

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = registerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }
  let user: User;
  try {
    user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({
        error: { code: "EMAIL_TAKEN", message: "An account with this email already exists." },
      });
      return;
    }
    throw error;
  }
  await startSession(req, res, user.id);
  res.status(201).json({ user: publicUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? null);
  if (!user || !valid) {
    // Same message either way, so the response doesn't reveal which emails exist.
    res.status(401).json({
      error: { code: "INVALID_CREDENTIALS", message: "Incorrect email or password." },
    });
    return;
  }
  await startSession(req, res, user.id);
  res.json({ user: publicUser(user) });
});

authRouter.post("/logout", async (req, res) => {
  await endSession(req, res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (_req, res) => {
  res.json({ user: publicUser(res.locals.user!) });
});
