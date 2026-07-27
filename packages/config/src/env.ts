import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { config as loadDotenv } from "dotenv"
import { z } from "zod"

const here = dirname(fileURLToPath(import.meta.url))
loadDotenv({ path: resolve(here, "../../..", ".env") })

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url(),
  API_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
})

export type Env = z.infer<typeof EnvSchema>
const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("Invalid environment variables:")
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error("Env validation failed — refusing to start")
}

export const env: Env = parsed.data
