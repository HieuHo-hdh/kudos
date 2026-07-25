import "dotenv/config"
import { z } from "zod"

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
})

export type Env = z.infer<typeof EnvSchema>

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("Invalid environment variables:")
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error("Env validation failed — refusing to start")
}

export const env: Env = parsed.data
