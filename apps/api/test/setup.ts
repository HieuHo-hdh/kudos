import { execSync } from "node:child_process"

import { afterAll, beforeAll, beforeEach } from "vitest"

beforeAll(async () => {
  // Use docker-compose postgres-test container
  const pgUrl =
    process.env.TEST_DATABASE_URL ||
    "postgresql://test:test@localhost:5433/test?schema=public"
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"

  process.env.DATABASE_URL = pgUrl
  process.env.REDIS_URL = redisUrl
  process.env.SESSION_SECRET = "test-secret-test-secret-test-secret"
  process.env.WEB_ORIGIN = "http://localhost:5173"
  process.env.S3_ENDPOINT = "http://localhost:9000"
  process.env.S3_REGION = "us-east-1"
  process.env.S3_BUCKET = "test"
  process.env.S3_ACCESS_KEY = "test"
  process.env.S3_SECRET_KEY = "test"
  process.env.NODE_ENV = "test"

  try {
    execSync("pnpm --filter @kudos/db exec prisma migrate deploy", {
      stdio: "inherit",
      env: { ...process.env },
    })
  } catch {
    // Migration may fail if database is not available
  }
}, 30_000)

beforeEach(async () => {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL === undefined) {
    return // Skip if DATABASE_URL not set (unit tests don't need it)
  }

  try {
    const { db } = await import("../src/common/prisma-client")
    const tables = [
      "comment_media",
      "kudo_media",
      "reactions",
      "comments",
      "notifications",
      "points_transactions",
      "redemptions",
      "kudos",
      "media_assets",
      "rewards",
      "auth_identities",
      "users",
    ]
    await db.$executeRawUnsafe(`TRUNCATE TABLE "${tables.join('","')}" CASCADE`)
  } catch {
    // Database not available for cleanup
  }
})

afterAll(async () => {
  try {
    const { db } = await import("../src/common/prisma-client")
    await db.$disconnect()
  } catch {
    // Ignore errors
  }
})
