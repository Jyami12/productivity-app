// Login rate limits, security headers, and cleanup of expired logins.
// Each test starts its own server with low limits (3 per window), so the
// in-memory limit counters never carry over between tests.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, afterEach, beforeEach, describe, test } from "node:test";
import { createApp } from "../src/app.ts";
import { prisma, resetDatabase } from "./helpers.ts";

const PASSWORD = "correct-horse";
let server: Server | undefined;
let baseUrl = "";

beforeEach(async () => {
  await resetDatabase();
  server = createApp({ authRateLimits: { login: 3, register: 3, windowMs: 60_000 } }).listen(0);
  await new Promise((resolve) => server!.once("listening", resolve));
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});
afterEach(() => new Promise((resolve) => server!.close(resolve)));
after(() => prisma.$disconnect());

async function post(path: string, body: unknown, cookie?: string) {
  const res = await fetch(baseUrl + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : undefined };
}
const register = (email: string) => post("/api/auth/register", { email, password: PASSWORD });
const login = (email: string, password: string) => post("/api/auth/login", { email, password });

describe("login rate limit", () => {
  test("blocks after 3 failed attempts with 429 and Retry-After", async () => {
    await register("sam@example.com");
    for (let i = 0; i < 3; i++) {
      assert.equal((await login("sam@example.com", "wrong-pass")).status, 401);
    }
    const blocked = await login("sam@example.com", "wrong-pass");
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.error.code, "RATE_LIMITED");
    assert.match(blocked.body.error.message, /try again in 1 minutes/);
    assert.ok(Number(blocked.headers.get("retry-after")) > 0);

    // While blocked, even the right password is refused.
    assert.equal((await login("sam@example.com", PASSWORD)).status, 429);
  });

  test("successful logins don't count toward the limit", async () => {
    await register("sam@example.com");
    for (let i = 0; i < 6; i++) {
      assert.equal((await login("sam@example.com", PASSWORD)).status, 200);
    }
  });

  test("guessing across different emails is limited too", async () => {
    for (const email of ["a@example.com", "b@example.com", "c@example.com"]) {
      assert.equal((await login(email, "wrong-pass")).status, 401);
    }
    assert.equal((await login("d@example.com", "wrong-pass")).status, 429);
  });
});

describe("register rate limit", () => {
  test("allows 3 sign-ups per window, then 429", async () => {
    for (const email of ["a@example.com", "b@example.com", "c@example.com"]) {
      assert.equal((await register(email)).status, 201);
    }
    const blocked = await register("d@example.com");
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.error.code, "RATE_LIMITED");
    assert.equal(await prisma.user.count(), 3);
  });
});

describe("security headers", () => {
  test("API responses carry standard security headers", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.match(res.headers.get("strict-transport-security") ?? "", /max-age=/);
    assert.ok(res.headers.get("content-security-policy"));
    assert.equal(res.headers.get("x-powered-by"), null, "should not reveal Express");
  });
});

describe("expired login cleanup", () => {
  test("logging in removes the user's expired logins but keeps valid ones", async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: (await register("sam@example.com")).body.user.id },
    });
    const hash = (t: string) => createHash("sha256").update(t).digest("hex");
    const past = new Date(Date.now() - 1000);
    const future = new Date(Date.now() + 24 * 3600 * 1000);
    await prisma.authSession.createMany({
      data: [
        { userId: user.id, tokenHash: hash("old-1"), expiresAt: past },
        { userId: user.id, tokenHash: hash("old-2"), expiresAt: past },
        { userId: user.id, tokenHash: hash("other-device"), expiresAt: future },
      ],
    });
    // Another user's expired login must not be touched.
    const other = (await register("other@example.com")).body.user.id;
    await prisma.authSession.create({ data: { userId: other, tokenHash: hash("theirs"), expiresAt: past } });

    assert.equal((await login("sam@example.com", PASSWORD)).status, 200);

    const left = await prisma.authSession.findMany({ where: { userId: user.id } });
    assert.equal(left.length, 3, "register login + other device + new login");
    assert.ok(left.every((s) => s.expiresAt > new Date()));
    assert.equal(await prisma.authSession.count({ where: { tokenHash: hash("theirs") } }), 1);
  });
});
