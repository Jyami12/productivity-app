import { loadConfig } from "./config.js";

let config;
try {
  config = loadConfig(process.env);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

// Imported only after the settings check, because loading the app connects
// to the database using DATABASE_URL.
const { createApp } = await import("./app.js");
const { prisma } = await import("./db.js");

const server = createApp().listen(config.PORT, () => {
  console.log(`DinoFocus API listening on http://localhost:${config.PORT} (${config.NODE_ENV})`);
});

// Hosts send SIGTERM before stopping or redeploying the server. Finish the
// requests in progress and close database connections before exiting.
let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down...`);
  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
