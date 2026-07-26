import { execSync } from "node:child_process"

import { GenericContainer, type StartedTestContainer } from "testcontainers"
import { afterAll, beforeAll, beforeEach } from "vitest"

let pg: StartedTestContainer
let redis: StartedTestContainer

beforeAll(async () => {
  pg = await new GenericContainer("postgres:16-alpine")
    .withEnvironment({
      POSTGRES_USER: "test",
      POSTGRES_PASSWORD: "test",
      POSTGRES_DB: "test",
    })
    .withExposedPorts(5432)
    .start()

  redis = await new GenericContainer("redis:7-alpine")
    .withExposedPorts(6379)
    .start()

  const pgUrl = `postgresql://test:test@${pg.getHost()}:${pg.getMappedPort(5432)}/test?schema=public`
  const redisUrl = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`

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

  execSync("pnpm --filter @kudos/db exec prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env },
  })
}, 120_000)

beforeEach(async () => {
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
})

afterAll(async () => {
  const { db } = await import("../src/common/prisma-client")
  await db.$disconnect()
  await pg?.stop()
  await redis?.stop()
})
