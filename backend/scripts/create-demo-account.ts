// Explicit, one-time presentation fixture. Never run through a public API route.
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { prisma } from "../src/db.ts";
import { hashPassword, verifyPassword } from "../src/auth/password.ts";

process.env.TZ = "America/New_York";
const email = "demo@dinofocus.example";
const password = randomBytes(12).toString("base64url");
const customTags = ["CSE 416", "Algorithms", "Portfolio"];
const minutes = [15, 10, 20, 12, 8, 14, 10, 15, 10, 8, 12, 15];
const daysAgo = [13, 11, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const labels = ["Reading", "Algorithms", "CSE 416", "Deep work", "Portfolio", "Studying"];

try {
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new Error("The presentation account already exists. Nothing was changed. Use its existing credentials.");
  }
  const passwordHash = await hashPassword(password);
  const now = new Date();
  const sessions = minutes.map((duration, i) => {
    const endedAt = new Date(now);
    if (daysAgo[i] === 0) endedAt.setMinutes(endedAt.getMinutes() - 30);
    else {
      endedAt.setDate(endedAt.getDate() - daysAgo[i]);
      endedAt.setHours(14, 30, 0, 0);
    }
    const startedAt = new Date(endedAt.getTime() - duration * 60_000);
    assert.ok(endedAt.getTime() < now.getTime());
    return {
      tag: labels[i % labels.length],
      mode: i % 3 === 0 ? "stopwatch" as const : "countdown" as const,
      plannedSeconds: i % 3 === 0 ? null : duration * 60,
      startedAt,
      endedAt,
      creditedSeconds: duration * 60,
      status: "completed" as const,
      createdAt: startedAt,
      updatedAt: endedAt,
    };
  });
  assert.equal(minutes.reduce((sum, value) => sum + value, 0), 149);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      createdAt: sessions[0].startedAt,
      tags: { create: customTags.map(name => ({ name, normalizedName: name.toLowerCase() })) },
      focusSessions: { create: sessions },
    },
    include: { tags: true, focusSessions: true },
  });
  assert.equal(user.focusSessions.length, 12);
  assert.equal(user.tags.length, 3);
  assert.equal(user.focusSessions.reduce((sum, s) => sum + s.creditedSeconds, 0), 149 * 60);
  assert.ok(await verifyPassword(password, user.passwordHash));
  console.log(JSON.stringify({
    email,
    password,
    fictionalSessions: user.focusSessions.length,
    totalMinutes: 149,
    customTags,
    collectedFossils: 5,
    nextUnlock: "Complete a real one-minute session to unlock Tyrannosaurus rex at 150 minutes.",
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
