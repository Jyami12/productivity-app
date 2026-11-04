// Unit tests for the startup settings check. No database or server needed.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { loadConfig } from "../src/config.ts";

const DB = "postgresql://user:pass@host/db?sslmode=require";

describe("loadConfig", () => {
  test("applies defaults when only DATABASE_URL is set", () => {
    assert.deepEqual(loadConfig({ DATABASE_URL: DB }), {
      DATABASE_URL: DB,
      PORT: 3000,
      NODE_ENV: "development",
      TRUST_PROXY: 0,
    });
  });

  test("reads production settings", () => {
    const config = loadConfig({ DATABASE_URL: DB, PORT: "8080", NODE_ENV: "production", TRUST_PROXY: "1" });
    assert.equal(config.PORT, 8080);
    assert.equal(config.NODE_ENV, "production");
    assert.equal(config.TRUST_PROXY, 1);
  });

  test("treats blank values as unset", () => {
    assert.equal(loadConfig({ DATABASE_URL: DB, PORT: "  ", TRUST_PROXY: "" }).PORT, 3000);
  });

  test("ignores unrelated environment variables", () => {
    assert.equal(loadConfig({ DATABASE_URL: DB, HOME: "/home/x", PATH: "/bin" }).PORT, 3000);
  });

  test("a missing DATABASE_URL gives a clear message", () => {
    assert.throws(() => loadConfig({}), /DATABASE_URL is required/);
    assert.throws(() => loadConfig({ DATABASE_URL: "   " }), /DATABASE_URL is required/);
  });

  test("rejects a DATABASE_URL that isn't Postgres", () => {
    assert.throws(() => loadConfig({ DATABASE_URL: "mysql://x" }), /DATABASE_URL must start with postgresql:\/\//);
  });

  test("lists every problem at once", () => {
    assert.throws(
      () => loadConfig({ PORT: "abc", NODE_ENV: "prod", TRUST_PROXY: "true" }),
      (error: Error) => {
        for (const name of ["DATABASE_URL", "PORT", "NODE_ENV", "TRUST_PROXY"]) {
          assert.match(error.message, new RegExp(`- ${name} `));
        }
        assert.match(error.message, /backend\/\.env/);
        return true;
      },
    );
  });

  test("rejects out-of-range numbers", () => {
    assert.throws(() => loadConfig({ DATABASE_URL: DB, PORT: "70000" }), /PORT must be between 1 and 65535/);
    assert.throws(() => loadConfig({ DATABASE_URL: DB, PORT: "80.5" }), /PORT must be a whole number/);
    assert.throws(() => loadConfig({ DATABASE_URL: DB, TRUST_PROXY: "-1" }), /TRUST_PROXY can't be negative/);
  });
});
