import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required."),
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL."),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required."),
  BOT_OWNER_IDS: z.string().default(""),
  NOPREFIX_LOG_CHANNEL_ID: z.string().default(""),
  ANTINUKE_LOG_CHANNEL_ID: z.string().default(""),
  SUPPORT_SERVER_INVITE_URL: z
    .string()
    .url("SUPPORT_SERVER_INVITE_URL must be a valid URL.")
    .default("https://discord.com"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const errorLines = parsedEnv.error.issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(`Environment validation failed:\n${errorLines}`);
}

export const env = parsedEnv.data;
export type Env = typeof env;
