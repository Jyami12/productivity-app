import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, before, beforeEach, describe, test } from "node:test";
import { browser, prisma, resetDatabase, startServer, stopServer } from "./helpers.ts";

const PASSWORD = "correct-horse";
const register = (b = browser(), email = "sam@example.com", password = PASSWORD) =>
  b.request("POST", "/api/auth/register", { email, password });

before(startServer);
after(stopServer);
beforeEach(resetDatabase);

describe("register", () => {
  test("creates an account, logs in, and returns only public fields", async () => {
    const b = browser();
    const res = await register(b);
    assert.equal(res.status, 201);
    assert.deepEqual(Object.keys(res.body.user).sort(), ["createdAt", "email", "id"]);
    assert.match(res.setCookie.at(-1)!, /HttpOnly/);
    assert.match(res.setCookie.at(-1)!, /SameSite=Lax/);

    const me = await b.request("GET", "/api/auth/me");
    assert.equal(me.status, 200);
    assert.equal(me.body.user.id, res.body.user.id);
  });

  test("stores a bcrypt hash, never the plain password", async () => {
    await register();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "sam@example.com" } });
    assert.match(user.passwordHash, /^\$2[aby]\$12\$/);
    assert.ok(!user.passwordHash.includes(PASSWORD));
  });

  test("normalizes email and rejects duplicates in any letter case", async () => {
    const first = await register(browser(), "  Sam@Example.COM ");
    assert.equal(first.body.user.email, "sam@example.com");

    const dup = await register(browser(), "SAM@example.com");
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.code, "EMAIL_TAKEN");
    assert.equal(await prisma.user.count(), 1);
  });

  test("rejects invalid email and short password with field errors", async () => {
    const res = await register(browser(), "not-an-email", "short");
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
    assert.ok(res.body.error.fields.email);
    assert.ok(res.body.error.fields.password);
    assert.equal(await prisma.user.count(), 0);
  });

  test("rejects passwords longer than bcrypt's 72-byte limit", async () => {
    const res = await register(browser(), "sam@example.com", "é".repeat(37)); // 74 bytes
    assert.equal(res.status, 400);
    assert.ok(res.body.error.fields.password);
  });
});

describe("login", () => {
  beforeEach(() => register());

  test("logs in with the correct password", async () => {
    const b = browser();
    const res = await b.request("POST", "/api/auth/login", { email: "SAM@example.com", password: PASSWORD });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, "sam@example.com");
    assert.equal((await b.request("GET", "/api/auth/me")).status, 200);
  });

  test("gives the same error for a wrong password and an unknown email", async () => {
    const wrong = await browser().request("POST", "/api/auth/login", { email: "sam@example.com", password: "wrong-password" });
    const unknown = await browser().request("POST", "/api/auth/login", { email: "nobody@example.com", password: PASSWORD });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(wrong.body, unknown.body);
  });

  test("replaces this browser's previous session instead of piling them up", async () => {
    const b = browser();
    await b.request("POST", "/api/auth/login", { email: "sam@example.com", password: PASSWORD });
    await b.request("POST", "/api/auth/login", { email: "sam@example.com", password: PASSWORD });
    // One from the beforeEach registration's browser, one from this browser.
    assert.equal(await prisma.authSession.count(), 2);
  });
});

describe("sessions", () => {
  test("/me rejects a missing or made-up cookie", async () => {
    const b = browser();
    assert.equal((await b.request("GET", "/api/auth/me")).status, 401);
    b.cookie = "dinofocus_session=made-up-token";
    const res = await b.request("GET", "/api/auth/me");
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "UNAUTHENTICATED");
  });

  test("stores only a SHA-256 hash of the cookie token", async () => {
    const b = browser();
    await register(b);
    const token = b.cookie!.split("=")[1];
    const [session] = await prisma.authSession.findMany();
    assert.notEqual(session.tokenHash, token);
    assert.equal(session.tokenHash, createHash("sha256").update(token).digest("hex"));
  });

  test("logout deletes the session so the old cookie stops working", async () => {
    const b = browser();
    await register(b);
    const oldCookie = b.cookie;

    const res = await b.request("POST", "/api/auth/logout");
    assert.equal(res.status, 204);
    assert.equal(b.cookie, undefined);
    assert.equal(await prisma.authSession.count(), 0);

    b.cookie = oldCookie;
    assert.equal((await b.request("GET", "/api/auth/me")).status, 401);
  });

  test("an expired session is rejected and removed", async () => {
    const b = browser();
    await register(b);
    await prisma.authSession.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    assert.equal((await b.request("GET", "/api/auth/me")).status, 401);
    assert.equal(await prisma.authSession.count(), 0);
  });
});

describe("errors", () => {
  test("malformed JSON returns 400", async () => {
    const res = await browser().request("POST", "/api/auth/login", "{bad");
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INVALID_JSON");
  });

  test("unknown API routes return 404 JSON", async () => {
    const res = await browser().request("GET", "/api/does-not-exist");
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, "NOT_FOUND");
  });
});
