import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// The Prisma CLI (migrations, studio) uses Neon's direct connection.
// The running app uses the pooled DATABASE_URL instead (see src/db.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
