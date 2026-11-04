import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { browser, resetDatabase, startServer, stopServer } from "./helpers.ts";

before(() => startServer());
after(stopServer);
beforeEach(resetDatabase);

test("tags require authentication", async () => {
  const b = browser();
  assert.equal((await b.request("GET", "/api/tags")).status, 401);
  assert.equal((await b.request("POST", "/api/tags", { name: "Project" })).status, 401);
});

test("tags persist across logins, deduplicate names, and stay private to their account", async () => {
  const first = browser();
  const second = browser();
  await first.request("POST", "/api/auth/register", { email: "first@example.com", password: "correct-horse" });
  await second.request("POST", "/api/auth/register", { email: "second@example.com", password: "correct-horse" });
  const created = await first.request("POST", "/api/tags", { name: "  Senior project  " });
  assert.equal(created.status, 201);
  assert.equal(created.body.tag.name, "Senior project");
  const duplicate = await first.request("POST", "/api/tags", { name: "SENIOR PROJECT" });
  assert.equal(duplicate.body.tag.id, created.body.tag.id);
  assert.deepEqual((await second.request("GET", "/api/tags")).body.tags, []);
  const own = await second.request("POST", "/api/tags", { name: "Senior project" });
  assert.notEqual(own.body.tag.id, created.body.tag.id);
  await first.request("POST", "/api/auth/logout");
  await first.request("POST", "/api/auth/login", { email: "first@example.com", password: "correct-horse" });
  assert.deepEqual((await first.request("GET", "/api/tags")).body.tags, [created.body.tag]);
});

test("rejects blank, non-string, and overlong tag names", async () => {
  const b = browser();
  await b.request("POST", "/api/auth/register", { email: "validation@example.com", password: "correct-horse" });
  for (const name of ["   ", "x".repeat(41), 42, null]) {
    assert.equal((await b.request("POST", "/api/tags", { name })).status, 400);
  }
  assert.deepEqual((await b.request("GET", "/api/tags")).body.tags, []);
});
