// Applies all migrations to the isolated "test" schema before `npm test`.
import { execFileSync } from "node:child_process";

const directUrl = process.env.DIRECT_URL;
if (!directUrl) throw new Error("DIRECT_URL is not set. Copy .env.example to .env.");

const url = new URL(directUrl);
url.searchParams.set("schema", "test");

execFileSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: ["ignore", "ignore", "inherit"],
  env: { ...process.env, DIRECT_URL: url.toString() },
});
