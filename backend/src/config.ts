// Checks the server's environment settings at startup, so a missing or
// mistyped setting fails immediately with a clear message instead of
// breaking on the first request.
import { z } from "zod";

const postgresUrl = z
  .string({ error: "is required (the Neon pooled connection URL)." })
  .trim()
  .min(1, "is required (the Neon pooled connection URL).")
  .refine((v) => /^postgres(ql)?:\/\//.test(v), "must start with postgresql://");

const configSchema = z.object({
  DATABASE_URL: postgresUrl,
  PORT: z.coerce
    .number({ error: "must be a number." })
    .int("must be a whole number.")
    .min(1, "must be between 1 and 65535.")
    .max(65535, "must be between 1 and 65535.")
    .default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"], { error: "must be development, production, or test." })
    .default("development"),
  TRUST_PROXY: z.coerce
    .number({ error: "must be a number of proxies, such as 1." })
    .int("must be a whole number.")
    .min(0, "can't be negative.")
    .default(0),
});

export type Config = z.infer<typeof configSchema>;

/** Validated settings, or an error listing every problem at once. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  // Treat blank values like unset ones, so defaults apply.
  const cleaned = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value.trim() !== ""),
  );
  const parsed = configSchema.safeParse(cleaned);
  if (parsed.success) return parsed.data;
  const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")} ${issue.message}`);
  throw new Error(
    `Invalid server settings:\n${problems.join("\n")}\n` +
      "Set them in backend/.env locally, or in your host's environment settings when deployed.",
  );
}
