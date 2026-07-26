import type { Request, Response, Router as RouterType } from "express"
import { Router } from "express"

import { db } from "../../common/prisma-client"
import { redis } from "../../common/redis-client"

export const healthRouter: RouterType = Router()

healthRouter.get("/", async (_req: Request, res: Response) => {
  const [dbOk, redisOk] = await Promise.all([
    db.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    redis
      .ping()
      .then((r) => r === "PONG")
      .catch(() => false),
  ])

  const overall = dbOk && redisOk
  res.status(overall ? 200 : 503).json({
    data: {
      status: overall ? "ok" : "degraded",
      db: dbOk ? "ok" : "down",
      redis: redisOk ? "ok" : "down",
    },
  })
})
