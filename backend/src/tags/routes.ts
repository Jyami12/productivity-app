import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { validationError } from "../errors.js";

export const tagsRouter = Router();
const bodySchema = z.object({ name: z.string().trim().min(1).max(40) });

tagsRouter.get("/", async (_req, res) => {
  const tags = await prisma.tag.findMany({
    where: { userId: res.locals.user!.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  res.json({ tags });
});

tagsRouter.post("/", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error));
    return;
  }
  const name = parsed.data.name;
  const userId = res.locals.user!.id;
  const normalizedName = name.toLowerCase();
  // A repeated or concurrent request returns the existing account-owned tag.
  const tag = await prisma.tag.upsert({
    where: { userId_normalizedName: { userId, normalizedName } },
    create: { userId, name, normalizedName },
    update: {},
    select: { id: true, name: true },
  });
  res.status(201).json({ tag });
});
