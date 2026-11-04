import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { type AppOptions, createApp } from "../src/app.ts";
import { prisma } from "../src/db.ts";

if (process.env.DATABASE_SCHEMA !== "test") {
  throw new Error("Tests must run with DATABASE_SCHEMA=test. Use `npm test`.");
}

export { prisma };

let server: Server;
let baseUrl: string;

/** High enough that ordinary tests never hit the login and sign-up limits. */
const TEST_RATE_LIMITS = { login: 10_000, register: 10_000, windowMs: 60_000 };

export async function startServer(options: AppOptions = { authRateLimits: TEST_RATE_LIMITS }) {
  server = createApp(options).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
}

export async function stopServer() {
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
}

/** Empties the test schema between tests. */
export async function resetDatabase() {
  await prisma.focusSession.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.user.deleteMany();
}

/** A fetch wrapper that keeps the login cookie, like one browser would. */
export function browser() {
  let cookie: string | undefined;
  return {
    get cookie() {
      return cookie;
    },
    set cookie(value) {
      cookie = value;
    },
    async request(method: string, path: string, body?: unknown) {
      const res = await fetch(baseUrl + path, {
        method,
        headers: {
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: typeof body === "string" ? body : JSON.stringify(body),
      });
      const setCookie = res.headers.getSetCookie().at(-1);
      if (setCookie) {
        const pair = setCookie.split(";")[0];
        cookie = pair.endsWith("=") ? undefined : pair;
      }
      const text = await res.text();
      return {
        status: res.status,
        setCookie: res.headers.getSetCookie(),
        body: text ? JSON.parse(text) : undefined,
      };
    },
  };
}
